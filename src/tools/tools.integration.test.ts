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

  it("erply_list_tax_rates returns { totalCount, items } or plan error", async () => {
    try {
      const result = await tools.erply_list_tax_rates.handler({ start: 0, limit: 5 });
      const body = JSON.parse(result.content[0].text) as { totalCount: number; items: unknown[] };
      expect(Array.isArray(body.items)).toBe(true);
      expect(typeof body.totalCount).toBe("number");
    } catch (error) {
      expect(error).toBeInstanceOf(ErplyBooksApiError);
      expect([403, 409, 500]).toContain((error as ErplyBooksApiError).httpStatus);
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

  it("erply_daybook succeeds or returns structured 409/500", async () => {
    try {
      const result = await tools.erply_daybook.handler({
        dateFrom: "2025-01-01",
        dateTo: "2025-12-31",
      });
      expect(result.content[0].text.length).toBeGreaterThan(2);
    } catch (error) {
      expect(error).toBeInstanceOf(ErplyBooksApiError);
      expect([409, 500]).toContain((error as ErplyBooksApiError).httpStatus);
    }
  });

  it("erply_trial_balance succeeds or returns structured 409/500", async () => {
    try {
      const result = await tools.erply_trial_balance.handler({
        dateFrom: "2025-01-01",
        dateTo: "2025-12-31",
      });
      expect(result.content[0].text.length).toBeGreaterThan(2);
    } catch (error) {
      expect(error).toBeInstanceOf(ErplyBooksApiError);
      expect([409, 500]).toContain((error as ErplyBooksApiError).httpStatus);
    }
  });

  it("erply_vat_ee succeeds or returns structured 409/500", async () => {
    try {
      const result = await tools.erply_vat_ee.handler({
        dateFrom: "2025-01-01",
        dateTo: "2025-03-31",
      });
      expect(result.content[0].text.length).toBeGreaterThan(2);
    } catch (error) {
      expect(error).toBeInstanceOf(ErplyBooksApiError);
      expect([409, 500]).toContain((error as ErplyBooksApiError).httpStatus);
    }
  });

  it("erply_contact_balance succeeds or returns structured 409/500", async () => {
    try {
      const result = await tools.erply_contact_balance.handler({
        dateFrom: "2025-01-01",
        dateTo: "2025-12-31",
      });
      expect(result.content[0].text.length).toBeGreaterThan(2);
    } catch (error) {
      expect(error).toBeInstanceOf(ErplyBooksApiError);
      expect([409, 500]).toContain((error as ErplyBooksApiError).httpStatus);
    }
  });

  it("erply_fixed_assets succeeds or returns structured 409/500", async () => {
    try {
      const result = await tools.erply_fixed_assets.handler({
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

describe.skipIf(!hasToken)("write tools live MVP", () => {
  const client = new ErplyBooksClient(loadAuthConfig);
  const tools = buildAllTools(client);

  it("erply_create_customer then delete (or plan/module error)", async () => {
    const uniqueName = `MCP E5 test ${Date.now()}`;
    try {
      const created = await tools.erply_create_customer.handler({
        name: uniqueName,
        customer: true,
        entityTypeCode: "ENTITY_TYPE_LEGAL",
      });
      const body = JSON.parse(created.content[0].text) as { id?: number; name?: string };
      expect(typeof body.id).toBe("number");
      const deleted = await tools.erply_delete_customer.handler({ customerId: body.id });
      expect(JSON.parse(deleted.content[0].text)).toMatchObject({ ok: true });
    } catch (error) {
      expect(error).toBeInstanceOf(ErplyBooksApiError);
      expect([403, 409, 500]).toContain((error as ErplyBooksApiError).httpStatus);
    }
  });

  it("erply_create_account then delete (or plan/module error)", async () => {
    const number = `9${String(Date.now()).slice(-5)}`;
    try {
      const created = await tools.erply_create_account.handler({
        number,
        name: `MCP E5 acct ${number}`,
      });
      const body = JSON.parse(created.content[0].text) as { id?: number };
      expect(typeof body.id).toBe("number");
      await tools.erply_delete_account.handler({ accountId: body.id });
    } catch (error) {
      expect(error).toBeInstanceOf(ErplyBooksApiError);
      expect([403, 409, 500]).toContain((error as ErplyBooksApiError).httpStatus);
    }
  });

  it("erply_create_tax_rate then delete (or plan/module error)", async () => {
    const name = `MCP E21 tax ${Date.now()}`;
    try {
      const created = await tools.erply_create_tax_rate.handler({
        name,
        percent: 0.01,
        description: name,
      });
      const body = JSON.parse(created.content[0].text) as { id?: number };
      expect(typeof body.id).toBe("number");
      await tools.erply_delete_tax_rate.handler({ taxRateId: body.id });
    } catch (error) {
      expect(error).toBeInstanceOf(ErplyBooksApiError);
      expect([403, 409, 500]).toContain((error as ErplyBooksApiError).httpStatus);
    }
  });

  it("erply_create_article then delete (or plan/module error)", async () => {
    const name = `MCP E23 article ${Date.now()}`;
    try {
      const created = await tools.erply_create_article.handler({
        name,
        code: `E23${String(Date.now()).slice(-6)}`,
        typeCode: "ARTICLE_SERVICE",
      });
      const body = JSON.parse(created.content[0].text) as { id?: number };
      expect(typeof body.id).toBe("number");
      await tools.erply_delete_article.handler({ articleId: body.id });
    } catch (error) {
      expect(error).toBeInstanceOf(ErplyBooksApiError);
      expect([403, 409, 500]).toContain((error as ErplyBooksApiError).httpStatus);
    }
  });

  it("erply_create_project then delete (or plan/module error)", async () => {
    const name = `MCP E23 project ${Date.now()}`;
    try {
      const created = await tools.erply_create_project.handler({
        name,
        description: name,
      });
      const body = JSON.parse(created.content[0].text) as { id?: number };
      expect(typeof body.id).toBe("number");
      await tools.erply_delete_project.handler({ projectId: body.id });
    } catch (error) {
      expect(error).toBeInstanceOf(ErplyBooksApiError);
      expect([403, 409, 500]).toContain((error as ErplyBooksApiError).httpStatus);
    }
  });

  it("erply_create_attachment then delete (or plan/module error)", async () => {
    try {
      const created = await tools.erply_create_attachment.handler({
        fileBase64: Buffer.from(`MCP E24 ${Date.now()}`, "utf8").toString("base64"),
        fileName: "mcp-e24.txt",
        description: `MCP E24 attachment ${Date.now()}`,
      });
      const body = JSON.parse(created.content[0].text) as {
        attachmentId?: number;
        id?: number;
      };
      const attachmentId = body.attachmentId ?? body.id;
      expect(typeof attachmentId).toBe("number");
      await tools.erply_delete_attachment.handler({ attachmentId });
    } catch (error) {
      expect(error).toBeInstanceOf(ErplyBooksApiError);
      expect([403, 409, 500]).toContain((error as ErplyBooksApiError).httpStatus);
    }
  });

  it("erply_create_transaction_entry then delete (or plan/module error)", async () => {
    try {
      const accountsResult = await tools.erply_list_accounts.handler({ start: 0, limit: 2 });
      const accounts = JSON.parse(accountsResult.content[0].text) as {
        items: Array<{ id?: number }>;
      };
      const accountIds = accounts.items
        .map((a) => a.id)
        .filter((id): id is number => typeof id === "number");
      const debitId = accountIds[0] ?? 1;
      const creditId = accountIds[1] ?? debitId;
      const created = await tools.erply_create_transaction_entry.handler({
        opDate: "2025-06-15",
        typeCode: "DIRECT_TRANSACTION",
        description: `MCP E22 txn ${Date.now()}`,
        accountEntries: [
          { accountId: debitId, debitSum: 0.01 },
          { accountId: creditId, creditSum: 0.01 },
        ],
      });
      const body = JSON.parse(created.content[0].text) as { id?: number };
      expect(typeof body.id).toBe("number");
      await tools.erply_delete_transaction_entry.handler({ transactionEntryId: body.id });
    } catch (error) {
      expect(error).toBeInstanceOf(ErplyBooksApiError);
      expect([403, 409, 500]).toContain((error as ErplyBooksApiError).httpStatus);
    }
  });

  it("erply_create_invoice then delete (or plan/module error)", async () => {
    try {
      const created = await tools.erply_create_invoice.handler({
        typeCode: "DOCUMENT_POS_SELL",
        date: "2025-06-01",
        customer: { id: 0, name: `MCP E5 inv ${Date.now()}` },
        rows: [{ name: "Test line", quantity: 1, price: 1 }],
      });
      const body = JSON.parse(created.content[0].text) as { id?: number };
      expect(typeof body.id).toBe("number");
      await tools.erply_delete_invoice.handler({ invoiceId: body.id });
    } catch (error) {
      expect(error).toBeInstanceOf(ErplyBooksApiError);
      expect([403, 409, 500]).toContain((error as ErplyBooksApiError).httpStatus);
    }
  });

  it("erply_get_invoice_pdf succeeds or returns structured 409/500", async () => {
    try {
      const listed = await tools.erply_list_invoices.handler({
        dateFrom: "2020-01-01",
        dateTo: "2026-12-31",
        documentType: "DOCUMENT_POS_SELL",
        start: 0,
        limit: 1,
      });
      const page = JSON.parse(listed.content[0].text) as {
        items: Array<{ id?: number }>;
      };
      const documentId = page.items[0]?.id ?? 1;
      const result = await tools.erply_get_invoice_pdf.handler({ documentId });
      expect(result.content[0].text.length).toBeGreaterThan(2);
    } catch (error) {
      expect(error).toBeInstanceOf(ErplyBooksApiError);
      expect([403, 404, 409, 500]).toContain((error as ErplyBooksApiError).httpStatus);
    }
  });

  it("erply_list_partner_invoices succeeds or returns structured 409/500", async () => {
    try {
      const result = await tools.erply_list_partner_invoices.handler({
        dateFrom: "2020-01-01",
        dateTo: "2026-12-31",
      });
      const body = JSON.parse(result.content[0].text) as { totalCount: number; items: unknown[] };
      expect(Array.isArray(body.items)).toBe(true);
    } catch (error) {
      expect(error).toBeInstanceOf(ErplyBooksApiError);
      expect([403, 409, 500]).toContain((error as ErplyBooksApiError).httpStatus);
    }
  });

  it("erply_confirm_invoices surfaces plan restriction or accepts ids", async () => {
    try {
      const result = await tools.erply_confirm_invoices.handler({ ids: [1] });
      expect(result.content[0].text.length).toBeGreaterThan(2);
    } catch (error) {
      expect(error).toBeInstanceOf(ErplyBooksApiError);
      expect([400, 403, 404, 409, 500]).toContain((error as ErplyBooksApiError).httpStatus);
    }
  });

  it("erply_create_payment then delete (or plan/module error)", async () => {
    try {
      const created = await tools.erply_create_payment.handler({
        opDate: "2025-06-02",
        sumPaid: 0.01,
        note: `MCP E5 pay ${Date.now()}`,
      });
      const body = JSON.parse(created.content[0].text) as { id?: number };
      expect(typeof body.id).toBe("number");
      await tools.erply_delete_payment.handler({ paymentId: body.id });
    } catch (error) {
      expect(error).toBeInstanceOf(ErplyBooksApiError);
      expect([403, 409, 500]).toContain((error as ErplyBooksApiError).httpStatus);
    }
  });

  it("erply_list_pending_payments surfaces plan restriction or returns a list", async () => {
    try {
      const result = await tools.erply_list_pending_payments.handler({
        dateFrom: "2020-01-01",
        dateTo: "2026-12-31",
      });
      const body = JSON.parse(result.content[0].text) as { totalCount: number; items: unknown[] };
      expect(Array.isArray(body.items)).toBe(true);
    } catch (error) {
      expect(error).toBeInstanceOf(ErplyBooksApiError);
      expect([403, 409, 500]).toContain((error as ErplyBooksApiError).httpStatus);
    }
  });

  it("import payment → update payment with invoiceId links it to the invoice", async () => {
    let invoiceId: number | undefined;
    let paymentId: number | undefined;
    let customerId: number | undefined;

    try {
      const customerResult = await tools.erply_create_customer.handler({
        name: `MCP recon ${Date.now()}`,
      });
      customerId = JSON.parse(customerResult.content[0].text).id;

      const invoiceResult = await tools.erply_create_invoice.handler({
        typeCode: "DOCUMENT_SELL",
        date: "2026-08-11",
        number: `MCP-REC-${Date.now()}`,
        customerId,
        rows: [{ name: "Test line", quantity: 1, price: 100 }],
      });
      invoiceId = JSON.parse(invoiceResult.content[0].text).id;

      const paymentResult = await tools.erply_create_payment.handler({
        opDate: "2026-08-11",
        sumPaid: 100,
        typeCode: "OTHER_INCOMING_PAYMENT",
        accountId: 1307870,
        customerId,
        currencyCode: "CURRENCY_EUR",
        note: "MCP recon test",
      });
      paymentId = JSON.parse(paymentResult.content[0].text).id;

      await tools.erply_update_payment.handler({
        paymentId,
        opDate: "2026-08-11",
        sumPaid: 100,
        invoiceId,
        typeCode: "OTHER_INCOMING_PAYMENT",
        accountId: 1307870,
        customerId,
        currencyCode: "CURRENCY_EUR",
      });

      const invoice = JSON.parse(
        (await tools.erply_get_invoice.handler({ documentId: invoiceId })).content[0].text,
      );
      expect(invoice.sumPaid).toBe(100);
      expect(invoice.sumLeftToPay).toBe(0);
    } catch (error) {
      expect(error).toBeInstanceOf(ErplyBooksApiError);
      expect([403, 409, 500]).toContain((error as ErplyBooksApiError).httpStatus);
    } finally {
      if (paymentId) {
        try {
          await tools.erply_delete_payment.handler({ paymentId });
        } catch {
          // best-effort cleanup
        }
      }
      if (invoiceId) {
        try {
          await tools.erply_delete_invoice.handler({ documentId: invoiceId });
        } catch {
          // best-effort cleanup
        }
      }
    }
  });
});

describe.skipIf(hasToken)("read tools live MVP (no token)", () => {
  it("skips when ERPLY_BOOKS_API_TOKEN is unset", () => {
    expect(hasToken).toBe(false);
  });
});
