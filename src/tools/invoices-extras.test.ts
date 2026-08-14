import { beforeEach, describe, expect, it, vi } from "vitest";
import extrasFixture from "../__fixtures__/invoices-extras.json" with { type: "json" };
import type { ErplyBooksClient } from "../client.js";
import { __test__, createInvoiceExtraTools } from "./invoices-extras.js";
import { createMockClient } from "./test-helpers.js";

describe("toIdsString", () => {
  it("joins number arrays and passes strings through", () => {
    expect(__test__.toIdsString([55, 56])).toBe("55,56");
    expect(__test__.toIdsString("55,56")).toBe("55,56");
  });
});

describe("erply_get_invoice_pdf", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createInvoiceExtraTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createInvoiceExtraTools(client);
  });

  it("requires documentId", async () => {
    await expect(tools.erply_get_invoice_pdf.handler({})).rejects.toThrow(/documentId/);
  });

  it("GETs /invoices/pdf/v2/{documentId}", async () => {
    vi.mocked(client.get).mockResolvedValue(extrasFixture.pdf_v2);
    const result = await tools.erply_get_invoice_pdf.handler({
      documentId: 55,
      template: "DEFAULT",
    });
    expect(client.get).toHaveBeenCalledWith("/invoices/pdf/v2/55", {
      template: "DEFAULT",
      hash: undefined,
    });
    expect(JSON.parse(result.content[0].text).fileName).toBe("invoice-55.pdf");
  });
});

describe("erply_send_invoice_email", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createInvoiceExtraTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createInvoiceExtraTools(client);
  });

  it("requires documentId and receiver", async () => {
    await expect(tools.erply_send_invoice_email.handler({})).rejects.toThrow(/documentId|receiver/);
  });

  it("POSTs email body with documentId query", async () => {
    vi.mocked(client.post).mockResolvedValue(extrasFixture.email_response);
    await tools.erply_send_invoice_email.handler({
      documentId: 55,
      receiver: "billing@example.com",
      subject: "Invoice",
    });
    expect(client.post).toHaveBeenCalledWith(
      "/invoices/email/simple",
      expect.objectContaining({
        receiver: "billing@example.com",
        subject: "Invoice",
      }),
      { documentId: 55 },
    );
  });
});

describe("erply_get_einvoice", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createInvoiceExtraTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createInvoiceExtraTools(client);
  });

  it("requires documentIds", async () => {
    await expect(tools.erply_get_einvoice.handler({})).rejects.toThrow(/documentIds/);
  });

  it("GETs with joined documentIds", async () => {
    vi.mocked(client.get).mockResolvedValue(extrasFixture.einvoice);
    await tools.erply_get_einvoice.handler({ documentIds: [55, 56] });
    expect(client.get).toHaveBeenCalledWith("/invoices/einvoice", { documentIds: "55,56" });
  });
});

describe("erply_send_einvoices", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createInvoiceExtraTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createInvoiceExtraTools(client);
  });

  it("POSTs with documentIds query", async () => {
    vi.mocked(client.post).mockResolvedValue(extrasFixture.send_einvoices_response);
    await tools.erply_send_einvoices.handler({
      documentIds: "55",
      sendPDF: true,
    });
    expect(client.post).toHaveBeenCalledWith("/invoices/send_einvoices", undefined, {
      documentIds: "55",
      partnerType: undefined,
      sendPDF: true,
    });
  });
});

describe("erply_confirm_invoices", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createInvoiceExtraTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createInvoiceExtraTools(client);
  });

  it("requires ids", async () => {
    await expect(tools.erply_confirm_invoices.handler({})).rejects.toThrow(/ids/);
  });

  it("POSTs bodyless with ids query and defaults STATUS_CONFIRMED", async () => {
    vi.mocked(client.post).mockResolvedValue(extrasFixture.confirm_response);
    await tools.erply_confirm_invoices.handler({
      ids: [55, 56],
      useTransactionLockIfNecessary: true,
    });
    expect(client.post).toHaveBeenCalledWith("/invoices/confirm_invoices", undefined, {
      ids: "55,56",
      documentStatusTypeCode: "STATUS_CONFIRMED",
      useTransactionLockIfNecessary: true,
    });
  });

  it("forwards an explicit documentStatusTypeCode", async () => {
    vi.mocked(client.post).mockResolvedValue(extrasFixture.confirm_response);
    await tools.erply_confirm_invoices.handler({
      ids: "55",
      documentStatusTypeCode: "STATUS_PENDING",
    });
    expect(client.post).toHaveBeenCalledWith("/invoices/confirm_invoices", undefined, {
      ids: "55",
      documentStatusTypeCode: "STATUS_PENDING",
      useTransactionLockIfNecessary: undefined,
    });
  });

  it("rejects attachmentId", async () => {
    await expect(
      tools.erply_confirm_invoices.handler({ ids: [55], attachmentId: 49873 }),
    ).rejects.toThrow(/Unrecognized key|attachmentId/);
  });

  it("describes the STATUS_CONFIRMED default and rejected attachmentId", () => {
    expect(tools.erply_confirm_invoices.description).toMatch(/defaults to STATUS_CONFIRMED/);
    expect(tools.erply_confirm_invoices.description).toMatch(/attachmentId is not supported/);
  });
});

describe("erply_list_partner_invoices", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createInvoiceExtraTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createInvoiceExtraTools(client);
  });

  it("requires dateFrom and dateTo", async () => {
    await expect(tools.erply_list_partner_invoices.handler({})).rejects.toThrow(/dateFrom|dateTo/);
  });

  it("GETs /invoices/partner and unwraps list", async () => {
    vi.mocked(client.get).mockResolvedValue(extrasFixture.partner_list_page);
    const result = await tools.erply_list_partner_invoices.handler({
      dateFrom: "2025-01-01",
      dateTo: "2025-12-31",
      documentType: "DOCUMENT_SELL",
    });
    expect(client.get).toHaveBeenCalledWith(
      "/invoices/partner",
      expect.objectContaining({
        dateFrom: "2025-01-01",
        dateTo: "2025-12-31",
        documentType: "DOCUMENT_SELL",
      }),
    );
    expect(JSON.parse(result.content[0].text).totalCount).toBe(1);
  });
});

describe("erply_create_partner_invoice", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createInvoiceExtraTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createInvoiceExtraTools(client);
  });

  it("requires customerId or customer", async () => {
    await expect(
      tools.erply_create_partner_invoice.handler({
        typeCode: "DOCUMENT_SELL",
        date: "2025-06-02",
      }),
    ).rejects.toThrow(/customerId or customer/);
  });

  it("POSTs with id: 0", async () => {
    vi.mocked(client.post).mockResolvedValue(extrasFixture.partner_create_response);
    await tools.erply_create_partner_invoice.handler({
      typeCode: "DOCUMENT_SELL",
      date: "2025-06-02",
      customerId: 10,
      partnerDocumentId: "P-2",
    });
    expect(client.post).toHaveBeenCalledWith(
      "/invoices/partner",
      expect.objectContaining({
        id: 0,
        typeCode: "DOCUMENT_SELL",
        customerId: 10,
        partnerDocumentId: "P-2",
      }),
      { registrationCode: undefined },
    );
  });
});

describe("erply_create_recurring_invoice", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createInvoiceExtraTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createInvoiceExtraTools(client);
  });

  it("requires copyFromDocumentId", async () => {
    await expect(tools.erply_create_recurring_invoice.handler({})).rejects.toThrow(
      /copyFromDocumentId/,
    );
  });

  it("POSTs /invoices/recurring", async () => {
    vi.mocked(client.post).mockResolvedValue(extrasFixture.recurring_create_response);
    await tools.erply_create_recurring_invoice.handler({
      copyFromDocumentId: 55,
      dayOfMonth: 1,
      enabled: true,
    });
    expect(client.post).toHaveBeenCalledWith(
      "/invoices/recurring",
      expect.objectContaining({
        copyFromDocumentId: 55,
        dayOfMonth: 1,
        enabled: true,
      }),
      { registrationCode: undefined },
    );
  });
});

describe("erply_update_recurring_invoice", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createInvoiceExtraTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createInvoiceExtraTools(client);
  });

  it("requires documentId", async () => {
    await expect(tools.erply_update_recurring_invoice.handler({})).rejects.toThrow(/documentId/);
  });

  it("PUTs /invoices/recurring/{documentId}", async () => {
    vi.mocked(client.put).mockResolvedValue(extrasFixture.recurring_update_response);
    await tools.erply_update_recurring_invoice.handler({
      documentId: 301,
      enabled: false,
      dayOfMonth: 15,
    });
    expect(client.put).toHaveBeenCalledWith(
      "/invoices/recurring/301",
      expect.objectContaining({
        id: 301,
        enabled: false,
        dayOfMonth: 15,
      }),
      { registrationCode: undefined },
    );
  });
});
