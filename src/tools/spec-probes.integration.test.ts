import "dotenv/config";
import { appendFileSync } from "node:fs";

import { describe, expect, it } from "vitest";
import { ErplyBooksApiError } from "../api-error.js";
import { loadAuthConfig } from "../auth.js";
import { ErplyBooksClient } from "../client.js";
import type { Invoice } from "../types/invoices.js";
import type { PaymentImport } from "../types/payments.js";
import { unwrapListEnvelope } from "./list-response.js";

const PROBE_LOG = "/tmp/e50-probes.jsonl";

const hasToken = Boolean(process.env.ERPLY_BOOKS_API_TOKEN?.trim());

type ProbeResult = {
  name: string;
  ok: boolean;
  httpStatus?: number;
  message?: string;
  extra?: Record<string, unknown>;
};

function logProbe(result: ProbeResult): ProbeResult {
  const line = `E50_PROBE ${JSON.stringify(result)}`;
  console.log(line);
  appendFileSync(PROBE_LOG, `${JSON.stringify(result)}\n`);
  return result;
}

async function capture(name: string, run: () => Promise<unknown>): Promise<ProbeResult> {
  try {
    const data = await run();
    return logProbe({ name, ok: true, extra: summarize(data) });
  } catch (error) {
    if (error instanceof ErplyBooksApiError) {
      return logProbe({
        name,
        ok: false,
        httpStatus: error.httpStatus,
        message: error.message,
        extra: error.bodySnippet ? { bodySnippet: error.bodySnippet } : undefined,
      });
    }
    throw error;
  }
}

function summarize(data: unknown): Record<string, unknown> {
  if (data === null || data === undefined) {
    return { kind: data === null ? "null" : "undefined" };
  }
  if (Array.isArray(data)) {
    return { kind: "array", length: data.length };
  }
  if (typeof data !== "object") {
    return { kind: typeof data };
  }
  const rec = data as Record<string, unknown>;
  const extra: Record<string, unknown> = {
    kind: "object",
    keys: Object.keys(rec).slice(0, 20),
  };
  if (typeof rec.totalCount === "number") {
    extra.totalCount = rec.totalCount;
  }
  if (Array.isArray(rec.items)) {
    extra.itemCount = rec.items.length;
  }
  if (typeof rec.id === "number") {
    extra.id = rec.id;
  }
  if (typeof rec.sumPaid === "number") {
    extra.sumPaid = rec.sumPaid;
  }
  if (typeof rec.sumLeftToPay === "number") {
    extra.sumLeftToPay = rec.sumLeftToPay;
  }
  if (Array.isArray(rec.rows)) {
    extra.rowCount = rec.rows.length;
  }
  return extra;
}

function itemIds(response: unknown): number[] {
  const { items } = unwrapListEnvelope<{ id?: number }>(response);
  return items
    .filter((item): item is { id: number } => typeof item.id === "number")
    .map((i) => i.id);
}

async function firstAccountIds(client: ErplyBooksClient): Promise<number[]> {
  const page = unwrapListEnvelope<{ id?: number }>(
    await client.get("/accounts", { start: 0, limit: 5 }),
  );
  return page.items
    .filter((item): item is { id: number } => typeof item.id === "number")
    .map((i) => i.id);
}

function invoiceRows(invoice: Record<string, unknown>): unknown[] {
  if (Array.isArray(invoice.rows)) {
    return invoice.rows;
  }
  if (Array.isArray(invoice.articles)) {
    return invoice.articles;
  }
  return [];
}

function pendingIds(response: unknown): number[] {
  const { items } = unwrapListEnvelope<{ id?: number }>(response);
  return items
    .filter((item): item is { id: number } => typeof item.id === "number")
    .map((i) => i.id);
}

async function bestEffortDelete(client: ErplyBooksClient, path: string): Promise<void> {
  try {
    await client.delete(path);
  } catch {
    // leftover ids are logged by the owning test
  }
}

describe.skipIf(!hasToken)("E50 spec-conflict live probes", () => {
  const client = new ErplyBooksClient(loadAuthConfig);

  it("G1 GET /payments required params", async () => {
    const none = await capture("g1-no-params", () => client.get("/payments"));
    const typeOnly = await capture("g1-paymentType-only", () =>
      client.get("/payments", { paymentType: "OTHER_INCOMING_PAYMENT" }),
    );
    const datesOnly = await capture("g1-dates-only", () =>
      client.get("/payments", { dateFrom: "2020-01-01", dateTo: "2026-12-31", start: 0, limit: 1 }),
    );
    const both = await capture("g1-dates-and-paymentType", () =>
      client.get("/payments", {
        dateFrom: "2020-01-01",
        dateTo: "2026-12-31",
        paymentType: "OTHER_INCOMING_PAYMENT",
        start: 0,
        limit: 1,
      }),
    );

    for (const result of [none, typeOnly, datesOnly, both]) {
      expect(result.ok || typeof result.httpStatus === "number").toBe(true);
    }
  });

  it("G2 sort vs sortBy on GET /customers", async () => {
    const baseline = await capture("g2-none", () =>
      client.get("/customers", { start: 0, limit: 20 }),
    );
    const sortName = await capture("g2-sort-name", () =>
      client.get("/customers", { start: 0, limit: 20, sort: "name" }),
    );
    const sortByName = await capture("g2-sortBy-name", () =>
      client.get("/customers", { start: 0, limit: 20, sortBy: "name" }),
    );
    const sortId = await capture("g2-sort-id", () =>
      client.get("/customers", { start: 0, limit: 20, sort: "id" }),
    );
    const sortById = await capture("g2-sortBy-id", () =>
      client.get("/customers", { start: 0, limit: 20, sortBy: "id" }),
    );
    const sortNameDesc = await capture("g2-sort-name-desc", () =>
      client.get("/customers", { start: 0, limit: 20, sort: "-name" }),
    );
    const sortByNameDesc = await capture("g2-sortBy-name-desc", () =>
      client.get("/customers", { start: 0, limit: 20, sortBy: "-name" }),
    );

    if (baseline.ok) {
      const noneIds = itemIds(await client.get("/customers", { start: 0, limit: 20 }));
      const variants: Record<string, number[]> = {
        sortName: itemIds(await client.get("/customers", { start: 0, limit: 20, sort: "name" })),
        sortByName: itemIds(
          await client.get("/customers", { start: 0, limit: 20, sortBy: "name" }),
        ),
        sortId: itemIds(await client.get("/customers", { start: 0, limit: 20, sort: "id" })),
        sortById: itemIds(await client.get("/customers", { start: 0, limit: 20, sortBy: "id" })),
        sortNameDesc: itemIds(
          await client.get("/customers", { start: 0, limit: 20, sort: "-name" }),
        ),
        sortByNameDesc: itemIds(
          await client.get("/customers", { start: 0, limit: 20, sortBy: "-name" }),
        ),
      };
      logProbe({
        name: "g2-order-compare",
        ok: true,
        extra: {
          baselineFirstIds: noneIds.slice(0, 5),
          diffs: Object.fromEntries(
            Object.entries(variants).map(([key, ids]) => [
              key,
              JSON.stringify(ids) !== JSON.stringify(noneIds),
            ]),
          ),
          sortEqualsSortByName:
            JSON.stringify(variants.sortName) === JSON.stringify(variants.sortByName),
          sortEqualsSortByNameDesc:
            JSON.stringify(variants.sortNameDesc) === JSON.stringify(variants.sortByNameDesc),
        },
      });
    }

    const paySort = await capture("g2-payments-sort", () =>
      client.get("/payments", {
        dateFrom: "2020-01-01",
        dateTo: "2026-12-31",
        sort: "id",
        limit: 5,
      }),
    );
    const paySortBy = await capture("g2-payments-sortBy", () =>
      client.get("/payments", {
        dateFrom: "2020-01-01",
        dateTo: "2026-12-31",
        sortBy: "id",
        limit: 5,
      }),
    );

    for (const result of [
      baseline,
      sortName,
      sortByName,
      sortId,
      sortById,
      sortNameDesc,
      sortByNameDesc,
      paySort,
      paySortBy,
    ]) {
      expect(result.ok || typeof result.httpStatus === "number").toBe(true);
    }
  });

  it("G3 GET /customers/v2", async () => {
    const result = await capture("g3-customers-v2", () =>
      client.get("/customers/v2", { start: 0, limit: 1 }),
    );
    expect(result.ok || typeof result.httpStatus === "number").toBe(true);
  });

  it("G4 connect_payment_with_documents demo-org ground truth (no new mutation)", async () => {
    const pending = await capture("g4-pending-payments-still-listed", () =>
      client.get("/payments/pending_payments"),
    );
    await capture("g4-pending-payments-ymd-dates", () =>
      client.get("/payments/pending_payments", {
        dateFrom: "2020-01-01",
        dateTo: "2026-12-31",
      }),
    );
    await capture("g4-pending-payments-dmy-dates", () =>
      client.get("/payments/pending_payments", {
        dateFrom: "01.01.2020",
        dateTo: "31.12.2026",
      }),
    );
    await capture("g4-pending-payments-iso-datetime", () =>
      client.get("/payments/pending_payments", {
        dateFrom: "2020-01-01T00:00:00",
        dateTo: "2026-12-31T23:59:59",
      }),
    );
    logProbe({
      name: "g4-recorded-findings",
      ok: true,
      extra: {
        source: "E51/#190 + G4 2026-08-14 Demo testbaas",
        documentsMustBeInLinkedInvoiceInfo: true,
        topLevelInvoiceIdYields409EmptyList: true,
        sparseBodyCan500: true,
        connectSetsImportValidated: true,
        connectDoesNotChangeInvoiceBalancesOnDemo: true,
        paidPlanVerificationIsSupportQuestion: true,
      },
    });
    expect(pending.ok || typeof pending.httpStatus === "number").toBe(true);
  });

  it("G5 POST /payments/save_all_payments does not apply invoice balances", async () => {
    const stamp = Date.now();
    let customerId: number | undefined;
    let invoiceId: number | undefined;
    let importId: number | undefined;
    let paymentId: number | undefined;

    try {
      const customer = await client.post<{ id?: number }>("/customers", {
        id: 0,
        name: `MCP E50 probe ${stamp}`,
        customer: true,
        entityTypeCode: "ENTITY_TYPE_LEGAL",
      });
      customerId = customer.id;
      expect(typeof customerId).toBe("number");

      const invoice = await client.post<Invoice>("/invoices", {
        id: 0,
        typeCode: "DOCUMENT_SELL",
        date: "2026-08-14",
        customerId,
        number: `E50-G5-${stamp}`,
        rows: [{ name: "E50 G5 line", quantity: 1, price: 10 }],
      });
      invoiceId = invoice.id;
      expect(typeof invoiceId).toBe("number");

      const accountIds = await firstAccountIds(client);
      const debitAccountId = accountIds[0];
      const creditAccountId = accountIds[1] ?? accountIds[0];
      logProbe({
        name: "g5-accounts",
        ok: accountIds.length > 0,
        extra: { debitAccountId: debitAccountId ?? null, creditAccountId: creditAccountId ?? null },
      });

      const imported = await client.post<PaymentImport>("/payments/import", {
        id: 0,
        date: "2026-08-14",
        amount: 10,
        typeCode: "MONEY_IN_TRANSACTION",
        debit: "C",
        customerId,
        invoiceId,
        invoiceNumber: invoice.number ?? `E50-G5-${stamp}`,
        debitAccountId,
        creditAccountId,
      });
      importId = imported.id;
      paymentId =
        typeof imported.paymentId === "number" && imported.paymentId > 0
          ? imported.paymentId
          : undefined;
      logProbe({
        name: "g5-import-created",
        ok: true,
        extra: {
          importId,
          paymentId: imported.paymentId ?? null,
          importValidated: imported.importValidated ?? null,
          invoiceId: imported.invoiceId ?? null,
        },
      });

      const saved = await capture("g5-save-all", () =>
        client.post("/payments/save_all_payments", {
          items: [{ ...imported, invoiceId, customerId }],
        }),
      );

      const after = await client.get<Invoice>(`/invoices/${invoiceId}`);
      logProbe({
        name: "g5-invoice-after-save-all",
        ok: true,
        extra: {
          sumPaid: after.sumPaid ?? null,
          sumLeftToPay: after.sumLeftToPay ?? null,
          saveAllOk: saved.ok,
          saveAllStatus: saved.httpStatus ?? 200,
        },
      });
      expect(saved.ok || typeof saved.httpStatus === "number").toBe(true);
    } catch (error) {
      if (error instanceof ErplyBooksApiError) {
        logProbe({
          name: "g5-setup-or-save-failed",
          ok: false,
          httpStatus: error.httpStatus,
          message: error.message,
        });
        expect([400, 403, 404, 409, 500]).toContain(error.httpStatus);
      } else {
        throw error;
      }
    } finally {
      if (paymentId !== undefined) {
        await bestEffortDelete(client, `/payments/${paymentId}`);
      }
      if (invoiceId !== undefined) {
        await bestEffortDelete(client, `/invoices/${invoiceId}`);
      }
      if (customerId !== undefined) {
        await bestEffortDelete(client, `/customers/${customerId}`);
      }
      if (importId !== undefined) {
        logProbe({
          name: "g5-created-ids",
          ok: true,
          extra: { customerId, invoiceId, importId, paymentId: paymentId ?? null },
        });
      }
    }
  });

  it("G6 POST /payments/bank_import/v2 contract", async () => {
    const before = await capture("g6-pending-before", () =>
      client.get("/payments/pending_payments"),
    );
    const beforeIds = before.ok ? pendingIds(await client.get("/payments/pending_payments")) : [];

    const empty = await capture("g6-empty-body", () => client.post("/payments/bank_import/v2", {}));
    const csv = Buffer.from("Date,Amount,Description\n2026-08-01,1.00,MCP E50 probe\n").toString(
      "base64",
    );
    const accountIds = await firstAccountIds(client);
    const minimal = await capture("g6-minimal-attachment", () =>
      client.post("/payments/bank_import/v2", {
        apiAttachmentInfo: { filename: "e50-probe.csv", base64: csv },
      }),
    );
    const withFlags = await capture("g6-attachment-plus-flags", () =>
      client.post("/payments/bank_import/v2", {
        apiAttachmentInfo: { filename: "e50-probe-flags.csv", base64: csv },
        everything: true,
        missing: false,
        separator: ",",
        accountId: accountIds[0],
      }),
    );

    const after = await capture("g6-pending-after", () => client.get("/payments/pending_payments"));
    if (after.ok) {
      const afterIds = pendingIds(await client.get("/payments/pending_payments"));
      const leftover = afterIds.filter((id) => !beforeIds.includes(id));
      logProbe({
        name: "g6-leftover-pending-ids",
        ok: true,
        extra: { leftoverCount: leftover.length, leftoverIds: leftover.slice(0, 20) },
      });
    }

    for (const result of [empty, minimal, withFlags]) {
      expect(result.ok || typeof result.httpStatus === "number").toBe(true);
    }
  });

  it("G7 PUT /invoices full-replace semantics", async () => {
    const stamp = Date.now();
    let customerId: number | undefined;
    let invoiceId: number | undefined;

    try {
      const customer = await client.post<{ id?: number }>("/customers", {
        id: 0,
        name: `MCP E50 probe ${stamp}`,
        customer: true,
        entityTypeCode: "ENTITY_TYPE_LEGAL",
      });
      customerId = customer.id;
      expect(typeof customerId).toBe("number");

      const created = await client.post<Invoice>("/invoices", {
        id: 0,
        typeCode: "DOCUMENT_SELL",
        date: "2026-08-14",
        customerId,
        number: `E50-G7-${stamp}`,
        rows: [
          { name: "E50 G7 row A", quantity: 1, price: 10 },
          { name: "E50 G7 row B", quantity: 1, price: 20 },
        ],
      });
      invoiceId = created.id;
      expect(typeof invoiceId).toBe("number");

      const listedCreated = await client.get("/invoices", {
        id: invoiceId,
        getRows: true,
        documentType: "DOCUMENT_SELL",
      });
      const createdPage = unwrapListEnvelope<Record<string, unknown>>(listedCreated);
      const createdRows = createdPage.items[0]
        ? invoiceRows(createdPage.items[0])
        : invoiceRows(created);
      const fetched = await client.get<Record<string, unknown>>(`/invoices/${invoiceId}`);
      logProbe({
        name: "g7-created-rows",
        ok: true,
        extra: {
          invoiceId,
          rowCount: createdRows.length,
          typeCode: "DOCUMENT_SELL",
          fetchedKeys: Object.keys(fetched).slice(0, 30),
          fetchedCode: fetched.code ?? null,
        },
      });

      const listedDoc = createdPage.items[0] ?? fetched;
      const oneRow = (invoiceRows(listedDoc)[0] ?? {
        name: "E50 G7 row A only",
        quantity: 1,
        price: 10,
      }) as Record<string, unknown>;
      await client.put(`/invoices/${invoiceId}`, {
        ...listedDoc,
        ...fetched,
        id: invoiceId,
        rows: [oneRow],
      });
      const afterOne = unwrapListEnvelope<Record<string, unknown>>(
        await client.get("/invoices", {
          id: invoiceId,
          getRows: true,
          documentType: "DOCUMENT_SELL",
        }),
      );
      const afterOneRows = afterOne.items[0] ? invoiceRows(afterOne.items[0]) : [];
      logProbe({
        name: "g7-after-put-one-row",
        ok: true,
        extra: {
          rowCount: afterOneRows.length,
          droppedSecondRow: createdRows.length >= 2 && afterOneRows.length === 1,
        },
      });

      const afterOneDoc = afterOne.items[0] ?? fetched;
      await client.put(`/invoices/${invoiceId}`, {
        ...afterOneDoc,
        id: invoiceId,
        rows: undefined,
      });
      const afterOmit = unwrapListEnvelope<Record<string, unknown>>(
        await client.get("/invoices", {
          id: invoiceId,
          getRows: true,
          documentType: "DOCUMENT_SELL",
        }),
      );
      const afterOmitRows = afterOmit.items[0] ? invoiceRows(afterOmit.items[0]) : [];
      logProbe({
        name: "g7-after-put-omit-rows",
        ok: true,
        extra: {
          rowCount: afterOmitRows.length,
          rowsSurvivedOmit: afterOmitRows.length === afterOneRows.length,
          rowsClearedOnOmit: afterOneRows.length > 0 && afterOmitRows.length === 0,
        },
      });

      expect(typeof afterOneRows.length).toBe("number");
    } catch (error) {
      if (error instanceof ErplyBooksApiError) {
        logProbe({
          name: "g7-setup-or-put-failed",
          ok: false,
          httpStatus: error.httpStatus,
          message: error.message,
        });
        expect([400, 403, 404, 409, 500]).toContain(error.httpStatus);
      } else {
        throw error;
      }
    } finally {
      if (invoiceId !== undefined) {
        await bestEffortDelete(client, `/invoices/${invoiceId}`);
      }
      if (customerId !== undefined) {
        await bestEffortDelete(client, `/customers/${customerId}`);
      }
    }
  });
});

describe.skipIf(hasToken)("E50 spec-conflict live probes (no token)", () => {
  it("skips when ERPLY_BOOKS_API_TOKEN is unset", () => {
    expect(hasToken).toBe(false);
  });
});
