export const DEFAULT_ERPLY_BOOKS_BASE_URL = "https://api.erplybooks.com/api";
export const DEFAULT_ERPLY_BOOKS_REQUEST_TIMEOUT_MS = 30_000;

/**
 * Descriptive User-Agent for outbound Erply Books API requests.
 */
export const ERPLY_BOOKS_CLIENT_USER_AGENT =
  "erply-books-mcp/0.1 (+https://github.com/werkstatt-jasper/erply-books-mcp)";

export interface AuthConfig {
  /** Sent as the `X-API-TOKEN` header on every Erply Books request. */
  apiToken: string;
  baseUrl: string;
  /** Max extra attempts after the first request (default from env or 0). */
  httpMaxRetries?: number;
  /** Base delay in ms for exponential backoff (default from env or 500). */
  httpRetryBaseMs?: number;
  /** Outbound HTTP timeout in ms (from env when unset on this object). */
  requestTimeoutMs?: number;
}

export interface AuthHeaders {
  [key: string]: string;
  Accept: string;
  "Content-Type": string;
  "User-Agent": string;
  "X-API-TOKEN": string;
}

function parseNonNegativeInt(raw: string | undefined, defaultValue: number): number {
  if (raw === undefined || raw === "") {
    return defaultValue;
  }
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : defaultValue;
}

/** Reads `ERPLY_BOOKS_REQUEST_TIMEOUT_MS`; invalid or non-positive values use the default. */
export function erplyRequestTimeoutMsFromEnv(): number {
  const raw = process.env.ERPLY_BOOKS_REQUEST_TIMEOUT_MS;
  if (raw === undefined || raw === "") {
    return DEFAULT_ERPLY_BOOKS_REQUEST_TIMEOUT_MS;
  }
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) {
    return DEFAULT_ERPLY_BOOKS_REQUEST_TIMEOUT_MS;
  }
  return n;
}

/**
 * Reads Erply Books credentials from the environment.
 *
 * Request signing does not exist for this API — the token itself is the
 * credential. Prefer the `X-API-TOKEN` header (never `?token=`).
 */
export function loadAuthConfig(): AuthConfig {
  const apiToken = process.env.ERPLY_BOOKS_API_TOKEN;
  const baseUrl = process.env.ERPLY_BOOKS_API_BASE_URL || DEFAULT_ERPLY_BOOKS_BASE_URL;

  if (!apiToken) {
    throw new Error("Missing required environment variable: ERPLY_BOOKS_API_TOKEN");
  }

  return {
    apiToken,
    baseUrl,
    httpMaxRetries: parseNonNegativeInt(process.env.ERPLY_BOOKS_HTTP_MAX_RETRIES, 0),
    httpRetryBaseMs: parseNonNegativeInt(process.env.ERPLY_BOOKS_HTTP_RETRY_BASE_MS, 500),
    requestTimeoutMs: erplyRequestTimeoutMsFromEnv(),
  };
}

/** Builds request headers. Never puts the token in the URL/query string. */
export function generateAuthHeaders(config: AuthConfig): AuthHeaders {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    "User-Agent": ERPLY_BOOKS_CLIENT_USER_AGENT,
    "X-API-TOKEN": config.apiToken,
  };
}
