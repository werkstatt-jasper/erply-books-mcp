import { beforeEach, describe, expect, it, vi } from "vitest";
import attachmentsFixture from "../__fixtures__/attachments.json" with { type: "json" };
import type { ErplyBooksClient } from "../client.js";
import { createAttachmentTools } from "./attachments.js";
import { createMockClient } from "./test-helpers.js";

describe("erply_list_attachments", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createAttachmentTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createAttachmentTools(client);
  });

  it("GETs /attachments/all and unwraps list envelope", async () => {
    vi.mocked(client.get).mockResolvedValue(attachmentsFixture.list_page);
    const result = await tools.erply_list_attachments.handler({
      documentId: 55,
      start: 0,
      limit: 10,
    });
    expect(client.get).toHaveBeenCalledWith(
      "/attachments/all",
      expect.objectContaining({ documentId: 55, start: 0, limit: 10 }),
    );
    const body = JSON.parse(result.content[0].text);
    expect(body.totalCount).toBe(1);
    expect(body.items[0].attachmentId).toBe(101);
  });

  it("forwards Purchase Inbox list filters", async () => {
    vi.mocked(client.get).mockResolvedValue(attachmentsFixture.list_page);
    await tools.erply_list_attachments.handler({
      getNotConnectedInvoices: true,
      getOnlyPartnerSupplierDocuments: true,
      getOnlyLocalSupplierDocuments: false,
      getOnlyNotSupplierConnectedDocuments: true,
      doNotGetInvoice: true,
      getLast10: true,
      getProjectsFromDocuments: true,
      reportGeneratorInput: "{}",
    });
    expect(client.get).toHaveBeenCalledWith(
      "/attachments/all",
      expect.objectContaining({
        getNotConnectedInvoices: true,
        getOnlyPartnerSupplierDocuments: true,
        getOnlyLocalSupplierDocuments: false,
        getOnlyNotSupplierConnectedDocuments: true,
        doNotGetInvoice: true,
        getLast10: true,
        getProjectsFromDocuments: true,
        reportGeneratorInput: "{}",
      }),
    );
  });
});

describe("erply_get_attachment", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createAttachmentTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createAttachmentTools(client);
  });

  it("requires attachmentId", async () => {
    await expect(tools.erply_get_attachment.handler({})).rejects.toThrow(/attachmentId/);
  });

  it("GETs /attachments/all/{id} and parses JSON bytes", async () => {
    const jsonBytes = Buffer.from(JSON.stringify(attachmentsFixture.single));
    vi.mocked(client.getArrayBuffer).mockResolvedValue(
      jsonBytes.buffer.slice(jsonBytes.byteOffset, jsonBytes.byteOffset + jsonBytes.byteLength),
    );
    const result = await tools.erply_get_attachment.handler({
      attachmentId: 101,
      noDownload: 1,
    });
    expect(client.getArrayBuffer).toHaveBeenCalledWith("/attachments/all/101", { noDownload: 1 });
    expect(JSON.parse(result.content[0].text).filename).toBe("receipt.pdf");
  });

  it("returns base64 for a binary file body", async () => {
    const pdf = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x01, 0x00, 0xff, 0x00, 0x00]);
    vi.mocked(client.getArrayBuffer).mockResolvedValue(
      pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength),
    );
    const result = await tools.erply_get_attachment.handler({ attachmentId: 101 });
    const body = JSON.parse(result.content[0].text) as {
      encoding: string;
      byteLength: number;
      data: string;
    };
    expect(body.encoding).toBe("base64");
    expect(body.byteLength).toBe(pdf.length);
    expect(Buffer.from(body.data, "base64").equals(pdf)).toBe(true);
  });
});

describe("erply_create_attachment", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createAttachmentTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createAttachmentTools(client);
  });

  it("requires fileBase64 and fileName", async () => {
    await expect(tools.erply_create_attachment.handler({})).rejects.toThrow(/fileBase64|fileName/);
  });

  it("POSTs JSON mapping fileBase64/fileName to base64/filename", async () => {
    vi.mocked(client.post).mockResolvedValue(attachmentsFixture.create_response);
    const fileBase64 = Buffer.from("test", "utf8").toString("base64");
    const result = await tools.erply_create_attachment.handler({
      fileBase64,
      fileName: "upload.pdf",
      documentId: 55,
      description: "Receipt",
    });
    expect(client.post).toHaveBeenCalledWith(
      "/attachments",
      expect.objectContaining({
        filename: "upload.pdf",
        base64: fileBase64,
        documentId: 55,
        description: "Receipt",
      }),
    );
    expect(JSON.parse(result.content[0].text).attachmentId).toBe(102);
  });

  it("rejects invalid base64", async () => {
    await expect(
      tools.erply_create_attachment.handler({
        fileBase64: "!!!",
        fileName: "x.pdf",
      }),
    ).rejects.toThrow(/invalid base64/);
  });
});

describe("erply_delete_attachment", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createAttachmentTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createAttachmentTools(client);
  });

  it("requires attachmentId", async () => {
    await expect(tools.erply_delete_attachment.handler({})).rejects.toThrow(/attachmentId/);
  });

  it("DELETEs /attachments/{id}", async () => {
    vi.mocked(client.delete).mockResolvedValue(undefined);
    const result = await tools.erply_delete_attachment.handler({
      attachmentId: 101,
      documentId: 55,
    });
    expect(client.delete).toHaveBeenCalledWith("/attachments/101", { documentId: 55 });
    expect(JSON.parse(result.content[0].text)).toEqual({ ok: true });
  });
});
