import "dotenv/config";

import { describe, expect, it } from "vitest";
import { loadAuthConfig } from "./auth.js";
import { ErplyBooksClient } from "./client.js";

const hasToken = Boolean(process.env.ERPLY_BOOKS_API_TOKEN?.trim());

describe.skipIf(!hasToken)("ErplyBooksClient live GET", () => {
  const client = new ErplyBooksClient(loadAuthConfig);

  it("GET /organisation returns a JSON object", async () => {
    const org = await client.get<Record<string, unknown>>("/organisation");
    expect(org).toBeTypeOf("object");
    expect(org).not.toBeNull();
    expect(Array.isArray(org)).toBe(false);
    // Keys only — never log values (may contain org PII).
    expect(Object.keys(org).length).toBeGreaterThan(0);
    expect(org).toHaveProperty("id");
    expect(org).toHaveProperty("name");
  });

  it("GET /accounts uses { items, totalCount } list envelope", async () => {
    const page = await client.get<{
      items?: unknown;
      totalCount?: unknown;
      organisation?: unknown;
    }>("/accounts", { start: 0, limit: 5 });
    expect(page).toBeTypeOf("object");
    expect(page).not.toBeNull();
    expect(Array.isArray(page)).toBe(false);
    expect(Array.isArray(page.items)).toBe(true);
    expect(typeof page.totalCount).toBe("number");
    expect(page).toHaveProperty("organisation");
  });
});

describe.skipIf(hasToken)("ErplyBooksClient live GET (no token)", () => {
  it("skips when ERPLY_BOOKS_API_TOKEN is unset", () => {
    expect(hasToken).toBe(false);
  });
});
