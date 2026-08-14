import { beforeEach, describe, expect, it, vi } from "vitest";
import attachmentsFixture from "../__fixtures__/attachments.json" with { type: "json" };
import type { ErplyBooksClient } from "../client.js";
import { createAttachmentInboxTools } from "./attachments-inbox.js";
import { createMockClient } from "./test-helpers.js";

describe("erply_digitize_attachment", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createAttachmentInboxTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createAttachmentInboxTools(client);
  });

  it("requires itemId", async () => {
    await expect(tools.erply_digitize_attachment.handler({})).rejects.toThrow(/itemId/);
  });

  it("PUTs /attachments/digitize/{itemId}", async () => {
    vi.mocked(client.put).mockResolvedValue({ ok: true });
    const result = await tools.erply_digitize_attachment.handler({ itemId: 101 });
    expect(client.put).toHaveBeenCalledWith("/attachments/digitize/101");
    expect(JSON.parse(result.content[0].text).ok).toBe(true);
  });
});

describe("erply_parse_attachment", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createAttachmentInboxTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createAttachmentInboxTools(client);
  });

  it("requires attachmentId", async () => {
    await expect(tools.erply_parse_attachment.handler({})).rejects.toThrow(/attachmentId/);
  });

  it("GETs /attachments/parse/{id} with optional query", async () => {
    vi.mocked(client.get).mockResolvedValue(attachmentsFixture.parsed);
    const result = await tools.erply_parse_attachment.handler({
      attachmentId: 101,
      onlyParseTotal: true,
      customerId: 12,
      baseDocumentIds: "55",
    });
    expect(client.get).toHaveBeenCalledWith("/attachments/parse/101", {
      onlyParseTotal: true,
      isEmail: undefined,
      customerId: 12,
      baseDocumentIds: "55",
      orgId: undefined,
      isSalesDocument: undefined,
    });
    expect(JSON.parse(result.content[0].text).number).toBe("INV-1");
  });
});

describe("erply_confirm_attachment", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createAttachmentInboxTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createAttachmentInboxTools(client);
  });

  it("POSTs JSON confirmation fields and defaults STATUS_CONFIRMED", async () => {
    vi.mocked(client.post).mockResolvedValue(attachmentsFixture.confirm_response);
    const result = await tools.erply_confirm_attachment.handler({
      attachmentId: 101,
      waitingForUserId: 7,
      sendEmail: true,
    });
    expect(client.post).toHaveBeenCalledWith(
      "/attachments/confirm",
      expect.objectContaining({
        attachmentId: 101,
        waitingForUserId: 7,
        sendEmail: true,
        documentStatusTypeCode: "STATUS_CONFIRMED",
      }),
    );
    expect(JSON.parse(result.content[0].text).waitingForUserId).toBe(7);
  });

  it("requires attachmentId when documentId is set", async () => {
    await expect(tools.erply_confirm_attachment.handler({ documentId: 55 })).rejects.toThrow(
      /attachmentId is required when documentId is set/,
    );
  });

  it("rejects activityItemId when documentId is set", async () => {
    await expect(
      tools.erply_confirm_attachment.handler({
        attachmentId: 101,
        activityItemId: 9,
        documentId: 55,
      }),
    ).rejects.toThrow(/omit activityItemId/);
  });

  it("forwards an explicit documentStatusTypeCode", async () => {
    vi.mocked(client.post).mockResolvedValue(attachmentsFixture.confirm_response);
    await tools.erply_confirm_attachment.handler({
      attachmentId: 101,
      documentId: 55,
      documentStatusTypeCode: "STATUS_PENDING",
    });
    expect(client.post).toHaveBeenCalledWith(
      "/attachments/confirm",
      expect.objectContaining({
        attachmentId: 101,
        documentId: 55,
        documentStatusTypeCode: "STATUS_PENDING",
      }),
    );
  });
});

describe("erply_attach_inbox_item_to_document", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createAttachmentInboxTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createAttachmentInboxTools(client);
  });

  it("requires attachmentId and documentId", async () => {
    await expect(tools.erply_attach_inbox_item_to_document.handler({})).rejects.toThrow(
      /attachmentId|documentId/,
    );
  });

  it("POSTs confirm with attachmentId, documentId, and default status", async () => {
    vi.mocked(client.post).mockResolvedValue(attachmentsFixture.confirm_response);
    const result = await tools.erply_attach_inbox_item_to_document.handler({
      attachmentId: 101,
      documentId: 55,
    });
    expect(client.post).toHaveBeenCalledWith("/attachments/confirm", {
      attachmentId: 101,
      documentId: 55,
      documentStatusTypeCode: "STATUS_CONFIRMED",
    });
    expect(JSON.parse(result.content[0].text).attachmentId).toBe(101);
  });

  it("forwards an explicit documentStatusTypeCode", async () => {
    vi.mocked(client.post).mockResolvedValue(attachmentsFixture.confirm_response);
    await tools.erply_attach_inbox_item_to_document.handler({
      attachmentId: 101,
      documentId: 55,
      documentStatusTypeCode: "STATUS_PENDING",
    });
    expect(client.post).toHaveBeenCalledWith("/attachments/confirm", {
      attachmentId: 101,
      documentId: 55,
      documentStatusTypeCode: "STATUS_PENDING",
    });
  });

  it("describes the confirm recipe and activityItemId pitfall", () => {
    expect(tools.erply_attach_inbox_item_to_document.description).toMatch(
      /POST \/attachments\/confirm/,
    );
    expect(tools.erply_attach_inbox_item_to_document.description).toMatch(/activityItemId/);
    expect(tools.erply_attach_inbox_item_to_document.description).toMatch(/documentId stays 0/);
  });
});

describe("erply_mark_attachment_opened", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createAttachmentInboxTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createAttachmentInboxTools(client);
  });

  it("requires itemId", async () => {
    await expect(tools.erply_mark_attachment_opened.handler({})).rejects.toThrow(/itemId/);
  });

  it("PUTs /attachments/mark_attachment_as_opened/{itemId}", async () => {
    vi.mocked(client.put).mockResolvedValue(undefined);
    const result = await tools.erply_mark_attachment_opened.handler({ itemId: 101 });
    expect(client.put).toHaveBeenCalledWith("/attachments/mark_attachment_as_opened/101");
    expect(JSON.parse(result.content[0].text)).toEqual({ ok: true });
  });
});

describe("erply_mark_attachment_not_digitizable", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createAttachmentInboxTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createAttachmentInboxTools(client);
  });

  it("requires itemId", async () => {
    await expect(tools.erply_mark_attachment_not_digitizable.handler({})).rejects.toThrow(/itemId/);
  });

  it("PUTs /attachments/not_digitizable/{itemId} with info", async () => {
    vi.mocked(client.put).mockResolvedValue({ ok: true });
    await tools.erply_mark_attachment_not_digitizable.handler({
      itemId: 101,
      info: "unreadable scan",
    });
    expect(client.put).toHaveBeenCalledWith("/attachments/not_digitizable/101", undefined, {
      info: "unreadable scan",
    });
  });
});

describe("erply_create_purchase_order_from_attachment", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createAttachmentInboxTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createAttachmentInboxTools(client);
  });

  it("rejects fileBase64 without fileName", async () => {
    await expect(
      tools.erply_create_purchase_order_from_attachment.handler({ fileBase64: "dGVzdA==" }),
    ).rejects.toThrow(/fileBase64 and fileName/);
  });

  it("POSTs multipart without a file", async () => {
    vi.mocked(client.postMultipart).mockResolvedValue(attachmentsFixture.purchase_order_response);
    const result = await tools.erply_create_purchase_order_from_attachment.handler({
      customerId: 12,
      currency: "EUR",
    });
    expect(client.postMultipart).toHaveBeenCalledWith(
      "/attachments/add_purchase_order",
      expect.any(FormData),
      expect.objectContaining({ customerId: 12, currency: "EUR" }),
    );
    const form = vi.mocked(client.postMultipart).mock.calls[0][1] as FormData;
    expect(form.get("file")).toBeNull();
    expect(JSON.parse(result.content[0].text).id).toBe(88);
  });

  it("POSTs multipart with a file", async () => {
    vi.mocked(client.postMultipart).mockResolvedValue(attachmentsFixture.purchase_order_response);
    const fileBase64 = Buffer.from("po", "utf8").toString("base64");
    await tools.erply_create_purchase_order_from_attachment.handler({
      fileBase64,
      fileName: "po.pdf",
      customerId: 12,
    });
    const form = vi.mocked(client.postMultipart).mock.calls[0][1] as FormData;
    expect(form.get("file")).toBeTruthy();
  });
});

describe("erply_link_attachment_to_erply_invoice", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createAttachmentInboxTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createAttachmentInboxTools(client);
  });

  it("POSTs when documentId is omitted", async () => {
    vi.mocked(client.post).mockResolvedValue(attachmentsFixture.erply_invoice_response);
    const result = await tools.erply_link_attachment_to_erply_invoice.handler({
      attachmentId: 101,
      baseDocumentIds: "55",
    });
    expect(client.post).toHaveBeenCalledWith("/attachments/erply_invoice_only", undefined, {
      attachmentId: 101,
      baseDocumentIds: "55",
    });
    expect(JSON.parse(result.content[0].text).documentId).toBe(55);
  });

  it("PUTs when documentId is set", async () => {
    vi.mocked(client.put).mockResolvedValue(attachmentsFixture.erply_invoice_response);
    await tools.erply_link_attachment_to_erply_invoice.handler({
      attachmentId: 101,
      documentId: 55,
    });
    expect(client.put).toHaveBeenCalledWith("/attachments/erply_invoice_only/55", undefined, {
      attachmentId: 101,
      baseDocumentIds: undefined,
    });
  });

  it("describes base-document linking, not Purchase Inbox attach", () => {
    expect(tools.erply_link_attachment_to_erply_invoice.description).toMatch(
      /Link base documents \(waybills \/ orders\)/,
    );
    expect(tools.erply_link_attachment_to_erply_invoice.description).toMatch(
      /does not attach a Purchase Inbox item/,
    );
    expect(tools.erply_link_attachment_to_erply_invoice.description).toMatch(
      /erply_attach_inbox_item_to_document/,
    );
  });
});
