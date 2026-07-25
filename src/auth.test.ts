import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_ERPLY_BOOKS_BASE_URL, loadAuthConfig } from "./auth.js";

describe("loadAuthConfig", () => {
  const originalToken = process.env.ERPLY_BOOKS_API_TOKEN;
  const originalBaseUrl = process.env.ERPLY_BOOKS_API_BASE_URL;

  beforeEach(() => {
    delete process.env.ERPLY_BOOKS_API_TOKEN;
    delete process.env.ERPLY_BOOKS_API_BASE_URL;
  });

  afterEach(() => {
    if (originalToken === undefined) {
      delete process.env.ERPLY_BOOKS_API_TOKEN;
    } else {
      process.env.ERPLY_BOOKS_API_TOKEN = originalToken;
    }
    if (originalBaseUrl === undefined) {
      delete process.env.ERPLY_BOOKS_API_BASE_URL;
    } else {
      process.env.ERPLY_BOOKS_API_BASE_URL = originalBaseUrl;
    }
  });

  it("throws a clear error when ERPLY_BOOKS_API_TOKEN is missing", () => {
    expect(() => loadAuthConfig()).toThrow(
      "Missing required environment variable: ERPLY_BOOKS_API_TOKEN",
    );
  });

  it("returns the token with the default base URL", () => {
    process.env.ERPLY_BOOKS_API_TOKEN = "test-token";
    expect(loadAuthConfig()).toEqual({
      apiToken: "test-token",
      baseUrl: DEFAULT_ERPLY_BOOKS_BASE_URL,
    });
  });

  it("honors ERPLY_BOOKS_API_BASE_URL override", () => {
    process.env.ERPLY_BOOKS_API_TOKEN = "test-token";
    process.env.ERPLY_BOOKS_API_BASE_URL = "https://sandbox.example.com/api";
    expect(loadAuthConfig()).toEqual({
      apiToken: "test-token",
      baseUrl: "https://sandbox.example.com/api",
    });
  });
});
