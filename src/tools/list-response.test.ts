import { describe, expect, it } from "vitest";
import { jsonToolResult, mutationToolResult, unwrapListEnvelope } from "./list-response.js";

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
