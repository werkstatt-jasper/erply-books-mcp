import "dotenv/config";

import { describe, expect, it } from "vitest";
import { ErplyBooksApiError } from "../api-error.js";
import { loadAuthConfig } from "../auth.js";
import { ErplyBooksClient } from "../client.js";
import { buildAllTools } from "../server-setup.js";

const hasToken = Boolean(process.env.ERPLY_BOOKS_API_TOKEN?.trim());

describe.skipIf(!hasToken)("read tools live MVP", () => {
  const client = new ErplyBooksClient(loadAuthConfig);
  const tools = buildAllTools(client);

  it("erply_get_organisation returns an org object", async () => {
    const result = await tools.erply_get_organisation.handler({});
    const org = JSON.parse(result.content[0].text) as Record<string, unknown>;
    expect(org).toHaveProperty("id");
    expect(org).toHaveProperty("name");
  });

  it("erply_list_accounts returns { totalCount, items }", async () => {
    const result = await tools.erply_list_accounts.handler({ start: 0, limit: 5 });
    const body = JSON.parse(result.content[0].text) as { totalCount: number; items: unknown[] };
    expect(Array.isArray(body.items)).toBe(true);
    expect(typeof body.totalCount).toBe("number");
    expect(body).not.toHaveProperty("organisation");
  });

  it("erply_list_customers returns { totalCount, items }", async () => {
    const result = await tools.erply_list_customers.handler({ start: 0, limit: 5 });
    const body = JSON.parse(result.content[0].text) as { totalCount: number; items: unknown[] };
    expect(Array.isArray(body.items)).toBe(true);
    expect(typeof body.totalCount).toBe("number");
  });

  it("erply_list_invoices accepts DOCUMENT_POS_SELL (plan-safe type on sandbox)", async () => {
    const result = await tools.erply_list_invoices.handler({
      dateFrom: "2020-01-01",
      dateTo: "2026-12-31",
      documentType: "DOCUMENT_POS_SELL",
      start: 0,
      limit: 5,
    });
    const body = JSON.parse(result.content[0].text) as { totalCount: number; items: unknown[] };
    expect(Array.isArray(body.items)).toBe(true);
    expect(typeof body.totalCount).toBe("number");
  });

  it("erply_list_payments surfaces plan restriction or returns a list", async () => {
    try {
      const result = await tools.erply_list_payments.handler({
        dateFrom: "2020-01-01",
        dateTo: "2026-12-31",
        start: 0,
        limit: 5,
      });
      const body = JSON.parse(result.content[0].text) as { totalCount: number; items: unknown[] };
      expect(Array.isArray(body.items)).toBe(true);
    } catch (error) {
      // Sandbox price plans often return HTML 409 (MODULE_PAID_MONEY_REPORT);
      // the useful phrase is past the 500-char body snippet truncation.
      expect(error).toBeInstanceOf(ErplyBooksApiError);
      expect((error as ErplyBooksApiError).httpStatus).toBe(409);
    }
  });

  it("erply_list_articles returns { totalCount, items }", async () => {
    const result = await tools.erply_list_articles.handler({ start: 0, limit: 5 });
    const body = JSON.parse(result.content[0].text) as { totalCount: number; items: unknown[] };
    expect(Array.isArray(body.items)).toBe(true);
    expect(typeof body.totalCount).toBe("number");
  });

  it("erply_list_projects returns { totalCount, items }", async () => {
    const result = await tools.erply_list_projects.handler({ start: 0, limit: 5 });
    const body = JSON.parse(result.content[0].text) as { totalCount: number; items: unknown[] };
    expect(Array.isArray(body.items)).toBe(true);
    expect(typeof body.totalCount).toBe("number");
  });

  it("erply_list_account_entries accepts dates or surfaces plan/module error", async () => {
    try {
      const result = await tools.erply_list_account_entries.handler({
        dateFrom: "2020-01-01",
        dateTo: "2026-12-31",
        start: 0,
        limit: 5,
      });
      const body = JSON.parse(result.content[0].text) as { totalCount: number; items: unknown[] };
      expect(Array.isArray(body.items)).toBe(true);
    } catch (error) {
      expect(error).toBeInstanceOf(ErplyBooksApiError);
      expect([409, 500]).toContain((error as ErplyBooksApiError).httpStatus);
    }
  });

  it("erply_list_transaction_entries accepts dates or surfaces plan/module error", async () => {
    try {
      const result = await tools.erply_list_transaction_entries.handler({
        dateFrom: "2020-01-01",
        dateTo: "2026-12-31",
        start: 0,
        limit: 5,
      });
      const body = JSON.parse(result.content[0].text) as { totalCount: number; items: unknown[] };
      expect(Array.isArray(body.items)).toBe(true);
    } catch (error) {
      expect(error).toBeInstanceOf(ErplyBooksApiError);
      expect([409, 500]).toContain((error as ErplyBooksApiError).httpStatus);
    }
  });

  it("erply_balance_sheet succeeds or returns structured 409/500", async () => {
    try {
      const result = await tools.erply_balance_sheet.handler({
        dateFrom: "2025-01-01",
        dateTo: "2025-12-31",
      });
      expect(result.content[0].text.length).toBeGreaterThan(2);
    } catch (error) {
      expect(error).toBeInstanceOf(ErplyBooksApiError);
      expect([409, 500]).toContain((error as ErplyBooksApiError).httpStatus);
    }
  });

  it("erply_income_sheet succeeds or returns structured 409/500", async () => {
    try {
      const result = await tools.erply_income_sheet.handler({
        dateFrom: "2025-01-01",
        dateTo: "2025-12-31",
      });
      expect(result.content[0].text.length).toBeGreaterThan(2);
    } catch (error) {
      expect(error).toBeInstanceOf(ErplyBooksApiError);
      expect([409, 500]).toContain((error as ErplyBooksApiError).httpStatus);
    }
  });

  it("erply_aged_receivables succeeds or returns structured 409/500", async () => {
    try {
      const result = await tools.erply_aged_receivables.handler({
        dateFrom: "2025-01-01",
        dateTo: "2025-12-31",
      });
      expect(result.content[0].text.length).toBeGreaterThan(2);
    } catch (error) {
      expect(error).toBeInstanceOf(ErplyBooksApiError);
      expect([409, 500]).toContain((error as ErplyBooksApiError).httpStatus);
    }
  });

  it("erply_general_ledger succeeds or returns structured 409/500", async () => {
    try {
      const result = await tools.erply_general_ledger.handler({
        dateFrom: "2025-01-01",
        dateTo: "2025-12-31",
      });
      expect(result.content[0].text.length).toBeGreaterThan(2);
    } catch (error) {
      expect(error).toBeInstanceOf(ErplyBooksApiError);
      expect([409, 500]).toContain((error as ErplyBooksApiError).httpStatus);
    }
  });
});

describe.skipIf(hasToken)("read tools live MVP (no token)", () => {
  it("skips when ERPLY_BOOKS_API_TOKEN is unset", () => {
    expect(hasToken).toBe(false);
  });
});
