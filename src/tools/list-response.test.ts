import { describe, expect, it } from "vitest";
import {
  erplyResponseWrapper,
  fileDownloadToolResult,
  isBinaryContentType,
  isKnownBinaryFile,
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

describe("isKnownBinaryFile", () => {
  it.each([
    ["PDF", [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]],
    ["PNG", [0x89, 0x50, 0x4e, 0x47, 0x0d]],
    ["JPEG", [0xff, 0xd8, 0xff, 0xe0]],
    ["GIF", [0x47, 0x49, 0x46, 0x38, 0x39]],
    ["TIFF LE", [0x49, 0x49, 0x2a, 0x00]],
    ["TIFF BE", [0x4d, 0x4d, 0x00, 0x2a]],
    ["ZIP", [0x50, 0x4b, 0x03, 0x04]],
  ])("detects %s", (_label, bytes) => {
    expect(isKnownBinaryFile(Buffer.from(bytes))).toBe(true);
  });

  it.each([
    ["JSON", Buffer.from('{"a":1}')],
    ["text", Buffer.from("%PD")],
    ["empty", Buffer.alloc(0)],
  ])("rejects %s", (_label, buf) => {
    expect(isKnownBinaryFile(buf)).toBe(false);
  });
});

describe("isBinaryContentType", () => {
  it.each([
    ["application/pdf", true],
    ["Application/PDF; name=fake.pdf", true],
    ["application/octet-stream", true],
    ["application/zip", true],
    ["application/x-zip-compressed", true],
    ["image/png", true],
    ["audio/mpeg", true],
    ["video/mp4", true],
    ["application/vnd.ms-excel", true],
    ["application/vnd.api+json", false],
    ["image/svg+xml", false],
    ["application/json", false],
    ["text/plain", false],
    ["", false],
    [null, false],
    [undefined, false],
  ])("%s -> %s", (contentType, expected) => {
    expect(isBinaryContentType(contentType)).toBe(expected);
  });
});

describe("erplyResponseWrapper", () => {
  it("detects the truncated 35-byte NO_CONTENT body", () => {
    expect(erplyResponseWrapper(Buffer.from('{"statusType":"NO_CONTENT","entity"'))).toEqual({
      statusType: "NO_CONTENT",
      complete: false,
    });
  });

  it("parses a complete wrapper", () => {
    const wrapper = { statusType: "NO_CONTENT", entity: null };
    expect(erplyResponseWrapper(Buffer.from(` ${JSON.stringify(wrapper)}`))).toEqual({
      statusType: "NO_CONTENT",
      complete: true,
      parsed: wrapper,
    });
  });

  it("ignores other bodies", () => {
    expect(erplyResponseWrapper(Buffer.from('{"filename":"fake.pdf"}'))).toBeNull();
    expect(erplyResponseWrapper(Buffer.from("%PDF-1.4"))).toBeNull();
  });
});

describe("fileDownloadToolResult", () => {
  const toAb = (buf: Buffer) =>
    buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  const parse = (r: { content: Array<{ text: string }> }) =>
    JSON.parse(r.content[0]?.text ?? "") as Record<string, unknown>;

  it("uses the default empty message", () => {
    expect(parse(fileDownloadToolResult(new ArrayBuffer(0), { subject: "fake file" }))).toEqual({
      encoding: "empty",
      byteLength: 0,
      message: "Erply returned an empty body for fake file.",
    });
  });

  it("uses a custom empty message", () => {
    expect(
      parse(fileDownloadToolResult(new ArrayBuffer(0), { subject: "x", emptyMessage: "Nothing." }))
        .message,
    ).toBe("Nothing.");
  });

  it("throws for a truncated wrapper of any status", () => {
    expect(() =>
      fileDownloadToolResult(toAb(Buffer.from('{"statusType":"OK","entity":{')), {
        subject: "fake file",
      }),
    ).toThrow("Erply returned a truncated OK response");
  });

  it("returns base64 for a PDF and JSON for a JSON body", () => {
    const pdf = Buffer.from("%PDF-1.7 fake");
    expect(parse(fileDownloadToolResult(toAb(pdf), { subject: "x" })).encoding).toBe("base64");
    expect(parse(fileDownloadToolResult(toAb(Buffer.from('{"id":1}')), { subject: "x" }))).toEqual({
      id: 1,
    });
  });
});
