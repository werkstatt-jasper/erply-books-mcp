import { beforeEach, describe, expect, it, vi } from "vitest";
import attachmentsFixture from "../__fixtures__/attachments.json" with { type: "json" };
import paymentsFixture from "../__fixtures__/payments.json" with { type: "json" };
import type { ErplyBooksClient } from "../client.js";
import { __test__, createPaymentBankTools } from "./payments-bank.js";
import { createMockClient } from "./test-helpers.js";

describe("erply_import_payment", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createPaymentBankTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createPaymentBankTools(client);
  });

  it("requires date, amount, and typeCode", async () => {
    await expect(tools.erply_import_payment.handler({})).rejects.toThrow(/date|amount|typeCode/);
  });

  it("POSTs with id: 0", async () => {
    vi.mocked(client.post).mockResolvedValue(paymentsFixture.import_response);
    const result = await tools.erply_import_payment.handler({
      date: "2022-05-30T12:00:00",
      amount: 500,
      typeCode: "MONEY_OUT_TRANSACTION",
      customerId: 8543983,
      debit: "C",
    });
    expect(client.post).toHaveBeenCalledWith(
      "/payments/import",
      expect.objectContaining({
        id: 0,
        date: "2022-05-30T12:00:00",
        amount: 500,
        typeCode: "MONEY_OUT_TRANSACTION",
        customerId: 8543983,
        debit: "C",
      }),
    );
    expect(JSON.parse(result.content[0].text).id).toBe(501);
  });
});

describe("erply_save_all_payment_imports", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createPaymentBankTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createPaymentBankTools(client);
  });

  it("requires non-empty items", async () => {
    await expect(tools.erply_save_all_payment_imports.handler({ items: [] })).rejects.toThrow(
      /items/,
    );
  });

  it("POSTs items envelope", async () => {
    vi.mocked(client.post).mockResolvedValue(paymentsFixture.save_all_response);
    await tools.erply_save_all_payment_imports.handler({
      items: [{ id: 501, amount: 500 }],
    });
    expect(client.post).toHaveBeenCalledWith("/payments/save_all_payments", {
      items: [{ id: 501, amount: 500 }],
    });
  });
});

describe("erply_connect_payment_with_documents", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createPaymentBankTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createPaymentBankTools(client);
  });

  it("requires a payment identifier and a document identifier", async () => {
    await expect(tools.erply_connect_payment_with_documents.handler({})).rejects.toThrow(
      /id, paymentId, or pendingPaymentId/,
    );
    await expect(
      tools.erply_connect_payment_with_documents.handler({ paymentId: 77 }),
    ).rejects.toThrow(/linkedInvoiceInfo, invoiceId, or invoiceNumber/);
  });

  it("maps invoiceId and amount into linkedInvoiceInfo", async () => {
    vi.mocked(client.post).mockResolvedValue(paymentsFixture.connect_response);
    await tools.erply_connect_payment_with_documents.handler({
      paymentId: 77,
      invoiceId: 100,
      amount: 50,
    });
    expect(client.post).toHaveBeenCalledWith("/payments/connect_payment_with_documents", {
      paymentId: 77,
      amount: 50,
      linkedInvoiceInfo: [{ invoiceId: 100, sumPaid: 50 }],
    });
  });

  it("maps invoiceId without amount (no sumPaid)", async () => {
    vi.mocked(client.post).mockResolvedValue(paymentsFixture.connect_response);
    await tools.erply_connect_payment_with_documents.handler({
      paymentId: 77,
      invoiceId: 100,
    });
    expect(client.post).toHaveBeenCalledWith("/payments/connect_payment_with_documents", {
      paymentId: 77,
      linkedInvoiceInfo: [{ invoiceId: 100 }],
    });
  });

  it("maps invoiceNumber into linkedInvoiceInfo.number", async () => {
    vi.mocked(client.post).mockResolvedValue(paymentsFixture.connect_response);
    await tools.erply_connect_payment_with_documents.handler({
      id: 120066906,
      invoiceNumber: "WT324639",
    });
    expect(client.post).toHaveBeenCalledWith("/payments/connect_payment_with_documents", {
      id: 120066906,
      linkedInvoiceInfo: [{ number: "WT324639" }],
    });
  });

  it("maps invoiceNumber and amount into linkedInvoiceInfo", async () => {
    vi.mocked(client.post).mockResolvedValue(paymentsFixture.connect_response);
    await tools.erply_connect_payment_with_documents.handler({
      id: 120066906,
      invoiceNumber: "WT324639",
      amount: 40,
    });
    expect(client.post).toHaveBeenCalledWith("/payments/connect_payment_with_documents", {
      id: 120066906,
      amount: 40,
      linkedInvoiceInfo: [{ number: "WT324639", sumPaid: 40 }],
    });
  });

  it("forwards caller-supplied linkedInvoiceInfo and strips top-level invoiceId", async () => {
    vi.mocked(client.post).mockResolvedValue(paymentsFixture.connect_response);
    await tools.erply_connect_payment_with_documents.handler({
      id: 120066911,
      paymentId: 12198913,
      amount: 500,
      invoiceId: 82579018,
      linkedInvoiceInfo: [{ invoiceId: 82579018, sumPaid: 500 }],
    });
    expect(client.post).toHaveBeenCalledWith("/payments/connect_payment_with_documents", {
      id: 120066911,
      paymentId: 12198913,
      amount: 500,
      linkedInvoiceInfo: [{ invoiceId: 82579018, sumPaid: 500 }],
    });
  });

  it("accepts linkedInvoiceInfo without invoiceId or invoiceNumber", async () => {
    vi.mocked(client.post).mockResolvedValue(paymentsFixture.connect_response);
    await tools.erply_connect_payment_with_documents.handler({
      id: 9,
      linkedInvoiceInfo: [{ invoiceId: 11, sumPaid: 25 }],
    });
    expect(client.post).toHaveBeenCalledWith("/payments/connect_payment_with_documents", {
      id: 9,
      linkedInvoiceInfo: [{ invoiceId: 11, sumPaid: 25 }],
    });
  });

  it("rejects an empty linkedInvoiceInfo without invoiceId or invoiceNumber", async () => {
    await expect(
      tools.erply_connect_payment_with_documents.handler({
        paymentId: 77,
        linkedInvoiceInfo: [],
      }),
    ).rejects.toThrow(/linkedInvoiceInfo, invoiceId, or invoiceNumber/);
  });
});

describe("erply_list_pending_payments", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createPaymentBankTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createPaymentBankTools(client);
  });

  it("describes the unmatched bank-import feed", () => {
    expect(tools.erply_list_pending_payments.description).toMatch(/unmatched bank-import/);
    expect(tools.erply_list_pending_payments.description).toMatch(
      /GET \/payments\/import does not exist/,
    );
    expect(tools.erply_list_pending_payments.description).toMatch(/YYYY-MM-DD coerced/);
    expect(tools.erply_list_pending_payments.inputSchema.properties.dateFrom.description).toMatch(
      /T00:00:00/,
    );
    expect(tools.erply_list_pending_payments.inputSchema.properties.dateTo.description).toMatch(
      /T23:59:59/,
    );
  });

  it("GETs pending payments and coerces YYYY-MM-DD dateFrom", async () => {
    vi.mocked(client.get).mockResolvedValue(paymentsFixture.pending_page);
    const result = await tools.erply_list_pending_payments.handler({
      dateFrom: "2025-01-01",
      accountId: 42,
    });
    expect(client.get).toHaveBeenCalledWith(
      "/payments/pending_payments",
      expect.objectContaining({ dateFrom: "2025-01-01T00:00:00", accountId: 42 }),
    );
    expect(JSON.parse(result.content[0].text).totalCount).toBe(1);
  });

  it("coerces YYYY-MM-DD dateTo to end-of-day ISO datetime", async () => {
    vi.mocked(client.get).mockResolvedValue(paymentsFixture.pending_page);
    await tools.erply_list_pending_payments.handler({
      dateFrom: "2025-01-01",
      dateTo: "2025-12-31",
    });
    expect(client.get).toHaveBeenCalledWith("/payments/pending_payments", {
      dateFrom: "2025-01-01T00:00:00",
      dateTo: "2025-12-31T23:59:59",
      status: undefined,
      accountId: undefined,
      paymentId: undefined,
    });
  });

  it("passes ISO datetimes through unchanged", async () => {
    vi.mocked(client.get).mockResolvedValue(paymentsFixture.pending_page);
    await tools.erply_list_pending_payments.handler({
      dateFrom: "2020-01-01T00:00:00",
      dateTo: "2026-12-31T23:59:59",
    });
    expect(client.get).toHaveBeenCalledWith(
      "/payments/pending_payments",
      expect.objectContaining({
        dateFrom: "2020-01-01T00:00:00",
        dateTo: "2026-12-31T23:59:59",
      }),
    );
  });

  it("omits date filters when they are not provided", async () => {
    vi.mocked(client.get).mockResolvedValue(paymentsFixture.pending_page);
    await tools.erply_list_pending_payments.handler({});
    expect(client.get).toHaveBeenCalledWith("/payments/pending_payments", {
      dateFrom: undefined,
      dateTo: undefined,
      status: undefined,
      accountId: undefined,
      paymentId: undefined,
    });
  });
});

describe("erply_settle_prepayments", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createPaymentBankTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createPaymentBankTools(client);
  });

  it("requires paymentId, paymentId2, or ids", async () => {
    await expect(tools.erply_settle_prepayments.handler({})).rejects.toThrow(
      /paymentId, paymentId2, or ids/,
    );
  });

  it("POSTs with query params", async () => {
    vi.mocked(client.post).mockResolvedValue({ ok: true });
    await tools.erply_settle_prepayments.handler({ paymentId: 1, paymentId2: 2 });
    expect(client.post).toHaveBeenCalledWith("/payments/settle_prepayments", undefined, {
      paymentId: 1,
      paymentId2: 2,
      ids: undefined,
    });
  });

  it("accepts ids alone", async () => {
    vi.mocked(client.post).mockResolvedValue({ ok: true });
    await tools.erply_settle_prepayments.handler({ ids: "1,2,3" });
    expect(client.post).toHaveBeenCalledWith(
      "/payments/settle_prepayments",
      undefined,
      expect.objectContaining({ ids: "1,2,3" }),
    );
  });
});

describe("erply_sepa_payments", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createPaymentBankTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createPaymentBankTools(client);
  });

  it("POSTs to json_format endpoint", async () => {
    vi.mocked(client.post).mockResolvedValue(paymentsFixture.sepa_response);
    await tools.erply_sepa_payments.handler({
      bankAccountId: 42,
      invoiceIds: "10,11",
    });
    expect(client.post).toHaveBeenCalledWith(
      "/payments/sepa_payments/json_format",
      expect.objectContaining({ bankAccountId: 42, invoiceIds: "10,11" }),
    );
  });
});

describe("erply_bank_import", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createPaymentBankTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createPaymentBankTools(client);
  });

  it("requires fileBase64 and fileName", async () => {
    await expect(tools.erply_bank_import.handler({})).rejects.toThrow(/fileBase64|fileName/);
  });

  it("posts multipart with query options", async () => {
    vi.mocked(client.postMultipart).mockResolvedValue(paymentsFixture.bank_import_response);
    const fileBase64 = Buffer.from("a,b\n1,2\n", "utf8").toString("base64");
    const result = await tools.erply_bank_import.handler({
      fileBase64,
      fileName: "stmt.csv",
      accountId: 42,
      encoding: "UTF-8",
    });
    expect(client.postMultipart).toHaveBeenCalledWith(
      "/payments/bank_import",
      expect.any(FormData),
      expect.objectContaining({ accountId: 42, encoding: "UTF-8" }),
    );
    const form = vi.mocked(client.postMultipart).mock.calls[0][1] as FormData;
    expect(form.get("file")).toBeTruthy();
    expect(JSON.parse(result.content[0].text).imported).toBe(true);
  });
});

describe("erply_bank_import_v2", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createPaymentBankTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createPaymentBankTools(client);
  });

  it("rejects when neither file nor attachmentId is provided", async () => {
    await expect(tools.erply_bank_import_v2.handler({})).rejects.toThrow(
      /fileBase64\+fileName|attachmentId/,
    );
  });

  it("rejects when only fileBase64 is provided", async () => {
    await expect(tools.erply_bank_import_v2.handler({ fileBase64: "dGVzdA==" })).rejects.toThrow(
      /fileBase64|fileName|attachmentId/,
    );
  });

  it("rejects when both file and attachmentId are provided", async () => {
    const fileBase64 = Buffer.from("a,b\n1,2\n", "utf8").toString("base64");
    await expect(
      tools.erply_bank_import_v2.handler({
        fileBase64,
        fileName: "stmt.csv",
        attachmentId: 101,
      }),
    ).rejects.toThrow(/not both/);
  });

  it("POSTs JSON with nested file attachment and mapped option fields", async () => {
    vi.mocked(client.post).mockResolvedValue(attachmentsFixture.bank_import_v2_response);
    const fileBase64 = Buffer.from("a,b\n1,2\n", "utf8").toString("base64");
    const result = await tools.erply_bank_import_v2.handler({
      fileBase64,
      fileName: "stmt.csv",
      accountId: 42,
      getEverything: true,
      getMissing: true,
      separatorField: ";",
    });
    expect(client.post).toHaveBeenCalledWith(
      "/payments/bank_import/v2",
      expect.objectContaining({
        apiAttachmentInfo: { filename: "stmt.csv", base64: fileBase64 },
        accountId: 42,
        everything: true,
        missing: true,
        separator: ";",
      }),
    );
    expect(JSON.parse(result.content[0].text).imported).toBe(true);
  });

  it("POSTs JSON with attachmentId reference", async () => {
    vi.mocked(client.post).mockResolvedValue(attachmentsFixture.bank_import_v2_response);
    await tools.erply_bank_import_v2.handler({
      attachmentId: 101,
      encoding: "UTF-8",
    });
    expect(client.post).toHaveBeenCalledWith(
      "/payments/bank_import/v2",
      expect.objectContaining({
        apiAttachmentInfo: { attachmentId: 101 },
        encoding: "UTF-8",
      }),
    );
  });

  it("bankImportV2Body maps option fields", () => {
    const body = __test__.bankImportV2Body({
      attachmentId: 9,
      getEverything: false,
      getMissing: false,
      separatorField: ",",
    });
    expect(body).toEqual(
      expect.objectContaining({
        apiAttachmentInfo: { attachmentId: 9 },
        everything: false,
        missing: false,
        separator: ",",
      }),
    );
  });
});
