import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_ERPLY_BOOKS_BASE_URL,
  DEFAULT_ERPLY_BOOKS_REQUEST_TIMEOUT_MS,
  ERPLY_BOOKS_CLIENT_USER_AGENT,
  erplyRequestTimeoutMsFromEnv,
  generateAuthHeaders,
  loadAuthConfig,
} from "./auth.js";

describe("loadAuthConfig", () => {
  const envKeys = [
    "ERPLY_BOOKS_API_TOKEN",
    "ERPLY_BOOKS_API_BASE_URL",
    "ERPLY_BOOKS_HTTP_MAX_RETRIES",
    "ERPLY_BOOKS_HTTP_RETRY_BASE_MS",
    "ERPLY_BOOKS_REQUEST_TIMEOUT_MS",
  ] as const;
  const originals: Partial<Record<(typeof envKeys)[number], string | undefined>> = {};

  beforeEach(() => {
    for (const key of envKeys) {
      originals[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of envKeys) {
      const value = originals[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it("throws a clear error when ERPLY_BOOKS_API_TOKEN is missing", () => {
    expect(() => loadAuthConfig()).toThrow(
      "Missing required environment variable: ERPLY_BOOKS_API_TOKEN",
    );
  });

  it("returns the token with the default base URL and retry defaults", () => {
    process.env.ERPLY_BOOKS_API_TOKEN = "test-token";
    expect(loadAuthConfig()).toEqual({
      apiToken: "test-token",
      baseUrl: DEFAULT_ERPLY_BOOKS_BASE_URL,
      httpMaxRetries: 0,
      httpRetryBaseMs: 500,
      requestTimeoutMs: DEFAULT_ERPLY_BOOKS_REQUEST_TIMEOUT_MS,
    });
  });

  it("honors ERPLY_BOOKS_API_BASE_URL override", () => {
    process.env.ERPLY_BOOKS_API_TOKEN = "test-token";
    process.env.ERPLY_BOOKS_API_BASE_URL = "https://sandbox.example.com/api";
    expect(loadAuthConfig().baseUrl).toBe("https://sandbox.example.com/api");
  });

  it("parses retry and timeout env knobs", () => {
    process.env.ERPLY_BOOKS_API_TOKEN = "test-token";
    process.env.ERPLY_BOOKS_HTTP_MAX_RETRIES = "2";
    process.env.ERPLY_BOOKS_HTTP_RETRY_BASE_MS = "250";
    process.env.ERPLY_BOOKS_REQUEST_TIMEOUT_MS = "12000";
    expect(loadAuthConfig()).toMatchObject({
      httpMaxRetries: 2,
      httpRetryBaseMs: 250,
      requestTimeoutMs: 12000,
    });
  });

  it("falls back when retry env knobs are invalid", () => {
    process.env.ERPLY_BOOKS_API_TOKEN = "test-token";
    process.env.ERPLY_BOOKS_HTTP_MAX_RETRIES = "nope";
    process.env.ERPLY_BOOKS_HTTP_RETRY_BASE_MS = "-1";
    expect(loadAuthConfig()).toMatchObject({
      httpMaxRetries: 0,
      httpRetryBaseMs: 500,
    });
  });
});

describe("erplyRequestTimeoutMsFromEnv", () => {
  const original = process.env.ERPLY_BOOKS_REQUEST_TIMEOUT_MS;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.ERPLY_BOOKS_REQUEST_TIMEOUT_MS;
    } else {
      process.env.ERPLY_BOOKS_REQUEST_TIMEOUT_MS = original;
    }
  });

  it("uses the default when unset or empty", () => {
    delete process.env.ERPLY_BOOKS_REQUEST_TIMEOUT_MS;
    expect(erplyRequestTimeoutMsFromEnv()).toBe(DEFAULT_ERPLY_BOOKS_REQUEST_TIMEOUT_MS);
    process.env.ERPLY_BOOKS_REQUEST_TIMEOUT_MS = "";
    expect(erplyRequestTimeoutMsFromEnv()).toBe(DEFAULT_ERPLY_BOOKS_REQUEST_TIMEOUT_MS);
  });

  it("falls back when invalid or non-positive", () => {
    process.env.ERPLY_BOOKS_REQUEST_TIMEOUT_MS = "abc";
    expect(erplyRequestTimeoutMsFromEnv()).toBe(DEFAULT_ERPLY_BOOKS_REQUEST_TIMEOUT_MS);
    process.env.ERPLY_BOOKS_REQUEST_TIMEOUT_MS = "0";
    expect(erplyRequestTimeoutMsFromEnv()).toBe(DEFAULT_ERPLY_BOOKS_REQUEST_TIMEOUT_MS);
  });

  it("returns a positive parsed value", () => {
    process.env.ERPLY_BOOKS_REQUEST_TIMEOUT_MS = "4500";
    expect(erplyRequestTimeoutMsFromEnv()).toBe(4500);
  });
});

describe("generateAuthHeaders", () => {
  it("sets X-API-TOKEN, Content-Type, and User-Agent", () => {
    expect(
      generateAuthHeaders({
        apiToken: "secret-token",
        baseUrl: DEFAULT_ERPLY_BOOKS_BASE_URL,
      }),
    ).toEqual({
      "Content-Type": "application/json",
      "User-Agent": ERPLY_BOOKS_CLIENT_USER_AGENT,
      "X-API-TOKEN": "secret-token",
    });
  });
});
