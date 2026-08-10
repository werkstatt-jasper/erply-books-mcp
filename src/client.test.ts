import type { Logger } from "pino";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const rootLoggerMocks = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  fatal: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}));

vi.mock("./logger.js", () => ({
  logger: rootLoggerMocks,
}));

import { ErplyBooksApiError, ErplyBooksClient, parseRetryAfterMs } from "./client.js";

const baseConfig = {
  apiToken: "test-token",
  baseUrl: "https://api.erplybooks.com/api",
  httpMaxRetries: 0,
  httpRetryBaseMs: 10,
  requestTimeoutMs: 30_000,
};

function jsonResponse(data: unknown, status = 200, statusText = "OK", headers?: HeadersInit) {
  return new Response(JSON.stringify(data), {
    status,
    statusText,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

describe("parseRetryAfterMs", () => {
  it("returns null for missing or empty header", () => {
    expect(parseRetryAfterMs(null)).toBeNull();
    expect(parseRetryAfterMs("")).toBeNull();
    expect(parseRetryAfterMs("   ")).toBeNull();
  });

  it("parses integer seconds and caps at 8s", () => {
    expect(parseRetryAfterMs("2")).toBe(2000);
    expect(parseRetryAfterMs("30")).toBe(8000);
  });

  it("returns null for negative seconds", () => {
    expect(parseRetryAfterMs("-1")).toBeNull();
  });

  it("parses HTTP-date and caps at 8s", () => {
    const now = Date.parse("Thu, 01 Jan 2026 00:00:00 GMT");
    expect(parseRetryAfterMs("Thu, 01 Jan 2026 00:00:03 GMT", now)).toBe(3000);
    expect(parseRetryAfterMs("Thu, 01 Jan 2026 00:01:00 GMT", now)).toBe(8000);
    expect(parseRetryAfterMs("Thu, 01 Jan 2025 00:00:00 GMT", now)).toBe(0);
  });

  it("returns null for unparseable values", () => {
    expect(parseRetryAfterMs("soon")).toBeNull();
  });
});

describe("ErplyBooksClient", () => {
  let client: ErplyBooksClient;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    client = new ErplyBooksClient(baseConfig);
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    rootLoggerMocks.info.mockClear();
    rootLoggerMocks.warn.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  describe("AuthConfigSource", () => {
    it("resolves config lazily via the provided loader", () => {
      const loadConfig = vi.fn(() => baseConfig);
      const c = new ErplyBooksClient(loadConfig);
      expect(loadConfig).not.toHaveBeenCalled();
      expect(c.getConfig()).toEqual(baseConfig);
      expect(loadConfig).toHaveBeenCalledTimes(1);
    });

    it("resolves config on each request for dynamic credentials", async () => {
      let call = 0;
      const configA = { ...baseConfig, apiToken: "tenant-a" };
      const configB = { ...baseConfig, apiToken: "tenant-b" };
      const dynamic = new ErplyBooksClient(() => (call++ === 0 ? configA : configB));
      fetchMock
        .mockResolvedValueOnce(jsonResponse({ ok: true }))
        .mockResolvedValueOnce(jsonResponse({ ok: true }));

      await dynamic.get("/organisation");
      await dynamic.get("/organisation");

      expect(fetchMock.mock.calls[0][1].headers["X-API-TOKEN"]).toBe("tenant-a");
      expect(fetchMock.mock.calls[1][1].headers["X-API-TOKEN"]).toBe("tenant-b");
    });
  });

  describe("request / HTTP verbs", () => {
    it("builds URL with query params and omits undefined", async () => {
      fetchMock.mockResolvedValue(jsonResponse([]));

      await client.get("/accounts", { start: 0, limit: 10, filter: undefined });

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      const url = new URL(calledUrl);
      expect(url.origin + url.pathname).toBe("https://api.erplybooks.com/api/accounts");
      expect(url.searchParams.get("start")).toBe("0");
      expect(url.searchParams.get("limit")).toBe("10");
      expect(url.searchParams.has("filter")).toBe(false);
    });

    it("sends X-API-TOKEN and Content-Type headers", async () => {
      fetchMock.mockResolvedValue(jsonResponse({ id: 1 }));

      await client.get("/organisation");

      expect(fetchMock.mock.calls[0][1].headers).toMatchObject({
        "Content-Type": "application/json",
        "X-API-TOKEN": "test-token",
      });
      expect(fetchMock.mock.calls[0][1].headers["User-Agent"]).toContain("erply-books-mcp");
    });

    it("passes AbortSignal.timeout with config timeout", async () => {
      const timeoutSpy = vi.spyOn(AbortSignal, "timeout");
      fetchMock.mockResolvedValue(jsonResponse({}));
      const c = new ErplyBooksClient({ ...baseConfig, requestTimeoutMs: 12_345 });

      await c.get("/organisation");

      expect(timeoutSpy).toHaveBeenCalledWith(12_345);
      timeoutSpy.mockRestore();
    });

    it("falls back to env timeout when config omits requestTimeoutMs", async () => {
      vi.stubEnv("ERPLY_BOOKS_REQUEST_TIMEOUT_MS", "7777");
      const timeoutSpy = vi.spyOn(AbortSignal, "timeout");
      fetchMock.mockResolvedValue(jsonResponse({}));
      const { requestTimeoutMs: _omit, ...cfg } = baseConfig;
      void _omit;
      const c = new ErplyBooksClient(cfg);

      await c.get("/organisation");

      expect(timeoutSpy).toHaveBeenCalledWith(7777);
      timeoutSpy.mockRestore();
    });

    it("POSTs JSON body", async () => {
      fetchMock.mockResolvedValue(jsonResponse({ id: 9 }));
      await client.post("/customers", { name: "Acme" });
      expect(fetchMock.mock.calls[0][1].method).toBe("POST");
      expect(fetchMock.mock.calls[0][1].body).toBe(JSON.stringify({ name: "Acme" }));
    });

    it("POSTs with optional query params", async () => {
      fetchMock.mockResolvedValue(jsonResponse({ id: 1 }));
      await client.post("/invoices", { id: 0 }, { registrationCode: "REG" });
      expect(String(fetchMock.mock.calls[0][0])).toContain("registrationCode=REG");
      expect(fetchMock.mock.calls[0][1].method).toBe("POST");
    });

    it("postMultipart omits Content-Type and sends FormData with query params", async () => {
      fetchMock.mockResolvedValue(jsonResponse({ imported: true }));
      const form = new FormData();
      form.append("file", new Blob(["a,b\n1,2\n"], { type: "text/csv" }), "stmt.csv");

      await client.postMultipart("/payments/bank_import", form, {
        accountId: 42,
        encoding: "UTF-8",
        getMissing: undefined,
      });

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      const url = new URL(calledUrl);
      expect(url.pathname).toBe("/api/payments/bank_import");
      expect(url.searchParams.get("accountId")).toBe("42");
      expect(url.searchParams.get("encoding")).toBe("UTF-8");
      expect(url.searchParams.has("getMissing")).toBe(false);

      const init = fetchMock.mock.calls[0][1] as RequestInit;
      expect(init.method).toBe("POST");
      expect(init.body).toBeInstanceOf(FormData);
      expect(init.headers).toMatchObject({
        "X-API-TOKEN": "test-token",
      });
      expect((init.headers as Record<string, string>)["Content-Type"]).toBeUndefined();
      expect((init.headers as Record<string, string>)["User-Agent"]).toContain("erply-books-mcp");
    });

    it("rejects request options with both body and formData", async () => {
      const form = new FormData();
      await expect(
        client.request("/payments/bank_import", {
          method: "POST",
          body: { x: 1 },
          formData: form,
        }),
      ).rejects.toThrow(/either body or formData/);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("PUTs JSON body", async () => {
      fetchMock.mockResolvedValue(jsonResponse({ id: 9 }));
      await client.put("/customers/9", { name: "Acme2" });
      expect(fetchMock.mock.calls[0][1].method).toBe("PUT");
    });

    it("PUTs with optional query params", async () => {
      fetchMock.mockResolvedValue(jsonResponse({ id: 1 }));
      await client.put("/invoices/1", { id: 1 }, { registrationCode: "REG" });
      expect(String(fetchMock.mock.calls[0][0])).toContain("registrationCode=REG");
    });

    it("DELETEs without body", async () => {
      fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
      await expect(client.delete("/customers/9")).resolves.toBeUndefined();
      expect(fetchMock.mock.calls[0][1].method).toBe("DELETE");
      expect(fetchMock.mock.calls[0][1].body).toBeUndefined();
    });

    it("DELETEs with optional query params", async () => {
      fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
      await client.delete("/invoices/1", { registrationCode: "REG" });
      expect(String(fetchMock.mock.calls[0][0])).toContain("registrationCode=REG");
      expect(fetchMock.mock.calls[0][1].method).toBe("DELETE");
    });

    it("logs ok outcome", async () => {
      fetchMock.mockResolvedValue(jsonResponse({ ok: true }));
      await client.get("/organisation");
      expect(rootLoggerMocks.info).toHaveBeenCalledWith(
        expect.objectContaining({ component: "http", outcome: "ok", path: "/organisation" }),
        "erply request",
      );
    });
  });

  describe("errors", () => {
    it("throws ErplyBooksApiError for JSON error bodies", async () => {
      fetchMock.mockResolvedValue(jsonResponse({ message: "bad token" }, 401, "Unauthorized"));
      await expect(client.get("/organisation")).rejects.toMatchObject({
        name: "ErplyBooksApiError",
        kind: "http",
        httpStatus: 401,
      });
      expect(rootLoggerMocks.info).toHaveBeenCalledWith(
        expect.objectContaining({ outcome: "http_error", httpStatus: 401 }),
        "erply request",
      );
    });

    it("throws for plain-text error bodies", async () => {
      fetchMock.mockResolvedValue(new Response("nope", { status: 500, statusText: "Error" }));
      await expect(client.get("/organisation")).rejects.toBeInstanceOf(ErplyBooksApiError);
    });

    it("surfaces 429 as a clear error when retries are disabled", async () => {
      fetchMock.mockResolvedValue(jsonResponse({ message: "slow down" }, 429, "Too Many Requests"));
      await expect(client.get("/accounts")).rejects.toMatchObject({
        httpStatus: 429,
        kind: "http",
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("throws network error on fetch failure", async () => {
      fetchMock.mockRejectedValue(new TypeError("fetch failed"));
      await expect(client.get("/organisation")).rejects.toMatchObject({
        kind: "network",
      });
      expect(rootLoggerMocks.info).toHaveBeenCalledWith(
        expect.objectContaining({ outcome: "network_error" }),
        "erply request",
      );
    });

    it("logs unknown_error for non-ErplyBooksApiError throws", async () => {
      const custom = { info: vi.fn(), warn: vi.fn() } as unknown as Logger;
      const c = new ErplyBooksClient(
        () => {
          throw new Error("config boom");
        },
        { logger: custom },
      );
      await expect(c.get("/organisation")).rejects.toThrow("config boom");
      expect(custom.info).toHaveBeenCalledWith(
        expect.objectContaining({ outcome: "unknown_error" }),
        "erply request",
      );
    });
  });

  describe("retries", () => {
    it("retries retryable HTTP statuses when enabled", async () => {
      vi.useFakeTimers();
      const c = new ErplyBooksClient({ ...baseConfig, httpMaxRetries: 2, httpRetryBaseMs: 10 });
      fetchMock
        .mockResolvedValueOnce(jsonResponse({ message: "busy" }, 503))
        .mockResolvedValueOnce(jsonResponse({ ok: true }));

      const promise = c.get("/organisation");
      await vi.runAllTimersAsync();
      await expect(promise).resolves.toEqual({ ok: true });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("retries network failures when enabled", async () => {
      vi.useFakeTimers();
      const c = new ErplyBooksClient({ ...baseConfig, httpMaxRetries: 1, httpRetryBaseMs: 10 });
      fetchMock
        .mockRejectedValueOnce(new TypeError("fetch failed"))
        .mockResolvedValueOnce(jsonResponse({ ok: true }));

      const promise = c.get("/organisation");
      await vi.runAllTimersAsync();
      await expect(promise).resolves.toEqual({ ok: true });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("does not retry AbortError / TimeoutError", async () => {
      const c = new ErplyBooksClient({ ...baseConfig, httpMaxRetries: 2, httpRetryBaseMs: 10 });
      fetchMock.mockRejectedValue(new DOMException("Timed out", "TimeoutError"));
      await expect(c.get("/organisation")).rejects.toMatchObject({ kind: "network" });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("honors Retry-After on 429 when retrying", async () => {
      vi.useFakeTimers();
      const c = new ErplyBooksClient({ ...baseConfig, httpMaxRetries: 1, httpRetryBaseMs: 10 });
      fetchMock
        .mockResolvedValueOnce(
          jsonResponse({ message: "rate" }, 429, "Too Many Requests", { "Retry-After": "1" }),
        )
        .mockResolvedValueOnce(jsonResponse({ ok: true }));

      const promise = c.get("/accounts");
      await vi.advanceTimersByTimeAsync(1000);
      await expect(promise).resolves.toEqual({ ok: true });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe("getAllPages", () => {
    it("aggregates offset pages until a short page", async () => {
      const c = new ErplyBooksClient(baseConfig, { pageSize: 2 });
      fetchMock
        .mockResolvedValueOnce(jsonResponse({ items: [{ id: 1 }, { id: 2 }], totalCount: 3 }))
        .mockResolvedValueOnce(jsonResponse({ items: [{ id: 3 }], totalCount: 3 }));

      await expect(c.getAllPages<{ id: number }>("/accounts")).resolves.toEqual([
        { id: 1 },
        { id: 2 },
        { id: 3 },
      ]);
      expect(new URL(fetchMock.mock.calls[0][0]).searchParams.get("start")).toBe("0");
      expect(new URL(fetchMock.mock.calls[1][0]).searchParams.get("start")).toBe("2");
    });

    it("stops early when totalCount is reached on a full page", async () => {
      const c = new ErplyBooksClient(baseConfig, { pageSize: 2 });
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ items: [{ id: 1 }, { id: 2 }], totalCount: 2 }),
      );

      await expect(c.getAllPages<{ id: number }>("/accounts")).resolves.toEqual([
        { id: 1 },
        { id: 2 },
      ]);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("honors an explicit limit param", async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ items: [{ id: 1 }], totalCount: 1 }));
      await client.getAllPages("/accounts", { limit: 5 });
      expect(new URL(fetchMock.mock.calls[0][0]).searchParams.get("limit")).toBe("5");
    });

    it("stops at maxPages and warns", async () => {
      const c = new ErplyBooksClient(baseConfig, { pageSize: 2, maxPages: 2 });
      fetchMock
        .mockResolvedValueOnce(jsonResponse({ items: [{ id: 1 }, { id: 2 }], totalCount: 100 }))
        .mockResolvedValueOnce(jsonResponse({ items: [{ id: 3 }, { id: 4 }], totalCount: 100 }));

      await expect(c.getAllPages("/accounts")).resolves.toEqual([
        { id: 1 },
        { id: 2 },
        { id: 3 },
        { id: 4 },
      ]);
      expect(rootLoggerMocks.warn).toHaveBeenCalledWith(
        expect.objectContaining({ maxPages: 2, path: "/accounts", totalCount: 100 }),
        "getAllPages stopped at maxPages cap",
      );
    });

    it("throws when the response is a bare array", async () => {
      fetchMock.mockResolvedValue(jsonResponse([{ id: 1 }]));
      await expect(client.getAllPages("/accounts")).rejects.toThrow(/got array/);
    });

    it("throws when the response is a non-object primitive", async () => {
      fetchMock.mockResolvedValue(jsonResponse("nope"));
      await expect(client.getAllPages("/accounts")).rejects.toThrow(/got string/);
    });

    it("treats null or missing items as an empty page", async () => {
      fetchMock.mockResolvedValue(jsonResponse({ items: null, totalCount: 0 }));
      await expect(client.getAllPages("/accounts")).resolves.toEqual([]);
    });

    it("throws when items is a non-array non-null value", async () => {
      fetchMock.mockResolvedValue(jsonResponse({ items: { bad: true }, totalCount: 1 }));
      await expect(client.getAllPages("/accounts")).rejects.toThrow(/expected \{ items/);
    });

    it("throws when the response is null", async () => {
      fetchMock.mockResolvedValue(jsonResponse(null));
      await expect(client.getAllPages("/accounts")).rejects.toThrow(/got null/);
    });

    it("treats missing or non-finite totalCount as unknown and uses short-page stop", async () => {
      const c = new ErplyBooksClient(baseConfig, { pageSize: 2 });
      fetchMock
        .mockResolvedValueOnce(
          jsonResponse({ items: [{ id: 1 }, { id: 2 }], totalCount: Number.NaN }),
        )
        .mockResolvedValueOnce(jsonResponse({ items: [{ id: 3 }] }));

      await expect(c.getAllPages<{ id: number }>("/accounts")).resolves.toEqual([
        { id: 1 },
        { id: 2 },
        { id: 3 },
      ]);
    });
  });

  describe("custom logger option", () => {
    it("uses the provided logger", async () => {
      const custom = { info: vi.fn(), warn: vi.fn() } as unknown as Logger;
      const c = new ErplyBooksClient(baseConfig, { logger: custom });
      fetchMock.mockResolvedValue(jsonResponse({}));
      await c.get("/organisation");
      expect(custom.info).toHaveBeenCalled();
    });
  });

  describe("retry defaults on config", () => {
    it("uses zero retries and 500ms base when knobs are omitted", async () => {
      const c = new ErplyBooksClient({
        apiToken: "test-token",
        baseUrl: "https://api.erplybooks.com/api",
        requestTimeoutMs: 30_000,
      });
      fetchMock.mockResolvedValue(jsonResponse({ message: "busy" }, 503));
      await expect(c.get("/organisation")).rejects.toMatchObject({ httpStatus: 503 });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("clamps negative retry knobs to zero", async () => {
      const c = new ErplyBooksClient({
        ...baseConfig,
        httpMaxRetries: -3,
        httpRetryBaseMs: -10,
      });
      fetchMock.mockResolvedValue(jsonResponse({ message: "busy" }, 503));
      await expect(c.get("/organisation")).rejects.toMatchObject({ httpStatus: 503 });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });
});
