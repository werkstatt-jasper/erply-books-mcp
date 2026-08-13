import type { Logger } from "pino";

import {
  createNetworkApiError,
  ErplyBooksApiError,
  isRetryableFetchFailure,
  RETRYABLE_HTTP_STATUSES,
  throwNonOkResponse,
} from "./api-error.js";
import { type AuthConfig, erplyRequestTimeoutMsFromEnv, generateAuthHeaders } from "./auth.js";
import { logger as defaultLogger } from "./logger.js";

export { ErplyBooksApiError, RETRYABLE_HTTP_STATUSES } from "./api-error.js";

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  params?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  /** When set, sent as multipart body; Content-Type is left to fetch (boundary). */
  formData?: FormData;
  /**
   * Default `json`. Use `text` for HTML/plain responses such as attachment preview.
   * Use `arrayBuffer` for CSV/XLSX/XML file downloads from the report generator.
   */
  parseAs?: "json" | "text" | "arrayBuffer";
}

export interface ErplyBooksClientOptions {
  logger?: Logger;
  /** Max pages `getAllPages` will fetch; default 100; minimum 1. */
  maxPages?: number;
  /** Default page size for `getAllPages`; default 100; minimum 1. */
  pageSize?: number;
}

/** Static env config or a per-request resolver (HTTP multi-tenant). */
export type AuthConfigSource = AuthConfig | (() => AuthConfig);

const MAX_BACKOFF_MS = 8000;

function backoffDelayMs(attemptIndex: number, baseMs: number): number {
  const exponential = Math.min(baseMs * 2 ** attemptIndex, MAX_BACKOFF_MS);
  const jitter = Math.floor(Math.random() * Math.min(baseMs, 200));
  return Math.min(exponential + jitter, MAX_BACKOFF_MS);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** Parse `Retry-After` (seconds or HTTP-date). Returns delay ms, or null if unusable. */
export function parseRetryAfterMs(header: string | null, nowMs = Date.now()): number | null {
  if (header === null || header.trim() === "") {
    return null;
  }
  const trimmed = header.trim();
  const asSeconds = Number.parseInt(trimmed, 10);
  if (Number.isFinite(asSeconds) && String(asSeconds) === trimmed) {
    if (asSeconds < 0) {
      return null;
    }
    return Math.min(asSeconds * 1000, MAX_BACKOFF_MS);
  }
  const asDate = Date.parse(trimmed);
  if (!Number.isFinite(asDate)) {
    return null;
  }
  const delta = asDate - nowMs;
  if (delta <= 0) {
    return 0;
  }
  return Math.min(delta, MAX_BACKOFF_MS);
}

export class ErplyBooksClient {
  private readonly resolveConfig: () => AuthConfig;
  private readonly logger: Logger;
  private readonly maxPages: number;
  private readonly pageSize: number;

  constructor(source: AuthConfigSource, options?: ErplyBooksClientOptions) {
    this.resolveConfig = typeof source === "function" ? source : () => source;
    this.logger = options?.logger ?? defaultLogger;
    this.maxPages = Math.max(1, options?.maxPages ?? 100);
    this.pageSize = Math.max(1, options?.pageSize ?? 100);
  }

  getConfig(): AuthConfig {
    return this.resolveConfig();
  }

  private retrySettingsFrom(config: AuthConfig): { maxRetries: number; retryBaseMs: number } {
    return {
      maxRetries: Math.max(0, config.httpMaxRetries ?? 0),
      retryBaseMs: Math.max(0, config.httpRetryBaseMs ?? 500),
    };
  }

  private effectiveRequestTimeoutMs(config: AuthConfig): number {
    return config.requestTimeoutMs ?? erplyRequestTimeoutMsFromEnv();
  }

  private logRequest(method: string, path: string, started: number, error?: unknown): void {
    const durationMs = Math.round(performance.now() - started);
    if (error === undefined) {
      this.logger.info(
        { component: "http", method, path, durationMs, outcome: "ok" },
        "erply request",
      );
      return;
    }
    if (error instanceof ErplyBooksApiError) {
      const outcome = error.kind === "network" ? "network_error" : "http_error";
      this.logger.info(
        {
          component: "http",
          method,
          path,
          requestUrl: error.url,
          durationMs,
          outcome,
          httpStatus: error.httpStatus,
        },
        "erply request",
      );
      return;
    }
    this.logger.info(
      { component: "http", method, path, durationMs, outcome: "unknown_error" },
      "erply request",
    );
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const { method = "GET", params, body, formData, parseAs = "json" } = options;
    if (formData !== undefined && body !== undefined) {
      throw new Error("request: pass either body or formData, not both");
    }
    const started = performance.now();

    try {
      const config = this.resolveConfig();
      const { maxRetries, retryBaseMs } = this.retrySettingsFrom(config);
      const url = new URL(`${config.baseUrl}${path}`);
      if (params) {
        for (const [key, value] of Object.entries(params)) {
          if (value !== undefined) {
            url.searchParams.set(key, String(value));
          }
        }
      }

      const urlString = url.toString();
      const headers: Record<string, string> = generateAuthHeaders(config);
      if (formData !== undefined) {
        // Let fetch set multipart boundary; JSON Content-Type would break the upload.
        delete headers["Content-Type"];
      }
      if (parseAs === "text") {
        // Preview and similar endpoints return HTML and 406 if Accept is application/json.
        headers.Accept = "text/html, text/plain;q=0.9, */*;q=0.8";
      } else if (parseAs === "arrayBuffer") {
        headers.Accept = "*/*";
      }
      const maxAttempts = 1 + maxRetries;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const isLastAttempt = attempt === maxAttempts - 1;
        const timeoutMs = this.effectiveRequestTimeoutMs(config);

        let response: Response;
        try {
          let fetchBody: BodyInit | undefined;
          if (formData !== undefined) {
            fetchBody = formData;
          } else if (body !== undefined) {
            fetchBody = JSON.stringify(body);
          }
          response = await fetch(urlString, {
            method,
            headers,
            body: fetchBody,
            signal: AbortSignal.timeout(timeoutMs),
          });
        } catch (e) {
          if (!isLastAttempt && isRetryableFetchFailure(e)) {
            await sleep(backoffDelayMs(attempt, retryBaseMs));
            continue;
          }
          throw createNetworkApiError(method, urlString, e);
        }

        if (!response.ok) {
          if (!isLastAttempt && RETRYABLE_HTTP_STATUSES.has(response.status)) {
            const retryAfterMs =
              response.status === 429
                ? parseRetryAfterMs(response.headers.get("Retry-After"))
                : null;
            await response.arrayBuffer();
            const delay =
              retryAfterMs !== null ? retryAfterMs : backoffDelayMs(attempt, retryBaseMs);
            await sleep(delay);
            continue;
          }
          const text = await response.text();
          throwNonOkResponse(method, urlString, response, text);
        }

        if (response.status === 204) {
          this.logRequest(method, path, started, undefined);
          if (parseAs === "arrayBuffer") {
            return new ArrayBuffer(0) as T;
          }
          return undefined as T;
        }

        if (parseAs === "text") {
          const text = await response.text();
          this.logRequest(method, path, started, undefined);
          return text as T;
        }

        if (parseAs === "arrayBuffer") {
          const bytes = await response.arrayBuffer();
          this.logRequest(method, path, started, undefined);
          return bytes as T;
        }

        const data = (await response.json()) as T;
        this.logRequest(method, path, started, undefined);
        return data;
      }

      /* v8 ignore next - for-loop always returns or throws */
      throw createNetworkApiError(method, url.toString(), new Error("request loop exhausted"));
    } catch (error) {
      this.logRequest(method, path, started, error);
      throw error;
    }
  }

  async get<T = unknown>(
    path: string,
    params?: Record<string, string | number | boolean | undefined>,
  ): Promise<T> {
    return this.request<T>(path, { method: "GET", params });
  }

  /** GET that returns the raw response body as text (e.g. HTML preview). */
  async getText(
    path: string,
    params?: Record<string, string | number | boolean | undefined>,
  ): Promise<string> {
    return this.request<string>(path, { method: "GET", params, parseAs: "text" });
  }

  /** GET that returns the raw response body as bytes (CSV/XLSX/XML downloads). */
  async getArrayBuffer(
    path: string,
    params?: Record<string, string | number | boolean | undefined>,
  ): Promise<ArrayBuffer> {
    return this.request<ArrayBuffer>(path, { method: "GET", params, parseAs: "arrayBuffer" });
  }

  async post<T = unknown>(
    path: string,
    body?: unknown,
    params?: Record<string, string | number | boolean | undefined>,
  ): Promise<T> {
    return this.request<T>(path, { method: "POST", body, params });
  }

  /**
   * POST JSON and return the raw body as bytes (CSV/XLSX report-generator exports).
   */
  async postBytes(
    path: string,
    body?: unknown,
    params?: Record<string, string | number | boolean | undefined>,
  ): Promise<ArrayBuffer> {
    return this.request<ArrayBuffer>(path, {
      method: "POST",
      body,
      params,
      parseAs: "arrayBuffer",
    });
  }

  /**
   * POST multipart/form-data. Does not set Content-Type (fetch adds the boundary).
   */
  async postMultipart<T = unknown>(
    path: string,
    formData: FormData,
    params?: Record<string, string | number | boolean | undefined>,
  ): Promise<T> {
    return this.request<T>(path, { method: "POST", formData, params });
  }

  async put<T = unknown>(
    path: string,
    body?: unknown,
    params?: Record<string, string | number | boolean | undefined>,
  ): Promise<T> {
    return this.request<T>(path, { method: "PUT", body, params });
  }

  async delete<T = unknown>(
    path: string,
    params?: Record<string, string | number | boolean | undefined>,
  ): Promise<T> {
    return this.request<T>(path, { method: "DELETE", params });
  }

  /**
   * Fetches all pages for list endpoints that accept `start` + `limit`.
   * Erply Books list responses use `{ items, totalCount, organisation }`
   * (confirmed live; not documented in Swagger).
   */
  async getAllPages<T = unknown>(
    path: string,
    params?: Record<string, string | number | boolean | undefined>,
  ): Promise<T[]> {
    const allItems: T[] = [];
    let start = 0;
    const limit =
      typeof params?.limit === "number" && params.limit > 0 ? params.limit : this.pageSize;

    for (let pageIndex = 0; pageIndex < this.maxPages; pageIndex++) {
      const page = await this.get<unknown>(path, { ...params, start, limit });
      if (page === null || typeof page !== "object" || Array.isArray(page)) {
        throw new Error(
          `getAllPages expected a list envelope object from ${path}, got ${page === null ? "null" : Array.isArray(page) ? "array" : typeof page}`,
        );
      }
      const envelope = page as { items?: unknown; totalCount?: unknown };
      // Empty pages often return `items: null` rather than `[]`.
      if (envelope.items != null && !Array.isArray(envelope.items)) {
        throw new Error(`getAllPages expected { items: [...] | null } from ${path}`);
      }
      const items = (Array.isArray(envelope.items) ? envelope.items : []) as T[];
      allItems.push(...items);
      const totalCount =
        typeof envelope.totalCount === "number" && Number.isFinite(envelope.totalCount)
          ? envelope.totalCount
          : undefined;
      const done =
        items.length < limit || (totalCount !== undefined && allItems.length >= totalCount);
      if (done) {
        return allItems;
      }
      start += limit;
      if (pageIndex === this.maxPages - 1) {
        this.logger.warn(
          {
            component: "http",
            path,
            maxPages: this.maxPages,
            start,
            limit,
            collected: allItems.length,
            totalCount,
          },
          "getAllPages stopped at maxPages cap",
        );
        return allItems;
      }
    }

    /* v8 ignore next - maxPages is always >= 1 */
    return allItems;
  }
}
