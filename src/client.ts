import type { AuthConfig } from "./auth.js";

/**
 * Erply Books API client placeholder.
 *
 * The config loader is resolved lazily (per call, not at construction) so the
 * stdio server can boot and answer `tools/list` without credentials present.
 * HTTP behavior — `X-API-TOKEN` injection, JSON request/response, structured
 * errors, rate-limit backoff, pagination — lands in E2.
 */
export class ErplyBooksClient {
  private readonly loadConfig: () => AuthConfig;

  constructor(loadConfig: () => AuthConfig) {
    this.loadConfig = loadConfig;
  }

  getConfig(): AuthConfig {
    return this.loadConfig();
  }
}
