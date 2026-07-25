import { describe, expect, it, vi } from "vitest";
import type { AuthConfig } from "./auth.js";
import { ErplyBooksClient } from "./client.js";

describe("ErplyBooksClient", () => {
  it("resolves config lazily via the provided loader", () => {
    const config: AuthConfig = {
      apiToken: "test-token",
      baseUrl: "https://api.erplybooks.com/api",
    };
    const loadConfig = vi.fn(() => config);

    const client = new ErplyBooksClient(loadConfig);
    expect(loadConfig).not.toHaveBeenCalled();

    expect(client.getConfig()).toEqual(config);
    expect(loadConfig).toHaveBeenCalledTimes(1);
  });
});
