import { type AuthConfig, DEFAULT_ERPLY_BOOKS_BASE_URL } from "./auth.js";

type TenantFileEntry = {
  apiToken: string;
  baseUrl?: string;
  httpMaxRetries?: number;
  httpRetryBaseMs?: number;
  requestTimeoutMs?: number;
};

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim() !== "";
}

/**
 * Parses Erply Books credentials from JSON (decrypted DB payload).
 * When `baseUrlFromColumn` is set (e.g. from `api_credentials.base_url`), it is used;
 * otherwise JSON `baseUrl` or {@link DEFAULT_ERPLY_BOOKS_BASE_URL}.
 *
 * Never logs the token.
 */
export function parseErplyAuthCredentialJson(
  raw: unknown,
  keyLabel: string,
  baseUrlFromColumn?: string,
): AuthConfig {
  if (raw === null || typeof raw !== "object") {
    throw new Error(`Tenant "${keyLabel}": value must be a JSON object`);
  }
  const o = raw as TenantFileEntry;
  if (!isNonEmptyString(o.apiToken)) {
    throw new Error(`Tenant "${keyLabel}": missing or empty apiToken`);
  }

  let baseUrl: string;
  if (baseUrlFromColumn !== undefined) {
    if (!isNonEmptyString(baseUrlFromColumn)) {
      throw new Error(`Tenant "${keyLabel}": baseUrl must be non-empty`);
    }
    baseUrl = baseUrlFromColumn.trim().replace(/\/$/, "");
  } else if (isNonEmptyString(o.baseUrl)) {
    baseUrl = o.baseUrl.trim().replace(/\/$/, "");
  } else {
    baseUrl = DEFAULT_ERPLY_BOOKS_BASE_URL.replace(/\/$/, "");
  }

  const config: AuthConfig = {
    apiToken: o.apiToken.trim(),
    baseUrl,
  };
  if (o.httpMaxRetries !== undefined) {
    if (!Number.isInteger(o.httpMaxRetries) || o.httpMaxRetries < 0) {
      throw new Error(`Tenant "${keyLabel}": httpMaxRetries must be a non-negative integer`);
    }
    config.httpMaxRetries = o.httpMaxRetries;
  }
  if (o.httpRetryBaseMs !== undefined) {
    if (!Number.isInteger(o.httpRetryBaseMs) || o.httpRetryBaseMs < 0) {
      throw new Error(`Tenant "${keyLabel}": httpRetryBaseMs must be a non-negative integer`);
    }
    config.httpRetryBaseMs = o.httpRetryBaseMs;
  }
  if (o.requestTimeoutMs !== undefined) {
    if (!Number.isInteger(o.requestTimeoutMs) || o.requestTimeoutMs < 1) {
      throw new Error(`Tenant "${keyLabel}": requestTimeoutMs must be a positive integer`);
    }
    config.requestTimeoutMs = o.requestTimeoutMs;
  }
  return config;
}
