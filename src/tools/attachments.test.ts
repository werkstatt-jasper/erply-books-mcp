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
    const query = vi.mocked(client.get).mock.calls[0]?.[1] as { getEverything?: boolean };
    expect(query.getEverything).toBeUndefined();
    const body = JSON.parse(result.content[0].text);
    expect(body.totalCount).toBe(1);
    expect(body.items[0].attachmentId).toBe(101);
    expect(body.items[0].ocrText).toBe(
      attachmentsFixture.list_page.items[0].item.alternativeValue9,
    );
    expect(body.items[0].item.alternativeValue9).toBe(
      attachmentsFixture.list_page.items[0].item.alternativeValue9,
    );
    expect(body.items[0].item.alternativeValue2).toBe("asdasda");
  });

  it("lifts ocrText from item.alternativeValue9", async () => {
    vi.mocked(client.get).mockResolvedValue(attachmentsFixture.list_page);
    const result = await tools.erply_list_attachments.handler({});
    const body = JSON.parse(result.content[0].text);
    expect(body.items[0].ocrText).toMatch(/Tax \(20%\): 120.00/);
  });

  it("sets ocrText to null when item is missing", async () => {
    vi.mocked(client.get).mockResolvedValue({
      totalCount: 1,
      items: [{ attachmentId: 101, filename: "no-item.pdf" }],
    });
    const result = await tools.erply_list_attachments.handler({});
    expect(JSON.parse(result.content[0].text).items[0].ocrText).toBeNull();
  });

  it("sets ocrText to null when alternativeValue9 is not a string", async () => {
    vi.mocked(client.get).mockResolvedValue({
      totalCount: 1,
      items: [{ attachmentId: 101, item: { alternativeValue9: 9 } }],
    });
    const result = await tools.erply_list_attachments.handler({});
    expect(JSON.parse(result.content[0].text).items[0].ocrText).toBeNull();
  });

  it("defaults getEverything=true on an unfiltered call", async () => {
    vi.mocked(client.get).mockResolvedValue(attachmentsFixture.list_page);
    await tools.erply_list_attachments.handler({});
    expect(client.get).toHaveBeenCalledWith(
      "/attachments/all",
      expect.objectContaining({ getEverything: true }),
    );
  });

  it("defaults getEverything=true when only pagination is set", async () => {
    vi.mocked(client.get).mockResolvedValue(attachmentsFixture.list_page);
    await tools.erply_list_attachments.handler({ start: 0, limit: 10 });
    expect(client.get).toHaveBeenCalledWith(
      "/attachments/all",
      expect.objectContaining({ start: 0, limit: 10, getEverything: true }),
    );
  });

  it("forwards explicit getEverything=false", async () => {
    vi.mocked(client.get).mockResolvedValue(attachmentsFixture.list_page);
    await tools.erply_list_attachments.handler({ getEverything: false });
    expect(client.get).toHaveBeenCalledWith(
      "/attachments/all",
      expect.objectContaining({ getEverything: false }),
    );
  });

  it("does not add getEverything when a narrowing filter is set", async () => {
    vi.mocked(client.get).mockResolvedValue(attachmentsFixture.list_page);
    await tools.erply_list_attachments.handler({ customerId: 99 });
    const query = vi.mocked(client.get).mock.calls[0]?.[1] as { getEverything?: boolean };
    expect(query).toEqual(expect.objectContaining({ customerId: 99 }));
    expect(query.getEverything).toBeUndefined();
  });

  it("describes the unfiltered getEverything default and ignored documentId", () => {
    expect(tools.erply_list_attachments.description).toMatch(/defaults to getEverything=true/);
    expect(tools.erply_list_attachments.description).toMatch(/documentId is ignored/);
    expect(tools.erply_list_attachments.description).toMatch(/ocrText/);
    expect(tools.erply_list_attachments.description).toMatch(/item.alternativeValue9/);
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
    const query = vi.mocked(client.get).mock.calls[0]?.[1] as { getEverything?: boolean };
    expect(query.getEverything).toBeUndefined();
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

  function bodyOf(buf: Buffer): ArrayBuffer {
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  }

  function mockBody(buf: Buffer, contentType: string | null = null) {
    vi.mocked(client.getBinary).mockResolvedValue({ bytes: bodyOf(buf), contentType });
  }

  function parsed(result: { content: Array<{ text: string }> }) {
    return JSON.parse(result.content[0]?.text ?? "") as Record<string, unknown>;
  }

  it("GETs /attachments/all/{id} and parses JSON bytes", async () => {
    mockBody(Buffer.from(JSON.stringify(attachmentsFixture.single)), "application/json");
    const result = await tools.erply_get_attachment.handler({
      attachmentId: 101,
      noDownload: 1,
    });
    expect(client.getBinary).toHaveBeenCalledWith("/attachments/all/101", { noDownload: 1 });
    expect(parsed(result).filename).toBe("receipt.pdf");
  });

  it("returns base64 for a binary file body", async () => {
    const pdf = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x01, 0x00, 0xff, 0x00, 0x00]);
    mockBody(pdf);
    const body = parsed(await tools.erply_get_attachment.handler({ attachmentId: 101 }));
    expect(body.encoding).toBe("base64");
    expect(body.byteLength).toBe(pdf.length);
    expect(Buffer.from(body.data as string, "base64").equals(pdf)).toBe(true);
  });

  it("returns base64 for a mostly-printable PDF instead of utf8 text", async () => {
    const pdf = Buffer.from(
      `%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n${"% fake ".repeat(80)}`,
      "latin1",
    );
    mockBody(pdf, null);
    const body = parsed(await tools.erply_get_attachment.handler({ attachmentId: 102 }));
    expect(body.encoding).toBe("base64");
    expect(Buffer.from(body.data as string, "base64").equals(pdf)).toBe(true);
  });

  it.each([
    ["application/pdf"],
    ["application/octet-stream"],
    ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  ])("returns base64 for a printable body with Content-Type %s", async (contentType) => {
    const text = Buffer.from("fake printable file body ".repeat(30), "utf8");
    mockBody(text, contentType);
    const body = parsed(await tools.erply_get_attachment.handler({ attachmentId: 103 }));
    expect(body.encoding).toBe("base64");
  });

  it("keeps printable text as utf8 when the Content-Type is text", async () => {
    mockBody(Buffer.from("plain fake note", "utf8"), "text/plain; charset=utf-8");
    const body = parsed(await tools.erply_get_attachment.handler({ attachmentId: 104 }));
    expect(body).toEqual({ encoding: "utf8", byteLength: 15, text: "plain fake note" });
  });

  it("throws a clear error for the truncated NO_CONTENT wrapper", async () => {
    const truncated = Buffer.from('{"statusType":"NO_CONTENT","entity"', "utf8");
    expect(truncated.length).toBe(35);
    mockBody(truncated, "application/json");
    await expect(tools.erply_get_attachment.handler({ attachmentId: 105 })).rejects.toThrow(
      'Erply returned a truncated NO_CONTENT response (35 bytes: "{\\"statusType\\":\\"NO_CONTENT\\",\\"entity\\"") instead of the file for attachment 105.',
    );
  });

  it("returns an empty marker for a complete NO_CONTENT wrapper", async () => {
    mockBody(
      Buffer.from(JSON.stringify({ statusType: "NO_CONTENT", entity: null, status: 204 })),
      "application/json",
    );
    const body = parsed(await tools.erply_get_attachment.handler({ attachmentId: 106 }));
    expect(body).toEqual({
      encoding: "empty",
      byteLength: 0,
      apiStatus: "NO_CONTENT",
      message: "Erply reported NO_CONTENT for attachment 106: no file content was returned.",
    });
  });

  it("passes a complete non-NO_CONTENT wrapper through as JSON", async () => {
    const wrapper = { statusType: "OK", entity: { filename: "fake.pdf" } };
    mockBody(Buffer.from(JSON.stringify(wrapper)), "application/json");
    const body = parsed(await tools.erply_get_attachment.handler({ attachmentId: 107 }));
    expect(body).toEqual(wrapper);
  });

  it("returns an empty marker with a message for an empty body", async () => {
    vi.mocked(client.getBinary).mockResolvedValue({ bytes: new ArrayBuffer(0), contentType: null });
    const body = parsed(await tools.erply_get_attachment.handler({ attachmentId: 108 }));
    expect(body).toEqual({
      encoding: "empty",
      byteLength: 0,
      message: "Erply returned an empty body for attachment 108.",
    });
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
