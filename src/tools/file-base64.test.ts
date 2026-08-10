import { describe, expect, it } from "vitest";
import { decodeBase64File, normalizeFileBase64 } from "./file-base64.js";

describe("normalizeFileBase64", () => {
  it("returns normalized base64", () => {
    const b64 = Buffer.from("a,b\n1,2\n", "utf8").toString("base64");
    expect(normalizeFileBase64(` ${b64} \n`)).toBe(b64);
  });

  it("rejects empty payload", () => {
    expect(() => normalizeFileBase64("")).toThrow(/fileBase64/);
  });

  it("rejects invalid base64 characters", () => {
    expect(() => normalizeFileBase64("!!!")).toThrow(/invalid base64/);
  });

  it("rejects whitespace-only", () => {
    expect(() => normalizeFileBase64("  ")).toThrow(/fileBase64/);
  });

  it("rejects base64 that decodes to an empty buffer", () => {
    expect(() => normalizeFileBase64("A")).toThrow(/decoded file is empty/);
  });
});

describe("decodeBase64File", () => {
  it("decodes a CSV payload", () => {
    const b64 = Buffer.from("a,b\n1,2\n", "utf8").toString("base64");
    const file = decodeBase64File(b64, "stmt.csv");
    expect(file.name).toBe("stmt.csv");
    expect(file.size).toBeGreaterThan(0);
  });
});
