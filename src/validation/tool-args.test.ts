import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  formatZodError,
  optionalBoolean,
  optionalInt,
  optionalNonNegativeInt,
  optionalNumber,
  optionalString,
  optionalYmd,
  optionalYmdOrIsoDateTime,
  parseToolArgs,
  positiveInt,
  ymdDateString,
} from "./tool-args.js";

describe("formatZodError", () => {
  it("includes dot-separated paths and messages", () => {
    const schema = z.object({ a: z.object({ b: ymdDateString }) });
    const result = schema.safeParse({ a: { b: "nope" } });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = formatZodError(result.error);
      expect(msg).toContain("a.b");
      expect(msg).toMatch(/Expected YYYY-MM-DD|Invalid/i);
    }
  });

  it("uses (root) when issue path is empty", () => {
    const result = z.string().safeParse(123);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(formatZodError(result.error)).toMatch(/^\(root\):/);
    }
  });
});

describe("parseToolArgs", () => {
  it("uses empty object when raw is undefined", () => {
    const schema = z.object({ page: z.number().optional() });
    expect(parseToolArgs(schema, undefined)).toEqual({});
  });

  it("throws Error with formatted message on failure", () => {
    const schema = z.object({ id: positiveInt });
    expect(() => parseToolArgs(schema, { id: -1 })).toThrow(/id/);
  });

  it("rejects impossible calendar dates", () => {
    expect(() => parseToolArgs(z.object({ d: ymdDateString }), { d: "2024-02-30" })).toThrow(
      /Invalid calendar date|Expected/,
    );
  });

  it("strips unknown keys by default (Zod object behavior)", () => {
    const schema = z.object({ x: z.number().optional() });
    const out = parseToolArgs(schema, { x: 1, extra: "gone" });
    expect(out).toEqual({ x: 1 });
    expect(Object.keys(out as object)).not.toContain("extra");
  });

  it("accepts valid optional YMD", () => {
    const schema = z.object({ start: optionalYmd });
    expect(parseToolArgs(schema, { start: "2024-06-01" })).toEqual({ start: "2024-06-01" });
    expect(parseToolArgs(schema, {})).toEqual({ start: undefined });
  });

  it("coerces YYYY-MM-DD to ISO datetime and passes other values through", () => {
    const schema = z.object({
      dateFrom: optionalYmdOrIsoDateTime("T00:00:00"),
      dateTo: optionalYmdOrIsoDateTime("T23:59:59"),
    });
    expect(parseToolArgs(schema, { dateFrom: "2020-01-01", dateTo: "2026-12-31" })).toEqual({
      dateFrom: "2020-01-01T00:00:00",
      dateTo: "2026-12-31T23:59:59",
    });
    expect(
      parseToolArgs(schema, {
        dateFrom: "2020-01-01T00:00:00",
        dateTo: "2026-12-31T23:59:59",
      }),
    ).toEqual({
      dateFrom: "2020-01-01T00:00:00",
      dateTo: "2026-12-31T23:59:59",
    });
    expect(parseToolArgs(schema, { dateFrom: "01.01.2020" })).toEqual({
      dateFrom: "01.01.2020",
      dateTo: undefined,
    });
    expect(parseToolArgs(schema, { dateFrom: "2024-02-30" })).toEqual({
      dateFrom: "2024-02-30",
      dateTo: undefined,
    });
    expect(parseToolArgs(schema, { dateFrom: null, dateTo: null })).toEqual({
      dateFrom: undefined,
      dateTo: undefined,
    });
    expect(parseToolArgs(schema, {})).toEqual({ dateFrom: undefined, dateTo: undefined });
  });

  it("accepts optional non-negative start offsets", () => {
    const schema = z.object({ start: optionalNonNegativeInt });
    expect(parseToolArgs(schema, { start: 0 })).toEqual({ start: 0 });
    expect(() => parseToolArgs(schema, { start: -1 })).toThrow(/start/);
  });

  it("accepts optional integers and coerces numeric strings", () => {
    const schema = z.object({ reportType: optionalInt });
    expect(parseToolArgs(schema, { reportType: 2 })).toEqual({ reportType: 2 });
    expect(parseToolArgs(schema, { reportType: "2" })).toEqual({ reportType: 2 });
    expect(parseToolArgs(schema, { reportType: null })).toEqual({ reportType: undefined });
    expect(parseToolArgs(schema, {})).toEqual({ reportType: undefined });
    expect(() => parseToolArgs(schema, { reportType: "abc" })).toThrow(/reportType/);
    expect(() => parseToolArgs(schema, { reportType: 1.5 })).toThrow(/reportType/);
  });

  it("coerces optional string/number/boolean nullish values to undefined", () => {
    const schema = z.object({
      s: optionalString,
      n: optionalNumber,
      b: optionalBoolean,
    });
    expect(parseToolArgs(schema, { s: null, n: null, b: null })).toEqual({
      s: undefined,
      n: undefined,
      b: undefined,
    });
    expect(parseToolArgs(schema, { s: "x", n: "3", b: true })).toEqual({
      s: "x",
      n: 3,
      b: true,
    });
  });
});
