import { describe, expect, it } from "vitest";
import {
  isZipBytes,
  jsonToolResult,
  mutationToolResult,
  unwrapListEnvelope,
} from "./list-response.js";

describe("unwrapListEnvelope", () => {
  it("returns items and totalCount, dropping organisation", () => {
    expect(
      unwrapListEnvelope({
        items: [{ id: 1 }],
        totalCount: 1,
        organisation: { id: 9, name: "Org" },
      }),
    ).toEqual({ totalCount: 1, items: [{ id: 1 }] });
  });

  it("treats null items as an empty array", () => {
    expect(unwrapListEnvelope({ items: null, totalCount: 0 })).toEqual({
      totalCount: 0,
      items: [],
    });
  });

  it("uses null totalCount when missing or non-finite", () => {
    expect(unwrapListEnvelope({ items: [] }).totalCount).toBeNull();
    expect(unwrapListEnvelope({ items: [], totalCount: Number.NaN }).totalCount).toBeNull();
  });

  it("rejects non-object responses", () => {
    expect(() => unwrapListEnvelope([])).toThrow(/array/);
    expect(() => unwrapListEnvelope(null)).toThrow(/null/);
    expect(() => unwrapListEnvelope("x")).toThrow(/string/);
  });
});

describe("jsonToolResult", () => {
  it("stringifies payload as MCP text content", () => {
    expect(jsonToolResult({ ok: true })).toEqual({
      content: [{ type: "text", text: JSON.stringify({ ok: true }, null, 2) }],
    });
  });
});

describe("mutationToolResult", () => {
  it("maps undefined (HTTP 204) to { ok: true }", () => {
    expect(mutationToolResult(undefined)).toEqual({
      content: [{ type: "text", text: JSON.stringify({ ok: true }, null, 2) }],
    });
  });

  it("passes through API JSON bodies", () => {
    expect(JSON.parse(mutationToolResult({ id: 3 }).content[0].text)).toEqual({ id: 3 });
  });
});

describe("isZipBytes", () => {
  it("recognizes zip signatures and rejects other bodies", () => {
    expect(isZipBytes(Buffer.from([0x50, 0x4b, 0x03, 0x04]))).toBe(true);
    expect(isZipBytes(Buffer.from([0x50, 0x4b, 0x05, 0x06]))).toBe(true);
    expect(isZipBytes(Buffer.from([0x50, 0x4b, 0x07, 0x08]))).toBe(true);
    expect(isZipBytes(Buffer.from([0x50, 0x4b, 0x03]))).toBe(false);
    expect(isZipBytes(Buffer.from([0x50, 0x4b, 0x01, 0x02]))).toBe(false);
    expect(isZipBytes(Buffer.from([0x51, 0x4b, 0x03, 0x04]))).toBe(false);
    expect(isZipBytes(Buffer.from([0x50, 0x4c, 0x03, 0x04]))).toBe(false);
    expect(isZipBytes(Buffer.from("PK\u0003\u0005", "latin1"))).toBe(false);
    expect(isZipBytes(Buffer.from('{"a":1}'))).toBe(false);
  });
});
