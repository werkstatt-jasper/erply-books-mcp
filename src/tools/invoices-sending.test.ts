import { beforeEach, describe, expect, it, vi } from "vitest";
import sendingFixture from "../__fixtures__/invoices-sending.json" with { type: "json" };
import type { ErplyBooksClient } from "../client.js";
import { __test__, createInvoiceSendingTools } from "./invoices-sending.js";
import { createMockClient } from "./test-helpers.js";

describe("toIdsString", () => {
  it("joins number arrays and passes strings through", () => {
    expect(__test__.toIdsString([55, 56])).toBe("55,56");
    expect(__test__.toIdsString("55,56")).toBe("55,56");
  });
});

describe("emailBody", () => {
  it("keeps only APIEmailInfo fields", () => {
    expect(
      __test__.emailBody({
        receiver: "a@b.com",
        subject: "Hi",
        extra: true,
      }),
    ).toEqual({
      receiver: "a@b.com",
      subject: "Hi",
      body: undefined,
      sender: undefined,
      senderName: undefined,
      additionalTypes: undefined,
    });
  });
});

describe("erply_get_invoice_pdf_v1", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createInvoiceSendingTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createInvoiceSendingTools(client);
  });

  it("requires documentId", async () => {
    await expect(tools.erply_get_invoice_pdf_v1.handler({})).rejects.toThrow(/documentId/);
  });

  it("GETs /invoices/pdf/{documentId} and returns base64 for binary PDF", async () => {
    const pdf = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x01, 0x00, 0xff, 0x00, 0x00]);
    vi.mocked(client.getArrayBuffer).mockResolvedValue(
      pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength),
    );
    const result = await tools.erply_get_invoice_pdf_v1.handler({
      documentId: 55,
      template: "DEFAULT",
      hash: "abc123",
    });
    expect(client.getArrayBuffer).toHaveBeenCalledWith("/invoices/pdf/55", {
      template: "DEFAULT",
      hash: "abc123",
    });
    const body = JSON.parse(result.content[0].text) as {
      encoding: string;
      byteLength: number;
      data: string;
    };
    expect(body.encoding).toBe("base64");
    expect(body.byteLength).toBe(pdf.length);
    expect(Buffer.from(body.data, "base64").equals(pdf)).toBe(true);
  });

  it("returns parsed JSON when the API body is JSON", async () => {
    const jsonBytes = Buffer.from(JSON.stringify({ fileName: "invoice-55.pdf" }));
    vi.mocked(client.getArrayBuffer).mockResolvedValue(
      jsonBytes.buffer.slice(jsonBytes.byteOffset, jsonBytes.byteOffset + jsonBytes.byteLength),
    );
    const result = await tools.erply_get_invoice_pdf_v1.handler({ documentId: 55 });
    expect(JSON.parse(result.content[0].text).fileName).toBe("invoice-55.pdf");
  });
});

describe("erply_send_invoice_email_by_hash", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createInvoiceSendingTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createInvoiceSendingTools(client);
  });

  it("requires hash", async () => {
    await expect(tools.erply_send_invoice_email_by_hash.handler({})).rejects.toThrow(/hash/);
  });

  it("POSTs /invoices/email/{hash} when documentId is omitted", async () => {
    vi.mocked(client.post).mockResolvedValue(sendingFixture.email_response);
    const result = await tools.erply_send_invoice_email_by_hash.handler({
      hash: "abc123",
      receiver: "billing@example.com",
      subject: "Invoice",
    });
    expect(client.post).toHaveBeenCalledWith(
      "/invoices/email/abc123",
      expect.objectContaining({
        receiver: "billing@example.com",
        subject: "Invoice",
      }),
    );
    expect(JSON.parse(result.content[0].text).ok).toBe(true);
  });

  it("POSTs /invoices/email/{hash}/{documentId} when documentId is set", async () => {
    vi.mocked(client.post).mockResolvedValue(sendingFixture.email_response);
    await tools.erply_send_invoice_email_by_hash.handler({
      hash: "abc123",
      documentId: 55,
      receiver: "billing@example.com",
    });
    expect(client.post).toHaveBeenCalledWith(
      "/invoices/email/abc123/55",
      expect.objectContaining({ receiver: "billing@example.com" }),
    );
  });
});

describe("erply_import_invoices_file", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createInvoiceSendingTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createInvoiceSendingTools(client);
  });

  it("requires fileBase64 and fileName", async () => {
    await expect(tools.erply_import_invoices_file.handler({})).rejects.toThrow(
      /fileBase64|fileName/,
    );
  });

  it("posts multipart with query options and wraps HTML", async () => {
    vi.mocked(client.request).mockResolvedValue(sendingFixture.import_html);
    const fileBase64 = Buffer.from("a,b\n1,2\n", "utf8").toString("base64");
    const result = await tools.erply_import_invoices_file.handler({
      fileBase64,
      fileName: "invoices.csv",
      encoding: "UTF-8",
      getPreview: true,
      typeCode: "DOCUMENT_SELL",
    });
    expect(client.request).toHaveBeenCalledWith(
      "/invoices/import/file",
      expect.objectContaining({
        method: "POST",
        parseAs: "text",
        params: expect.objectContaining({
          encoding: "UTF-8",
          getPreview: true,
          typeCode: "DOCUMENT_SELL",
        }),
      }),
    );
    const form = (vi.mocked(client.request).mock.calls[0][1] as { formData: FormData }).formData;
    expect(form.get("file")).toBeTruthy();
    expect(JSON.parse(result.content[0].text)).toEqual({
      contentType: "text/html",
      body: sendingFixture.import_html,
    });
  });
});

describe("erply_import_invoices_formsubmit", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createInvoiceSendingTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createInvoiceSendingTools(client);
  });

  it("requires fileBase64 and fileName", async () => {
    await expect(tools.erply_import_invoices_formsubmit.handler({})).rejects.toThrow(
      /fileBase64|fileName/,
    );
  });

  it("POSTs JSON mapping fileBase64/fileName and wraps HTML", async () => {
    vi.mocked(client.request).mockResolvedValue(sendingFixture.import_html);
    const fileBase64 = Buffer.from("a,b\n1,2\n", "utf8").toString("base64");
    const result = await tools.erply_import_invoices_formsubmit.handler({
      fileBase64,
      fileName: "invoices.csv",
      getPreview: true,
      documentId: 55,
    });
    expect(client.request).toHaveBeenCalledWith(
      "/invoices/import/formsubmit",
      expect.objectContaining({
        method: "POST",
        parseAs: "text",
        params: expect.objectContaining({ getPreview: true }),
        body: expect.objectContaining({
          filename: "invoices.csv",
          base64: fileBase64,
          documentId: 55,
        }),
      }),
    );
    const sent = vi.mocked(client.request).mock.calls[0][1] as { body: Record<string, unknown> };
    expect(sent.body).not.toHaveProperty("getPreview");
    expect(sent.body).not.toHaveProperty("fileBase64");
    expect(JSON.parse(result.content[0].text).contentType).toBe("text/html");
  });
});

describe("erply_send_erply_invoice", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createInvoiceSendingTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createInvoiceSendingTools(client);
  });

  it("requires documentId", async () => {
    await expect(tools.erply_send_erply_invoice.handler({})).rejects.toThrow(/documentId/);
  });

  it("POSTs /invoices/send_erply_invoice/{documentId}", async () => {
    vi.mocked(client.post).mockResolvedValue(sendingFixture.send_erply_response);
    const result = await tools.erply_send_erply_invoice.handler({
      documentId: 55,
      receiver: "billing@example.com",
    });
    expect(client.post).toHaveBeenCalledWith(
      "/invoices/send_erply_invoice/55",
      expect.objectContaining({ receiver: "billing@example.com" }),
    );
    expect(JSON.parse(result.content[0].text).sent).toBe(1);
  });
});

describe("erply_send_erply_invoices", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createInvoiceSendingTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createInvoiceSendingTools(client);
  });

  it("requires ids or partnerDocumentIds", async () => {
    await expect(tools.erply_send_erply_invoices.handler({})).rejects.toThrow(
      /ids or partnerDocumentIds/,
    );
  });

  it("POSTs with ids array normalized to a comma string", async () => {
    vi.mocked(client.post).mockResolvedValue(sendingFixture.send_erply_bulk_response);
    await tools.erply_send_erply_invoices.handler({
      ids: [55, 56],
      receiver: "billing@example.com",
    });
    expect(client.post).toHaveBeenCalledWith(
      "/invoices/send_erply_invoices",
      expect.objectContaining({ receiver: "billing@example.com" }),
      { ids: "55,56", partnerDocumentIds: undefined },
    );
  });

  it("POSTs with partnerDocumentIds string only", async () => {
    vi.mocked(client.post).mockResolvedValue(sendingFixture.send_erply_bulk_response);
    const result = await tools.erply_send_erply_invoices.handler({
      partnerDocumentIds: "P-1,P-2",
    });
    expect(client.post).toHaveBeenCalledWith("/invoices/send_erply_invoices", expect.any(Object), {
      ids: undefined,
      partnerDocumentIds: "P-1,P-2",
    });
    expect(JSON.parse(result.content[0].text).sent).toBe(2);
  });
});
