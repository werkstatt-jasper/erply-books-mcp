import { describe, expect, it } from "vitest";
import {
  clientFacingRequestLabel,
  createHttpJsonApiError,
  createNetworkApiError,
  ErplyBooksApiError,
  isRetryableFetchFailure,
  throwNonOkResponse,
  truncateBodySnippet,
} from "./api-error.js";

describe("clientFacingRequestLabel", () => {
  it("returns method and pathname without origin or query", () => {
    expect(clientFacingRequestLabel("GET", "https://host.example/api/accounts?start=0#h")).toBe(
      "[GET /api/accounts]",
    );
  });

  it("returns method only when url is not parseable", () => {
    expect(clientFacingRequestLabel("POST", "not a url")).toBe("[POST]");
  });
});

describe("truncateBodySnippet", () => {
  it("returns text unchanged when within max length", () => {
    expect(truncateBodySnippet("short", 10)).toBe("short");
  });

  it("truncates when longer than max", () => {
    const long = "x".repeat(600);
    expect(truncateBodySnippet(long, 500)).toHaveLength(500);
  });
});

describe("isRetryableFetchFailure", () => {
  it("returns false for AbortError", () => {
    const err = new DOMException("Aborted", "AbortError");
    expect(isRetryableFetchFailure(err)).toBe(false);
  });

  it("returns false for TimeoutError", () => {
    const err = new DOMException("Timed out", "TimeoutError");
    expect(isRetryableFetchFailure(err)).toBe(false);
  });

  it("returns true for other errors", () => {
    expect(isRetryableFetchFailure(new TypeError("fetch failed"))).toBe(true);
  });
});

describe("createNetworkApiError", () => {
  it("stringifies non-Error cause", () => {
    const e = createNetworkApiError("GET", "https://example.com/x", "plain");
    expect(e.message).toContain("plain");
    expect(e.message).toContain("[GET /x]");
    expect(e.message).not.toContain("example.com");
  });
});

describe("ErplyBooksApiError", () => {
  it("passes cause to Error when provided", () => {
    const inner = new Error("inner");
    const e = new ErplyBooksApiError({
      kind: "network",
      message: "outer",
      method: "GET",
      url: "https://x",
      cause: inner,
    });
    expect(e.cause).toBe(inner);
  });

  it("omits cause option when undefined", () => {
    const e = new ErplyBooksApiError({
      kind: "http",
      message: "m",
      method: "GET",
      url: "https://x",
    });
    expect(e.cause).toBeUndefined();
  });
});

describe("createHttpJsonApiError", () => {
  it("prefers message over other fields", () => {
    const e = createHttpJsonApiError({
      method: "GET",
      url: "https://x",
      httpStatus: 400,
      errorData: { message: "from-message", error: "from-error" },
    });
    expect(e.message).toContain("from-message");
    expect(e.message).not.toContain("from-error");
  });

  it("uses error string when message is absent", () => {
    const e = createHttpJsonApiError({
      method: "GET",
      url: "https://x",
      httpStatus: 400,
      errorData: { error: "e1" },
    });
    expect(e.message).toContain("e1");
  });

  it("joins errors array when present", () => {
    const e = createHttpJsonApiError({
      method: "GET",
      url: "https://x",
      httpStatus: 422,
      errorData: { errors: ["a", "b"] },
    });
    expect(e.message).toContain("a, b");
  });

  it("falls back to JSON.stringify when no known message fields", () => {
    const e = createHttpJsonApiError({
      method: "GET",
      url: "https://x",
      httpStatus: 500,
      errorData: { unknown: true },
    });
    expect(e.message).toContain("unknown");
  });

  it("uses pathname in message, not full URL", () => {
    const e = createHttpJsonApiError({
      method: "GET",
      url: "https://secret-host/api/items?start=2",
      httpStatus: 500,
      errorData: { message: "oops" },
    });
    expect(e.message).toContain("[GET /api/items]");
    expect(e.message).not.toContain("secret-host");
    expect(e.message).not.toContain("start=2");
    expect(e.url).toBe("https://secret-host/api/items?start=2");
  });
});

describe("throwNonOkResponse", () => {
  it("throws ErplyBooksApiError for JSON object bodies", () => {
    const res = new Response("", { status: 401, statusText: "Unauthorized" });
    expect(() =>
      throwNonOkResponse("GET", "https://api.erplybooks.com/api/x", res, '{"message":"bad token"}'),
    ).toThrow(ErplyBooksApiError);
  });

  it("uses plain HTTP error when body is not JSON", () => {
    const res = new Response("not-json", { status: 400, statusText: "Bad Request" });
    expect(() =>
      throwNonOkResponse("GET", "https://api.erplybooks.com/api/x", res, "not-json"),
    ).toThrow(ErplyBooksApiError);
  });

  it("uses plain HTTP error when JSON is a primitive", () => {
    const res = new Response("", { status: 400, statusText: "Bad Request" });
    expect(() => throwNonOkResponse("GET", "https://api.erplybooks.com/api/x", res, "42")).toThrow(
      ErplyBooksApiError,
    );
  });
});
