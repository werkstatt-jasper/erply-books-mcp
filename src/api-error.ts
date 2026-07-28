const SNIPPET_MAX = 500;

export type ErplyBooksErrorKind = "http" | "network";

export interface ErplyBooksApiErrorOptions {
  kind: ErplyBooksErrorKind;
  message: string;
  httpStatus?: number;
  method: string;
  url: string;
  bodySnippet?: string;
  cause?: unknown;
}

export class ErplyBooksApiError extends Error {
  readonly kind: ErplyBooksErrorKind;
  readonly httpStatus?: number;
  readonly method: string;
  readonly url: string;
  readonly bodySnippet?: string;

  constructor(options: ErplyBooksApiErrorOptions) {
    super(options.message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = "ErplyBooksApiError";
    this.kind = options.kind;
    this.httpStatus = options.httpStatus;
    this.method = options.method;
    this.url = options.url;
    this.bodySnippet = options.bodySnippet;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function truncateBodySnippet(text: string, max = SNIPPET_MAX): string {
  if (text.length <= max) {
    return text;
  }
  return text.slice(0, max);
}

/** Safe suffix for client-visible error messages: method + pathname only (no host, query, or hash). */
export function clientFacingRequestLabel(method: string, url: string): string {
  try {
    const u = new URL(url);
    return `[${method} ${u.pathname}]`;
  } catch {
    return `[${method}]`;
  }
}

/** HTTP statuses that may be transient; other 4xx (except 408/429) are excluded. */
export const RETRYABLE_HTTP_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

export function isRetryableFetchFailure(error: unknown): boolean {
  if (
    typeof DOMException !== "undefined" &&
    error instanceof DOMException &&
    (error.name === "AbortError" || error.name === "TimeoutError")
  ) {
    return false;
  }
  return true;
}

export function createHttpJsonApiError(params: {
  method: string;
  url: string;
  httpStatus: number;
  errorData: Record<string, unknown>;
}): ErplyBooksApiError {
  const { method, url, httpStatus, errorData } = params;
  const errorMessage =
    (typeof errorData.message === "string" ? errorData.message : undefined) ||
    (typeof errorData.error === "string" ? errorData.error : undefined) ||
    (Array.isArray(errorData.errors) ? errorData.errors.join(", ") : undefined) ||
    JSON.stringify(errorData);
  const message = `API Error ${httpStatus}: ${errorMessage} ${clientFacingRequestLabel(method, url)}`;
  return new ErplyBooksApiError({
    kind: "http",
    message,
    httpStatus,
    method,
    url,
    bodySnippet: truncateBodySnippet(JSON.stringify(errorData)),
  });
}

/** True when the error body looks like an HTML page (Erply website / gateway). */
export function looksLikeHtmlBody(text: string): boolean {
  const head = text.slice(0, 200).toLowerCase();
  return head.includes("<!doctype") || head.includes("<html");
}

/** Pull MODULE_* codes from HTML 409 bodies when present. */
export function extractModuleCodeFromHtml(text: string): string | undefined {
  const match = text.match(/\bMODULE_[A-Z0-9_]+\b/);
  return match?.[0];
}

export function createHttpPlainApiError(params: {
  method: string;
  url: string;
  httpStatus: number;
  statusText: string;
  text: string;
}): ErplyBooksApiError {
  const snippet = truncateBodySnippet(params.text);
  const label = clientFacingRequestLabel(params.method, params.url);
  let message: string;
  if (params.httpStatus === 404 && looksLikeHtmlBody(params.text)) {
    message =
      `HTTP Error 404: Not Found - Erply returned an HTML page instead of JSON. ` +
      `This usually means the API base URL is wrong (use https://api.erplybooks.com/api, including /api). ${label}`;
  } else if (params.httpStatus === 409 && looksLikeHtmlBody(params.text)) {
    const moduleCode = extractModuleCodeFromHtml(params.text);
    message = moduleCode
      ? `HTTP Error 409: Conflict - Erply price plan lacks ${moduleCode}. ${label}`
      : `HTTP Error 409: Conflict - Erply returned HTML (often a missing MODULE_* on the org price plan). ${label}`;
  } else {
    message = `HTTP Error ${params.httpStatus}: ${params.statusText} - ${snippet} ${label}`;
  }
  return new ErplyBooksApiError({
    kind: "http",
    message,
    httpStatus: params.httpStatus,
    method: params.method,
    url: params.url,
    bodySnippet: snippet,
  });
}

export function createNetworkApiError(
  method: string,
  url: string,
  cause: unknown,
): ErplyBooksApiError {
  const detail = cause instanceof Error ? cause.message : String(cause);
  return new ErplyBooksApiError({
    kind: "network",
    message: `Network error: ${detail} ${clientFacingRequestLabel(method, url)}`,
    method,
    url,
    cause,
  });
}

export function throwNonOkResponse(
  method: string,
  url: string,
  response: Response,
  text: string,
): never {
  try {
    const errorData = JSON.parse(text) as unknown;
    if (errorData !== null && typeof errorData === "object") {
      throw createHttpJsonApiError({
        method,
        url,
        httpStatus: response.status,
        errorData: errorData as Record<string, unknown>,
      });
    }
  } catch (e) {
    if (e instanceof ErplyBooksApiError) {
      throw e;
    }
  }
  throw createHttpPlainApiError({
    method,
    url,
    httpStatus: response.status,
    statusText: response.statusText,
    text,
  });
}
