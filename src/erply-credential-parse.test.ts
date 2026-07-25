import { describe, expect, it } from "vitest";
import { DEFAULT_ERPLY_BOOKS_BASE_URL } from "./auth.js";
import { parseErplyAuthCredentialJson } from "./erply-credential-parse.js";

describe("parseErplyAuthCredentialJson", () => {
  it("parses apiToken and defaults baseUrl", () => {
    expect(parseErplyAuthCredentialJson({ apiToken: " tok " }, "k")).toEqual({
      apiToken: "tok",
      baseUrl: DEFAULT_ERPLY_BOOKS_BASE_URL.replace(/\/$/, ""),
    });
  });

  it("prefers baseUrlFromColumn over JSON baseUrl", () => {
    expect(
      parseErplyAuthCredentialJson(
        { apiToken: "t", baseUrl: "https://other.example/api/" },
        "k",
        "https://api.erplybooks.com/api/",
      ),
    ).toEqual({
      apiToken: "t",
      baseUrl: "https://api.erplybooks.com/api",
    });
  });

  it("uses JSON baseUrl when column omitted", () => {
    expect(
      parseErplyAuthCredentialJson({ apiToken: "t", baseUrl: "https://custom.example/api/" }, "k"),
    ).toEqual({
      apiToken: "t",
      baseUrl: "https://custom.example/api",
    });
  });

  it("rejects non-object and empty token", () => {
    expect(() => parseErplyAuthCredentialJson(null, "k")).toThrow(/must be a JSON object/);
    expect(() => parseErplyAuthCredentialJson({ apiToken: "" }, "k")).toThrow(/apiToken/);
    expect(() => parseErplyAuthCredentialJson({ apiToken: "  " }, "k")).toThrow(/apiToken/);
  });

  it("rejects empty baseUrlFromColumn", () => {
    expect(() => parseErplyAuthCredentialJson({ apiToken: "t" }, "k", "  ")).toThrow(
      /baseUrl must be non-empty/,
    );
  });

  it("accepts optional retry/timeout fields", () => {
    expect(
      parseErplyAuthCredentialJson(
        {
          apiToken: "t",
          httpMaxRetries: 2,
          httpRetryBaseMs: 500,
          requestTimeoutMs: 10000,
        },
        "k",
        "https://api.erplybooks.com/api",
      ),
    ).toEqual({
      apiToken: "t",
      baseUrl: "https://api.erplybooks.com/api",
      httpMaxRetries: 2,
      httpRetryBaseMs: 500,
      requestTimeoutMs: 10000,
    });
  });

  it("rejects invalid optional numbers", () => {
    expect(() => parseErplyAuthCredentialJson({ apiToken: "t", httpMaxRetries: -1 }, "k")).toThrow(
      /httpMaxRetries/,
    );
    expect(() => parseErplyAuthCredentialJson({ apiToken: "t", httpRetryBaseMs: -1 }, "k")).toThrow(
      /httpRetryBaseMs/,
    );
    expect(() => parseErplyAuthCredentialJson({ apiToken: "t", requestTimeoutMs: 0 }, "k")).toThrow(
      /requestTimeoutMs/,
    );
  });
});
