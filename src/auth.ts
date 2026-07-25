export const DEFAULT_ERPLY_BOOKS_BASE_URL = "https://api.erplybooks.com/api";

export interface AuthConfig {
  /** Sent as the `X-API-TOKEN` header on every Erply Books request. */
  apiToken: string;
  baseUrl: string;
}

/**
 * Reads Erply Books credentials from the environment.
 *
 * Request signing does not exist for this API — the token itself is the
 * credential. Header injection, error handling and pagination land in the
 * HTTP client (E2).
 */
export function loadAuthConfig(): AuthConfig {
  const apiToken = process.env.ERPLY_BOOKS_API_TOKEN;
  const baseUrl = process.env.ERPLY_BOOKS_API_BASE_URL || DEFAULT_ERPLY_BOOKS_BASE_URL;

  if (!apiToken) {
    throw new Error("Missing required environment variable: ERPLY_BOOKS_API_TOKEN");
  }

  return { apiToken, baseUrl };
}
