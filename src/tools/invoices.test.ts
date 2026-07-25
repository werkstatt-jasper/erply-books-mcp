import { beforeEach, describe, expect, it, vi } from "vitest";
import invoicesFixture from "../__fixtures__/invoices.json" with { type: "json" };
import { ErplyBooksApiError } from "../api-error.js";
import type { ErplyBooksClient } from "../client.js";
import { createInvoiceTools } from "./invoices.js";
import { createMockClient } from "./test-helpers.js";

describe("erply_list_invoices", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createInvoiceTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createInvoiceTools(client);
  });

  it("requires dateFrom, dateTo, and documentType", async () => {
    await expect(tools.erply_list_invoices.handler({})).rejects.toThrow(
      /dateFrom|dateTo|documentType/,
    );
    await expect(
      tools.erply_list_invoices.handler({
        dateFrom: "2025-01-01",
        dateTo: "2025-12-31",
      }),
    ).rejects.toThrow(/documentType/);
  });

  it("rejects unknown documentType values", async () => {
    await expect(
      tools.erply_list_invoices.handler({
        dateFrom: "2025-01-01",
        dateTo: "2025-12-31",
        documentType: "SALES_INVOICE",
      }),
    ).rejects.toThrow(/documentType/);
  });

  it("passes validated args to GET /invoices", async () => {
    vi.mocked(client.get).mockResolvedValue(invoicesFixture.list_page);
    const result = await tools.erply_list_invoices.handler({
      dateFrom: "2025-01-01",
      dateTo: "2025-12-31",
      documentType: "DOCUMENT_POS_SELL",
      limit: 2,
    });
    expect(client.get).toHaveBeenCalledWith(
      "/invoices",
      expect.objectContaining({
        dateFrom: "2025-01-01",
        dateTo: "2025-12-31",
        documentType: "DOCUMENT_POS_SELL",
        limit: 2,
      }),
    );
    expect(JSON.parse(result.content[0].text).items).toHaveLength(1);
  });
});

describe("erply_get_invoice", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createInvoiceTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createInvoiceTools(client);
  });

  it("requires documentId", async () => {
    await expect(tools.erply_get_invoice.handler({})).rejects.toThrow(/documentId/);
  });

  it("GETs /invoices/{id}", async () => {
    vi.mocked(client.get).mockResolvedValue(invoicesFixture.single);
    const result = await tools.erply_get_invoice.handler({ documentId: 55, lang: "en" });
    expect(client.get).toHaveBeenCalledWith("/invoices/55", { lang: "en" });
    expect(JSON.parse(result.content[0].text).id).toBe(55);
  });
});

describe("erply_create_invoice", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createInvoiceTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createInvoiceTools(client);
  });

  it("requires typeCode, date, and customerId or customer", async () => {
    await expect(tools.erply_create_invoice.handler({})).rejects.toThrow(/typeCode|date/);
    await expect(
      tools.erply_create_invoice.handler({
        typeCode: "DOCUMENT_POS_SELL",
        date: "2025-06-01",
      }),
    ).rejects.toThrow(/customerId|customer/);
  });

  it("POSTs with id: 0 and optional registrationCode query", async () => {
    vi.mocked(client.post).mockResolvedValue(invoicesFixture.create_response);
    const result = await tools.erply_create_invoice.handler({
      typeCode: "DOCUMENT_POS_SELL",
      date: "2025-06-01",
      customerId: 10,
      rows: [{ name: "Item", quantity: 1 }],
      registrationCode: "REG",
    });
    expect(client.post).toHaveBeenCalledWith(
      "/invoices",
      expect.objectContaining({
        id: 0,
        typeCode: "DOCUMENT_POS_SELL",
        date: "2025-06-01",
        customerId: 10,
      }),
      { registrationCode: "REG" },
    );
    expect(JSON.parse(result.content[0].text).id).toBe(55);
  });

  it("accepts nested customer instead of customerId", async () => {
    vi.mocked(client.post).mockResolvedValue(invoicesFixture.create_response);
    await tools.erply_create_invoice.handler({
      typeCode: "DOCUMENT_SELL",
      date: "2025-06-01",
      customer: { name: "Walk-in", id: 0 },
    });
    expect(client.post).toHaveBeenCalledWith(
      "/invoices",
      expect.objectContaining({
        customer: { name: "Walk-in", id: 0 },
      }),
      expect.anything(),
    );
  });

  it("propagates API errors", async () => {
    vi.mocked(client.post).mockRejectedValue(
      new ErplyBooksApiError({
        kind: "http",
        message: "plan",
        httpStatus: 409,
        method: "POST",
        url: "https://api.erplybooks.com/api/invoices",
      }),
    );
    await expect(
      tools.erply_create_invoice.handler({
        typeCode: "DOCUMENT_SELL",
        date: "2025-06-01",
        customerId: 10,
      }),
    ).rejects.toMatchObject({ httpStatus: 409 });
  });
});

describe("erply_update_invoice", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createInvoiceTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createInvoiceTools(client);
  });

  it("requires documentId", async () => {
    await expect(tools.erply_update_invoice.handler({})).rejects.toThrow(/documentId/);
  });

  it("PUTs with query registrationCode", async () => {
    vi.mocked(client.put).mockResolvedValue(invoicesFixture.update_response);
    await tools.erply_update_invoice.handler({
      documentId: 55,
      number: "SI-1b",
      registrationCode: "REG",
    });
    expect(client.put).toHaveBeenCalledWith(
      "/invoices/55",
      expect.objectContaining({ id: 55, number: "SI-1b" }),
      { registrationCode: "REG" },
    );
  });
});

describe("erply_delete_invoice", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createInvoiceTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createInvoiceTools(client);
  });

  it("requires invoiceId", async () => {
    await expect(tools.erply_delete_invoice.handler({})).rejects.toThrow(/invoiceId/);
  });

  it("DELETEs with optional registrationCode", async () => {
    vi.mocked(client.delete).mockResolvedValue(undefined);
    const result = await tools.erply_delete_invoice.handler({
      invoiceId: 55,
      registrationCode: "REG",
    });
    expect(client.delete).toHaveBeenCalledWith("/invoices/55", { registrationCode: "REG" });
    expect(JSON.parse(result.content[0].text)).toEqual({ ok: true });
  });
});
