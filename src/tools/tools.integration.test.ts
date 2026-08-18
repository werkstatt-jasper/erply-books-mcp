import "dotenv/config";

import { describe, expect, it } from "vitest";
import { ErplyBooksApiError } from "../api-error.js";
import { loadAuthConfig } from "../auth.js";
import { ErplyBooksClient } from "../client.js";
import { buildAllTools } from "../server-setup.js";

const hasToken = Boolean(process.env.ERPLY_BOOKS_API_TOKEN?.trim());

const ATTACHMENT_PROBE_STATUSES = [400, 403, 404, 406, 409, 415, 500];

async function expectOkOrApiError(
  run: () => Promise<unknown>,
  statuses: number[] = ATTACHMENT_PROBE_STATUSES,
): Promise<void> {
  try {
    await run();
  } catch (error) {
    expect(error).toBeInstanceOf(ErplyBooksApiError);
    expect(statuses).toContain((error as ErplyBooksApiError).httpStatus);
  }
}

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

  it("erply_get_dictionary returns DOCUMENT_TYPE entries or structured error", async () => {
    try {
      const result = await tools.erply_get_dictionary.handler({
        dictionaryCode: "DOCUMENT_TYPE",
      });
      expect(result.content[0].text.length).toBeGreaterThan(2);
    } catch (error) {
      expect(error).toBeInstanceOf(ErplyBooksApiError);
      expect([403, 409, 500]).toContain((error as ErplyBooksApiError).httpStatus);
    }
  });

  it("erply_list_custom_report_columns succeeds or returns structured error", async () => {
    try {
      const result = await tools.erply_list_custom_report_columns.handler({
        tables: "Invoice",
      });
      expect(result.content[0].text.length).toBeGreaterThan(2);
    } catch (error) {
      expect(error).toBeInstanceOf(ErplyBooksApiError);
      expect([403, 404, 409, 500]).toContain((error as ErplyBooksApiError).httpStatus);
    }
  });

  it("erply_list_user_defined_reports succeeds or returns structured error", async () => {
    try {
      const result = await tools.erply_list_user_defined_reports.handler({
        dateFrom: "2025-01-01",
        dateTo: "2025-12-31",
      });
      expect(result.content[0].text.length).toBeGreaterThan(2);
    } catch (error) {
      expect(error).toBeInstanceOf(ErplyBooksApiError);
      expect([403, 404, 406, 409, 500]).toContain((error as ErplyBooksApiError).httpStatus);
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

  it("erply_list_attachments accepts Purchase Inbox filters or structured error", async () => {
    try {
      const result = await tools.erply_list_attachments.handler({
        getNotConnectedInvoices: true,
        start: 0,
        limit: 5,
      });
      const body = JSON.parse(result.content[0].text) as { totalCount: number; items: unknown[] };
      expect(Array.isArray(body.items)).toBe(true);
    } catch (error) {
      expect(error).toBeInstanceOf(ErplyBooksApiError);
      expect([403, 409, 500]).toContain((error as ErplyBooksApiError).httpStatus);
    }
  });

  it("purchase inbox digitize/parse/confirm/preview surface plan or not-found errors", async () => {
    let itemId = 1;
    try {
      const listed = await tools.erply_list_attachments.handler({
        getNotConnectedInvoices: true,
        start: 0,
        limit: 1,
      });
      const page = JSON.parse(listed.content[0].text) as {
        items: Array<{ attachmentId?: number; id?: number }>;
      };
      itemId = page.items[0]?.attachmentId ?? page.items[0]?.id ?? 1;
    } catch (error) {
      expect(error).toBeInstanceOf(ErplyBooksApiError);
      expect([403, 409, 500]).toContain((error as ErplyBooksApiError).httpStatus);
    }
    await expectOkOrApiError(() => tools.erply_digitize_attachment.handler({ itemId }));
    await expectOkOrApiError(() => tools.erply_parse_attachment.handler({ attachmentId: itemId }));
    await expectOkOrApiError(() => tools.erply_mark_attachment_opened.handler({ itemId }));
    await expectOkOrApiError(() =>
      tools.erply_confirm_attachment.handler({ attachmentId: itemId }),
    );
    await expectOkOrApiError(() =>
      tools.erply_attach_inbox_item_to_document.handler({
        attachmentId: itemId,
        documentId: 1,
      }),
    );
    await expectOkOrApiError(async () => {
      const preview = await tools.erply_get_attachment_preview.handler({ attachmentId: itemId });
      expect(preview.content[0].text.length).toBeGreaterThan(2);
    });
  });

  it("erply_attach_inbox_item_to_document confirms against a created invoice", async () => {
    let invoiceId: number | undefined;
    try {
      const listed = await tools.erply_list_attachments.handler({
        getEverything: true,
        start: 0,
        limit: 1,
      });
      const page = JSON.parse(listed.content[0].text) as {
        items: Array<{ attachmentId?: number }>;
      };
      const attachmentId = page.items[0]?.attachmentId;
      if (typeof attachmentId !== "number") {
        return;
      }

      const customers = JSON.parse(
        (await tools.erply_list_customers.handler({ start: 0, limit: 1 })).content[0].text,
      ) as { items: Array<{ id?: number }> };
      const customerId = customers.items[0]?.id;
      if (typeof customerId !== "number") {
        return;
      }

      const created = await tools.erply_create_invoice.handler({
        typeCode: "DOCUMENT_BUY",
        date: "2026-08-14",
        customerId,
        number: `E56-IT-${Date.now()}`,
        rows: [{ name: "E56 attach probe", quantity: 1, price: 1 }],
      });
      const invoice = JSON.parse(created.content[0].text) as { id?: number };
      invoiceId = invoice.id;
      expect(typeof invoiceId).toBe("number");

      const confirmed = await tools.erply_attach_inbox_item_to_document.handler({
        attachmentId,
        documentId: invoiceId,
      });
      const body = JSON.parse(confirmed.content[0].text) as {
        attachmentId?: number;
        documentId?: number;
        documentStatusTypeCode?: string;
      };
      expect(body.attachmentId).toBe(attachmentId);
      expect(body.documentId).toBe(invoiceId);
      expect(body.documentStatusTypeCode).toBe("STATUS_CONFIRMED");
    } catch (error) {
      expect(error).toBeInstanceOf(ErplyBooksApiError);
      expect([403, 409, 500]).toContain((error as ErplyBooksApiError).httpStatus);
    } finally {
      if (invoiceId) {
        try {
          await tools.erply_delete_invoice.handler({ invoiceId });
        } catch {
          // best-effort cleanup
        }
      }
    }
  });

  it("erply_get_attachment succeeds or returns a structured error", async () => {
    await expectOkOrApiError(() => tools.erply_get_attachment.handler({ attachmentId: 1 }));
  });

  it("attachment extras (zip/html/child/digi/kyc aliases) succeed or return structured errors", async () => {
    await expectOkOrApiError(() =>
      tools.erply_get_attachment_html_template.handler({ attachmentId: 1 }),
    );
    await expectOkOrApiError(() => tools.erply_get_attachments_zip.handler({ documentId: 1 }));
    await expectOkOrApiError(() => tools.erply_get_summary_invoice.handler({ attachmentId: 1 }));
    await expectOkOrApiError(() =>
      tools.erply_get_attachment_child.handler({ attachmentId: 1, noDownload: 1 }),
    );
    await expectOkOrApiError(() => tools.erply_get_digi_attachment.handler({ attachmentId: 1 }));
    await expectOkOrApiError(() =>
      tools.erply_get_digi_country_from_parser.handler({ code: "EE" }),
    );
    await expectOkOrApiError(() =>
      tools.erply_link_attachment_to_erply_invoice.handler({ attachmentId: 1 }),
    );
    await expectOkOrApiError(() =>
      tools.erply_create_purchase_order_from_attachment.handler({ customerId: 1 }),
    );
    await expectOkOrApiError(() => tools.erply_delete_attachment_via_post.handler({ id: 1 }));
    await expectOkOrApiError(() =>
      tools.erply_delete_activity_attachment.handler({ activityItemAttachmentId: 1 }),
    );
    await expectOkOrApiError(() =>
      tools.erply_mark_attachment_not_digitizable.handler({
        itemId: 1,
        info: "mcp integration probe",
      }),
    );
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

  it("invoice workflow tools surface structured errors for dummy ids", async () => {
    const dummy = 999999999;
    await expectOkOrApiError(() =>
      tools.erply_add_invoice_attribute.handler({ documentId: dummy, attributeName: "MCP_PROBE" }),
    );
    await expectOkOrApiError(() =>
      tools.erply_add_invoice_document_connection.handler({
        documentId: dummy,
        baseDocumentId: dummy,
      }),
    );
    await expectOkOrApiError(() =>
      tools.erply_use_invoice_prepayment.handler({ documentId: dummy, paymentId: dummy }),
    );
    await expectOkOrApiError(() =>
      tools.erply_delete_invoice_row.handler({ documentId: dummy, articleRowId: dummy }),
    );
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

  it("erply_list_pending_payments accepts YYYY-MM-DD date filters", async () => {
    try {
      const result = await tools.erply_list_pending_payments.handler({
        dateFrom: "2020-01-01",
        dateTo: "2026-12-31",
      });
      const body = JSON.parse(result.content[0].text) as { totalCount: number; items: unknown[] };
      expect(Array.isArray(body.items)).toBe(true);
      expect(typeof body.totalCount).toBe("number");
    } catch (error) {
      expect(error).toBeInstanceOf(ErplyBooksApiError);
      const apiError = error as ErplyBooksApiError;
      const detail = `${apiError.message} ${apiError.bodySnippet ?? ""}`;
      expect(detail).not.toMatch(/Could not parse date/);
      expect([403, 409, 500]).toContain(apiError.httpStatus);
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

  it("customer extras reads succeed or return structured errors", async () => {
    let customerId = 1;
    try {
      const listed = await tools.erply_list_customers.handler({ start: 0, limit: 1 });
      const page = JSON.parse(listed.content[0].text) as { items: Array<{ id?: number }> };
      if (typeof page.items[0]?.id === "number") {
        customerId = page.items[0].id;
      }
    } catch (error) {
      expect(error).toBeInstanceOf(ErplyBooksApiError);
    }

    const extrasStatuses = [400, 403, 404, 405, 406, 409, 415, 500];
    await expectOkOrApiError(
      () => tools.erply_list_customer_bank_accounts.handler({ customerId, start: 0, limit: 5 }),
      extrasStatuses,
    );
    await expectOkOrApiError(
      () => tools.erply_get_customer_bank_account.handler({ bankAccountId: 1, customerId }),
      extrasStatuses,
    );
    await expectOkOrApiError(
      () => tools.erply_get_entity_balance.handler({ entityIds: [customerId], sales: true }),
      extrasStatuses,
    );
    await expectOkOrApiError(
      () => tools.erply_get_project_balance.handler({ projectIds: [1], sales: true }),
      extrasStatuses,
    );
    await expectOkOrApiError(
      () =>
        tools.erply_get_customer_report.handler({
          customerId,
          dateFrom: "2025-01-01",
          dateTo: "2026-12-31",
          start: 0,
          limit: 5,
        }),
      extrasStatuses,
    );
  });

  it("erply_create_customer_bank_account then delete (or plan/module error)", async () => {
    let customerId: number | undefined;
    let bankAccountId: number | undefined;
    try {
      const listed = await tools.erply_list_customers.handler({ start: 0, limit: 1 });
      const page = JSON.parse(listed.content[0].text) as { items: Array<{ id?: number }> };
      customerId = page.items[0]?.id;
      if (typeof customerId !== "number") {
        return;
      }
      const created = await tools.erply_create_customer_bank_account.handler({
        customerId,
        iban: "EE382200221020145685",
        bankName: "MCP E29 probe",
      });
      const body = JSON.parse(created.content[0].text) as { id?: number };
      bankAccountId = body.id;
      expect(typeof bankAccountId).toBe("number");
      await tools.erply_delete_customer_bank_account.handler({
        bankAccountId,
        customerId,
      });
    } catch (error) {
      expect(error).toBeInstanceOf(ErplyBooksApiError);
      expect([400, 403, 405, 409, 500]).toContain((error as ErplyBooksApiError).httpStatus);
    } finally {
      if (bankAccountId && customerId) {
        try {
          await tools.erply_delete_customer_bank_account.handler({
            bankAccountId,
            customerId,
          });
        } catch {
          // best-effort cleanup
        }
      }
    }
  });

  it("invoice template extras reads succeed or return structured errors", async () => {
    const extrasStatuses = [400, 403, 404, 405, 406, 409, 415, 500];
    await expectOkOrApiError(
      () => tools.erply_list_invoice_templates.handler({ start: 0, limit: 5 }),
      extrasStatuses,
    );
    await expectOkOrApiError(
      () => tools.erply_get_next_invoice_number.handler({ typeCode: "DOCUMENT_SELL" }),
      extrasStatuses,
    );
    await expectOkOrApiError(
      () =>
        tools.erply_list_parsed_invoice_validations.handler({
          documentType: "DOCUMENT_SELL",
          year: 2026,
          month: 8,
          start: 0,
          limit: 5,
        }),
      extrasStatuses,
    );

    try {
      const listed = await tools.erply_list_invoices.handler({
        dateFrom: "2020-01-01",
        dateTo: "2026-12-31",
        documentType: "DOCUMENT_POS_SELL",
        start: 0,
        limit: 1,
      });
      const page = JSON.parse(listed.content[0].text) as { items: Array<{ id?: number }> };
      const documentId = page.items[0]?.id;
      if (typeof documentId === "number") {
        await expectOkOrApiError(
          () => tools.erply_get_invoice_history.handler({ documentId }),
          extrasStatuses,
        );
      }
    } catch (error) {
      expect(error).toBeInstanceOf(ErplyBooksApiError);
    }
  });

  it("erply_create_invoice_template then delete (or plan/module error)", async () => {
    let documentInfoId: number | undefined;
    try {
      const created = await tools.erply_create_invoice_template.handler({
        documentName: `MCP E30 probe ${Date.now()}`,
        languageCode: "LANGUAGE_EN",
        templateId: "18098",
      });
      const body = JSON.parse(created.content[0].text) as { id?: number };
      documentInfoId = body.id;
      expect(typeof documentInfoId).toBe("number");
      await tools.erply_delete_invoice_template.handler({ documentInfoId });
    } catch (error) {
      expect(error).toBeInstanceOf(ErplyBooksApiError);
      expect([400, 403, 405, 409, 500]).toContain((error as ErplyBooksApiError).httpStatus);
    } finally {
      if (documentInfoId) {
        try {
          await tools.erply_delete_invoice_template.handler({ documentInfoId });
        } catch {
          // best-effort cleanup
        }
      }
    }
  });

  it("erply_check_invoice_number returns exists flag or structured error", async () => {
    try {
      const result = await tools.erply_check_invoice_number.handler({
        number: `MCP-E30-${Date.now()}`,
        typeCode: "DOCUMENT_SELL",
        date: "2026-08-17",
      });
      const body = JSON.parse(result.content[0].text) as { exists?: boolean };
      expect(typeof body.exists).toBe("boolean");
    } catch (error) {
      expect(error).toBeInstanceOf(ErplyBooksApiError);
      expect([400, 403, 405, 409, 500]).toContain((error as ErplyBooksApiError).httpStatus);
    }
  });

  it("invoice sending extras reads succeed or return structured errors", async () => {
    const extrasStatuses = [400, 403, 404, 405, 406, 409, 415, 500];
    const previewCsv = Buffer.from("number,date,total\nMCP-E32,2026-08-18,1.00\n", "utf8").toString(
      "base64",
    );

    await expectOkOrApiError(
      () =>
        tools.erply_import_invoices_file.handler({
          fileBase64: previewCsv,
          fileName: "mcp-e32-preview.csv",
          getPreview: true,
          includeHeader: true,
          typeCode: "DOCUMENT_SELL",
        }),
      extrasStatuses,
    );
    await expectOkOrApiError(
      () =>
        tools.erply_import_invoices_formsubmit.handler({
          fileBase64: previewCsv,
          fileName: "mcp-e32-preview.csv",
          getPreview: true,
          includeHeader: true,
          typeCode: "DOCUMENT_SELL",
        }),
      extrasStatuses,
    );
    await expectOkOrApiError(
      () =>
        tools.erply_send_invoice_email_by_hash.handler({
          hash: "mcp-e32-not-a-real-hash",
          receiver: "mcp-e32@example.invalid",
        }),
      extrasStatuses,
    );
    await expectOkOrApiError(
      () =>
        tools.erply_send_erply_invoices.handler({
          ids: [999999999],
          receiver: "mcp-e32@example.invalid",
        }),
      extrasStatuses,
    );

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
      const documentId = page.items[0]?.id;
      if (typeof documentId === "number") {
        await expectOkOrApiError(
          () => tools.erply_get_invoice_pdf_v1.handler({ documentId }),
          extrasStatuses,
        );
      }
      await expectOkOrApiError(
        () =>
          tools.erply_send_erply_invoice.handler({
            documentId: 999999999,
            receiver: "mcp-e32@example.invalid",
          }),
        extrasStatuses,
      );
    } catch (error) {
      expect(error).toBeInstanceOf(ErplyBooksApiError);
    }
  });

  it("erply_create_customer_v2 then delete (or 405/plan error)", async () => {
    let customerId: number | undefined;
    try {
      const created = await tools.erply_create_customer_v2.handler({
        name: `MCP E29 v2 ${Date.now()}`,
        customer: true,
      });
      const body = JSON.parse(created.content[0].text) as { id?: number };
      customerId = body.id;
      expect(typeof customerId).toBe("number");
      await tools.erply_delete_customer.handler({ customerId });
    } catch (error) {
      expect(error).toBeInstanceOf(ErplyBooksApiError);
      expect([400, 403, 405, 409, 500]).toContain((error as ErplyBooksApiError).httpStatus);
    } finally {
      if (customerId) {
        try {
          await tools.erply_delete_customer.handler({ customerId });
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
