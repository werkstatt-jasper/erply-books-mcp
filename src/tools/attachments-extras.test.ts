import { beforeEach, describe, expect, it, vi } from "vitest";
import attachmentsFixture from "../__fixtures__/attachments.json" with { type: "json" };
import type { ErplyBooksClient } from "../client.js";
import { __test__, createAttachmentExtraTools } from "./attachments-extras.js";
import { createMockClient } from "./test-helpers.js";

function toArrayBuffer(buf: Buffer): ArrayBuffer {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

const sampleBase64 = Buffer.from("test", "utf8").toString("base64");

describe("toApiAttachment", () => {
  it("maps fileName/fileBase64 to filename/base64", () => {
    expect(
      __test__.toApiAttachment({
        fileBase64: sampleBase64,
        fileName: "a.pdf",
        documentId: 55,
      }),
    ).toEqual({
      filename: "a.pdf",
      base64: sampleBase64,
      documentId: 55,
    });
  });
});

describe("erply_get_attachment_preview", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createAttachmentExtraTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createAttachmentExtraTools(client);
  });

  it("GETs preview as text/html", async () => {
    vi.mocked(client.getText).mockResolvedValue("<html>preview</html>");
    const result = await tools.erply_get_attachment_preview.handler({ attachmentId: 101 });
    expect(client.getText).toHaveBeenCalledWith("/attachments/preview", { attachmentId: 101 });
    expect(JSON.parse(result.content[0].text)).toEqual({
      contentType: "text/html",
      body: "<html>preview</html>",
    });
  });
});

describe("erply_get_attachment_html_template", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createAttachmentExtraTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createAttachmentExtraTools(client);
  });

  it("GETs /attachments/html_template", async () => {
    vi.mocked(client.get).mockResolvedValue(attachmentsFixture.html_template);
    const result = await tools.erply_get_attachment_html_template.handler({
      attachmentId: 101,
      documentId: 55,
      attachmentType: "PDF",
    });
    expect(client.get).toHaveBeenCalledWith("/attachments/html_template", {
      attachmentId: 101,
      documentId: 55,
      attachmentType: "PDF",
    });
    expect(JSON.parse(result.content[0].text).html).toBe("<div>template</div>");
  });
});

describe("erply_get_attachments_zip", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createAttachmentExtraTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createAttachmentExtraTools(client);
  });

  it("requires documentId", async () => {
    await expect(tools.erply_get_attachments_zip.handler({})).rejects.toThrow(/documentId/);
  });

  it("passes a JSON envelope body through as JSON", async () => {
    const jsonBytes = toArrayBuffer(Buffer.from(JSON.stringify(attachmentsFixture.zip_file)));
    vi.mocked(client.getArrayBuffer).mockResolvedValue(jsonBytes);
    const result = await tools.erply_get_attachments_zip.handler({ documentId: 55 });
    expect(client.getArrayBuffer).toHaveBeenCalledWith("/attachments/zip_file/55");
    expect(client.get).not.toHaveBeenCalled();
    expect(JSON.parse(result.content[0].text).filename).toBe("attachments.zip");
  });

  it("returns base64 for a binary zip body (PK header)", async () => {
    // Fake archive: local file header signature + binary bytes, then printable "content".
    const zip = Buffer.concat([
      Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0x00]),
      Buffer.from("fake-attachment.txt", "utf8"),
    ]);
    vi.mocked(client.getArrayBuffer).mockResolvedValue(toArrayBuffer(zip));
    const result = await tools.erply_get_attachments_zip.handler({ documentId: 55 });
    const body = JSON.parse(result.content[0].text) as {
      encoding: string;
      byteLength: number;
      data: string;
    };
    expect(body.encoding).toBe("base64");
    expect(body.byteLength).toBe(zip.length);
    expect(Buffer.from(body.data, "base64").equals(zip)).toBe(true);
  });

  it("keeps a mostly-printable zip (stored text entries) as base64, not utf8", async () => {
    const zip = Buffer.concat([
      Buffer.from("PK\u0003\u0004", "latin1"),
      Buffer.from("x".repeat(600), "utf8"),
    ]);
    vi.mocked(client.getArrayBuffer).mockResolvedValue(toArrayBuffer(zip));
    const result = await tools.erply_get_attachments_zip.handler({ documentId: 55 });
    const body = JSON.parse(result.content[0].text) as { encoding: string; data: string };
    expect(body.encoding).toBe("base64");
    expect(Buffer.from(body.data, "base64").equals(zip)).toBe(true);
  });

  it("returns base64 for an empty zip archive (end-of-central-directory only)", async () => {
    const zip = Buffer.concat([Buffer.from([0x50, 0x4b, 0x05, 0x06]), Buffer.alloc(18)]);
    vi.mocked(client.getArrayBuffer).mockResolvedValue(toArrayBuffer(zip));
    const result = await tools.erply_get_attachments_zip.handler({ documentId: 55 });
    expect(JSON.parse(result.content[0].text).encoding).toBe("base64");
  });

  it("returns an empty marker with a clear message for an empty body", async () => {
    vi.mocked(client.getArrayBuffer).mockResolvedValue(new ArrayBuffer(0));
    const result = await tools.erply_get_attachments_zip.handler({ documentId: 55 });
    expect(JSON.parse(result.content[0].text)).toEqual({
      encoding: "empty",
      byteLength: 0,
      message:
        "Erply returned an empty body for the attachments ZIP of document 55, so no ZIP archive was produced. The document may have no attachments.",
    });
  });

  it("throws a clear error for a truncated NO_CONTENT wrapper", async () => {
    vi.mocked(client.getArrayBuffer).mockResolvedValue(
      toArrayBuffer(Buffer.from('{"statusType":"NO_CONTENT","entity"', "utf8")),
    );
    await expect(tools.erply_get_attachments_zip.handler({ documentId: 56 })).rejects.toThrow(
      "instead of the file for the attachments ZIP of document 56",
    );
  });

  it("returns an empty marker for a complete NO_CONTENT wrapper", async () => {
    vi.mocked(client.getArrayBuffer).mockResolvedValue(
      toArrayBuffer(Buffer.from(JSON.stringify({ statusType: "NO_CONTENT", entity: null }))),
    );
    const result = await tools.erply_get_attachments_zip.handler({ documentId: 57 });
    expect(JSON.parse(result.content[0].text)).toMatchObject({
      encoding: "empty",
      apiStatus: "NO_CONTENT",
    });
  });
});

describe("erply_get_summary_invoice", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createAttachmentExtraTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createAttachmentExtraTools(client);
  });

  it("requires attachmentId", async () => {
    await expect(tools.erply_get_summary_invoice.handler({})).rejects.toThrow(/attachmentId/);
  });

  it("GETs /attachments/summary_invoice/{id}", async () => {
    vi.mocked(client.get).mockResolvedValue(attachmentsFixture.summary_invoice);
    await tools.erply_get_summary_invoice.handler({
      attachmentId: 101,
      invoiceIds: "55,56",
    });
    expect(client.get).toHaveBeenCalledWith("/attachments/summary_invoice/101", {
      invoiceIds: "55,56",
    });
  });
});

describe("erply_get_attachment_child", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createAttachmentExtraTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createAttachmentExtraTools(client);
  });

  it("requires attachmentId", async () => {
    await expect(tools.erply_get_attachment_child.handler({})).rejects.toThrow(/attachmentId/);
  });

  it("GETs /attachments/{id}/child and parses JSON bytes", async () => {
    const jsonBytes = Buffer.from(JSON.stringify(attachmentsFixture.child));
    vi.mocked(client.getArrayBuffer).mockResolvedValue(
      jsonBytes.buffer.slice(jsonBytes.byteOffset, jsonBytes.byteOffset + jsonBytes.byteLength),
    );
    const result = await tools.erply_get_attachment_child.handler({
      attachmentId: 101,
      noDownload: 1,
    });
    expect(client.getArrayBuffer).toHaveBeenCalledWith("/attachments/101/child", { noDownload: 1 });
    expect(JSON.parse(result.content[0].text).filename).toBe("einvoice.xml");
  });

  it("returns base64 for a binary child file body", async () => {
    const pdf = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x01, 0x00, 0xff, 0x00, 0x00]);
    vi.mocked(client.getArrayBuffer).mockResolvedValue(
      pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength),
    );
    const result = await tools.erply_get_attachment_child.handler({ attachmentId: 101 });
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

describe("erply_create_attachments_multiple", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createAttachmentExtraTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createAttachmentExtraTools(client);
  });

  it("requires files", async () => {
    await expect(tools.erply_create_attachments_multiple.handler({})).rejects.toThrow(/files/);
  });

  it("POSTs mapped APIAttachmentInfo array", async () => {
    vi.mocked(client.post).mockResolvedValue(attachmentsFixture.multiple_response);
    const result = await tools.erply_create_attachments_multiple.handler({
      files: [
        { fileBase64: sampleBase64, fileName: "a.pdf", documentId: 55 },
        { fileBase64: sampleBase64, fileName: "b.pdf" },
      ],
    });
    expect(client.post).toHaveBeenCalledWith("/attachments/multiple", [
      { filename: "a.pdf", base64: sampleBase64, documentId: 55 },
      { filename: "b.pdf", base64: sampleBase64 },
    ]);
    expect(JSON.parse(result.content[0].text).count).toBe(2);
  });
});

describe("erply_create_attachment_simple", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createAttachmentExtraTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createAttachmentExtraTools(client);
  });

  it("requires fileBase64 and fileName", async () => {
    await expect(tools.erply_create_attachment_simple.handler({})).rejects.toThrow(
      /fileBase64|fileName/,
    );
  });

  it("POSTs multipart file", async () => {
    vi.mocked(client.postMultipart).mockResolvedValue(attachmentsFixture.simple_response);
    const result = await tools.erply_create_attachment_simple.handler({
      fileBase64: sampleBase64,
      fileName: "simple.pdf",
    });
    expect(client.postMultipart).toHaveBeenCalledWith("/attachments/simple", expect.any(FormData));
    const form = vi.mocked(client.postMultipart).mock.calls[0][1] as FormData;
    expect(form.get("file")).toBeTruthy();
    expect(JSON.parse(result.content[0].text).attachmentId).toBe(103);
  });
});

describe("erply_get_digi_attachment", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createAttachmentExtraTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createAttachmentExtraTools(client);
  });

  it("requires attachmentId", async () => {
    await expect(tools.erply_get_digi_attachment.handler({})).rejects.toThrow(/attachmentId/);
  });

  it("GETs /attachments/digi/{id}", async () => {
    vi.mocked(client.get).mockResolvedValue(attachmentsFixture.digi);
    const result = await tools.erply_get_digi_attachment.handler({ attachmentId: 101 });
    expect(client.get).toHaveBeenCalledWith("/attachments/digi/101");
    expect(JSON.parse(result.content[0].text).filename).toBe("digitized.pdf");
  });
});

describe("erply_create_digi_base64", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createAttachmentExtraTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createAttachmentExtraTools(client);
  });

  it("requires fileBase64 and fileName", async () => {
    await expect(tools.erply_create_digi_base64.handler({})).rejects.toThrow(/fileBase64|fileName/);
  });

  it("POSTs JSON attachment with digi query params", async () => {
    vi.mocked(client.post).mockResolvedValue(attachmentsFixture.digi);
    await tools.erply_create_digi_base64.handler({
      fileBase64: sampleBase64,
      fileName: "scan.pdf",
      encoding: "UTF-8",
      type: "PDF",
    });
    expect(client.post).toHaveBeenCalledWith(
      "/attachments/digi/base64",
      { filename: "scan.pdf", base64: sampleBase64 },
      { encoding: "UTF-8", separatorField: undefined, type: "PDF" },
    );
  });
});

describe("erply_create_digi_form", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createAttachmentExtraTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createAttachmentExtraTools(client);
  });

  it("requires fileBase64 and fileName", async () => {
    await expect(tools.erply_create_digi_form.handler({})).rejects.toThrow(/fileBase64|fileName/);
  });

  it("POSTs multipart with query params", async () => {
    vi.mocked(client.postMultipart).mockResolvedValue(attachmentsFixture.digi);
    await tools.erply_create_digi_form.handler({
      fileBase64: sampleBase64,
      fileName: "scan.pdf",
      separatorField: ";",
    });
    expect(client.postMultipart).toHaveBeenCalledWith(
      "/attachments/digi/form",
      expect.any(FormData),
      expect.objectContaining({ separatorField: ";" }),
    );
  });
});

describe("erply_get_digi_country_from_parser", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createAttachmentExtraTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createAttachmentExtraTools(client);
  });

  it("POSTs dictionary fields", async () => {
    vi.mocked(client.post).mockResolvedValue(attachmentsFixture.country_from_parser);
    const result = await tools.erply_get_digi_country_from_parser.handler({
      code: "EE",
      name: "Estonia",
    });
    expect(client.post).toHaveBeenCalledWith("/attachments/digi/country_from_parser", {
      code: "EE",
      name: "Estonia",
    });
    expect(JSON.parse(result.content[0].text).code).toBe("EE");
  });
});

describe("erply_submit_kyc", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createAttachmentExtraTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createAttachmentExtraTools(client);
  });

  it("requires fileBase64 and fileName", async () => {
    await expect(tools.erply_submit_kyc.handler({})).rejects.toThrow(/fileBase64|fileName/);
  });

  it("POSTs multipart KYC file", async () => {
    vi.mocked(client.postMultipart).mockResolvedValue(attachmentsFixture.kyc_response);
    const result = await tools.erply_submit_kyc.handler({
      fileBase64: sampleBase64,
      fileName: "id.pdf",
    });
    expect(client.postMultipart).toHaveBeenCalledWith("/attachments/kyc", expect.any(FormData));
    expect(JSON.parse(result.content[0].text).ok).toBe(true);
  });
});

describe("erply_submit_kyc_json", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createAttachmentExtraTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createAttachmentExtraTools(client);
  });

  it("requires fileBase64 and fileName", async () => {
    await expect(tools.erply_submit_kyc_json.handler({})).rejects.toThrow(/fileBase64|fileName/);
  });

  it("POSTs JSON APIAttachmentInfo", async () => {
    vi.mocked(client.post).mockResolvedValue(attachmentsFixture.kyc_response);
    await tools.erply_submit_kyc_json.handler({
      fileBase64: sampleBase64,
      fileName: "id.pdf",
      description: "passport",
    });
    expect(client.post).toHaveBeenCalledWith("/attachments/kyc/json", {
      filename: "id.pdf",
      base64: sampleBase64,
      description: "passport",
    });
  });
});

describe("erply_delete_attachment_via_post", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createAttachmentExtraTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createAttachmentExtraTools(client);
  });

  it("requires id", async () => {
    await expect(tools.erply_delete_attachment_via_post.handler({})).rejects.toThrow(/id/);
  });

  it("POSTs /attachments/delete", async () => {
    vi.mocked(client.post).mockResolvedValue(undefined);
    const result = await tools.erply_delete_attachment_via_post.handler({
      id: 101,
      documentId: 55,
    });
    expect(client.post).toHaveBeenCalledWith("/attachments/delete", undefined, {
      id: 101,
      documentId: 55,
    });
    expect(JSON.parse(result.content[0].text)).toEqual({ ok: true });
  });
});

describe("erply_delete_activity_attachment", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createAttachmentExtraTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createAttachmentExtraTools(client);
  });

  it("requires activityItemAttachmentId", async () => {
    await expect(tools.erply_delete_activity_attachment.handler({})).rejects.toThrow(
      /activityItemAttachmentId/,
    );
  });

  it("DELETEs /attachments/all/{activityItemAttachmentId}", async () => {
    vi.mocked(client.delete).mockResolvedValue(undefined);
    const result = await tools.erply_delete_activity_attachment.handler({
      activityItemAttachmentId: 9,
      transactionEntryId: 3,
      customerId: 12,
      activityItemType: "NOTE",
    });
    expect(client.delete).toHaveBeenCalledWith("/attachments/all/9", {
      transactionEntryId: 3,
      customerId: 12,
      activityItemType: "NOTE",
    });
    expect(JSON.parse(result.content[0].text)).toEqual({ ok: true });
  });
});
