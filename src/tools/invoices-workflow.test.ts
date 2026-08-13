import { beforeEach, describe, expect, it, vi } from "vitest";
import workflowFixture from "../__fixtures__/invoices-workflow.json" with { type: "json" };
import type { ErplyBooksClient } from "../client.js";
import { __test__, createInvoiceWorkflowTools } from "./invoices-workflow.js";
import { createMockClient } from "./test-helpers.js";

describe("toIdsString", () => {
  it("joins number arrays and passes strings through", () => {
    expect(__test__.toIdsString([55, 56])).toBe("55,56");
    expect(__test__.toIdsString("55,56")).toBe("55,56");
  });
});

describe("createInvoiceWorkflowTools", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createInvoiceWorkflowTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createInvoiceWorkflowTools(client);
  });

  describe("erply_add_invoice_attribute", () => {
    it("requires documentId", async () => {
      await expect(tools.erply_add_invoice_attribute.handler({})).rejects.toThrow(/documentId/);
    });

    it("POSTs query params", async () => {
      vi.mocked(client.post).mockResolvedValue(workflowFixture.attribute);
      await tools.erply_add_invoice_attribute.handler({
        documentId: 55,
        attributeName: "NOTE",
        alternativeValue: "rush",
      });
      expect(client.post).toHaveBeenCalledWith(
        "/invoices/add_attribute",
        undefined,
        expect.objectContaining({
          documentId: 55,
          attributeName: "NOTE",
          alternativeValue: "rush",
        }),
      );
    });
  });

  describe("erply_add_invoice_dimension", () => {
    it("joins ids arrays", async () => {
      vi.mocked(client.post).mockResolvedValue(workflowFixture.dimension);
      await tools.erply_add_invoice_dimension.handler({
        ids: [55, 56],
        projectId: "12",
      });
      expect(client.post).toHaveBeenCalledWith("/invoices/add_dimension", undefined, {
        ids: "55,56",
        attachmentId: undefined,
        projectId: "12",
      });
    });

    it("passes string ids through", async () => {
      vi.mocked(client.post).mockResolvedValue(workflowFixture.dimension);
      await tools.erply_add_invoice_dimension.handler({ ids: "55" });
      expect(client.post).toHaveBeenCalledWith(
        "/invoices/add_dimension",
        undefined,
        expect.objectContaining({ ids: "55" }),
      );
    });

    it("omits ids when unset", async () => {
      vi.mocked(client.post).mockResolvedValue(workflowFixture.dimension);
      await tools.erply_add_invoice_dimension.handler({ projectId: "12" });
      expect(client.post).toHaveBeenCalledWith(
        "/invoices/add_dimension",
        undefined,
        expect.objectContaining({ ids: undefined, projectId: "12" }),
      );
    });
  });

  describe("erply_add_invoice_document_connection", () => {
    it("requires documentId and baseDocumentId", async () => {
      await expect(tools.erply_add_invoice_document_connection.handler({})).rejects.toThrow(
        /documentId|baseDocumentId/,
      );
    });

    it("POSTs both ids as query", async () => {
      vi.mocked(client.post).mockResolvedValue(workflowFixture.connection);
      await tools.erply_add_invoice_document_connection.handler({
        documentId: 55,
        baseDocumentId: 40,
      });
      expect(client.post).toHaveBeenCalledWith("/invoices/add_document_connection", undefined, {
        documentId: 55,
        baseDocumentId: 40,
      });
    });
  });

  describe("erply_add_invoice_opposite", () => {
    it("POSTs body and strips registrationCode to query", async () => {
      vi.mocked(client.post).mockResolvedValue(workflowFixture.opposite);
      await tools.erply_add_invoice_opposite.handler({
        id: 55,
        typeCode: "DOCUMENT_SELL",
        date: "2025-06-02",
        rows: [{ id: 1 }],
        extraField: "keep",
        registrationCode: "REG",
      });
      expect(client.post).toHaveBeenCalledWith(
        "/invoices/add_opposite",
        expect.objectContaining({
          id: 55,
          typeCode: "DOCUMENT_SELL",
          date: "2025-06-02",
          extraField: "keep",
        }),
        { registrationCode: "REG" },
      );
      const body = vi.mocked(client.post).mock.calls[0][1] as Record<string, unknown>;
      expect(body).not.toHaveProperty("registrationCode");
    });
  });

  describe("erply_add_invoice_to_queue", () => {
    it("POSTs leftover body with registrationCode query", async () => {
      vi.mocked(client.post).mockResolvedValue(workflowFixture.queue);
      await tools.erply_add_invoice_to_queue.handler({
        registrationCode: "REG",
        note: "queued",
      });
      expect(client.post).toHaveBeenCalledWith(
        "/invoices/add_to_queue",
        expect.objectContaining({ note: "queued" }),
        { registrationCode: "REG" },
      );
    });
  });

  describe("erply_delete_invoice_via_post", () => {
    it("requires id", async () => {
      await expect(tools.erply_delete_invoice_via_post.handler({})).rejects.toThrow(/id/);
    });

    it("POSTs /invoices/delete with id query", async () => {
      vi.mocked(client.post).mockResolvedValue(workflowFixture.delete_post);
      await tools.erply_delete_invoice_via_post.handler({ id: 55, registrationCode: "REG" });
      expect(client.post).toHaveBeenCalledWith("/invoices/delete", undefined, {
        id: 55,
        registrationCode: "REG",
      });
    });
  });

  describe("erply_delete_invoices_multiple_and_payments", () => {
    it("splits query flags from body", async () => {
      vi.mocked(client.post).mockResolvedValue(workflowFixture.delete_multiple);
      await tools.erply_delete_invoices_multiple_and_payments.handler({
        code: "55",
        name: "batch",
        dontDeleteErplyPayments: true,
        extra: 1,
      });
      expect(client.post).toHaveBeenCalledWith(
        "/invoices/delete_multiple_and_payments",
        expect.objectContaining({ code: "55", name: "batch", extra: 1 }),
        { dontDeleteErplyPayments: true, deleteParentPayment: undefined },
      );
    });
  });

  describe("erply_forward_invoice_to_user", () => {
    it("requires userId", async () => {
      await expect(tools.erply_forward_invoice_to_user.handler({})).rejects.toThrow(/userId/);
    });

    it("POSTs userId and joined ids", async () => {
      vi.mocked(client.post).mockResolvedValue(workflowFixture.forward);
      await tools.erply_forward_invoice_to_user.handler({
        userId: 7,
        ids: [55],
        attachmentId: 9,
      });
      expect(client.post).toHaveBeenCalledWith("/invoices/forward_to_user", undefined, {
        userId: 7,
        ids: "55",
        attachmentId: 9,
      });
    });

    it("omits ids when unset", async () => {
      vi.mocked(client.post).mockResolvedValue(workflowFixture.forward);
      await tools.erply_forward_invoice_to_user.handler({ userId: 7 });
      expect(client.post).toHaveBeenCalledWith("/invoices/forward_to_user", undefined, {
        userId: 7,
        ids: undefined,
        attachmentId: undefined,
      });
    });
  });

  describe("erply_override_invoice_fields", () => {
    it("requires documentIds and fieldName", async () => {
      await expect(tools.erply_override_invoice_fields.handler({})).rejects.toThrow(
        /documentIds|fieldName/,
      );
    });

    it("POSTs override query", async () => {
      vi.mocked(client.post).mockResolvedValue(workflowFixture.override);
      await tools.erply_override_invoice_fields.handler({
        documentIds: "55,56",
        fieldName: "note",
        value: "x",
        unlockIfLocked: true,
      });
      expect(client.post).toHaveBeenCalledWith("/invoices/override", undefined, {
        documentIds: "55,56",
        fieldName: "note",
        value: "x",
        documentType: undefined,
        unlockIfLocked: true,
      });
    });
  });

  describe("erply_prepare_invoice_rows", () => {
    it("requires baseDocumentId", async () => {
      await expect(tools.erply_prepare_invoice_rows.handler({})).rejects.toThrow(/baseDocumentId/);
    });

    it("POSTs prepare_rows query", async () => {
      vi.mocked(client.post).mockResolvedValue(workflowFixture.prepare_rows);
      await tools.erply_prepare_invoice_rows.handler({
        baseDocumentId: 40,
        documentType: "DOCUMENT_SELL",
        createWasteDocument: false,
      });
      expect(client.post).toHaveBeenCalledWith(
        "/invoices/prepare_rows",
        undefined,
        expect.objectContaining({
          baseDocumentId: 40,
          documentType: "DOCUMENT_SELL",
          createWasteDocument: false,
        }),
      );
    });
  });

  describe("erply_split_invoice_rows", () => {
    it("POSTs splitting body", async () => {
      vi.mocked(client.post).mockResolvedValue(workflowFixture.split);
      await tools.erply_split_invoice_rows.handler({
        invoiceId: 55,
        oldRows: [{ id: 1 }],
        newRows: [{ id: 2 }],
        custom: true,
      });
      expect(client.post).toHaveBeenCalledWith(
        "/invoices/split_rows",
        expect.objectContaining({
          invoiceId: 55,
          oldRows: [{ id: 1 }],
          newRows: [{ id: 2 }],
          custom: true,
        }),
        { registrationCode: undefined },
      );
    });
  });

  describe("erply_update_invoice_split_rows", () => {
    it("requires documentId", async () => {
      await expect(tools.erply_update_invoice_split_rows.handler({})).rejects.toThrow(/documentId/);
    });

    it("PUTs /invoices/split_rows/{documentId}", async () => {
      vi.mocked(client.put).mockResolvedValue(workflowFixture.split);
      await tools.erply_update_invoice_split_rows.handler({
        documentId: 55,
        newRows: [{ id: 3 }],
        registrationCode: "REG",
      });
      expect(client.put).toHaveBeenCalledWith(
        "/invoices/split_rows/55",
        expect.objectContaining({ newRows: [{ id: 3 }] }),
        { registrationCode: "REG" },
      );
      const body = vi.mocked(client.put).mock.calls[0][1] as Record<string, unknown>;
      expect(body).not.toHaveProperty("documentId");
      expect(body).not.toHaveProperty("registrationCode");
    });
  });

  describe("erply_use_invoice_prepayment", () => {
    it("requires documentId", async () => {
      await expect(tools.erply_use_invoice_prepayment.handler({})).rejects.toThrow(/documentId/);
    });

    it("POSTs prepayment query", async () => {
      vi.mocked(client.post).mockResolvedValue(workflowFixture.prepayment);
      await tools.erply_use_invoice_prepayment.handler({
        documentId: 55,
        paymentId: 90,
        sumPaid: "10.00",
        date: "2025-06-02",
      });
      expect(client.post).toHaveBeenCalledWith(
        "/invoices/use_prepayment",
        undefined,
        expect.objectContaining({
          documentId: 55,
          paymentId: 90,
          sumPaid: "10.00",
          date: "2025-06-02",
        }),
      );
    });
  });

  describe("erply_delete_partner_invoice", () => {
    it("requires invoiceId", async () => {
      await expect(tools.erply_delete_partner_invoice.handler({})).rejects.toThrow(/invoiceId/);
    });

    it("DELETEs with string invoiceId", async () => {
      vi.mocked(client.delete).mockResolvedValue(workflowFixture.partner_delete);
      await tools.erply_delete_partner_invoice.handler({ invoiceId: 902 });
      expect(client.delete).toHaveBeenCalledWith("/invoices/partner", {
        invoiceId: "902",
        registrationCode: undefined,
      });
    });

    it("accepts a string invoiceId", async () => {
      vi.mocked(client.delete).mockResolvedValue(workflowFixture.partner_delete);
      await tools.erply_delete_partner_invoice.handler({ invoiceId: "P-902" });
      expect(client.delete).toHaveBeenCalledWith("/invoices/partner", {
        invoiceId: "P-902",
        registrationCode: undefined,
      });
    });
  });

  describe("erply_update_partner_invoice", () => {
    it("requires documentId", async () => {
      await expect(tools.erply_update_partner_invoice.handler({})).rejects.toThrow(/documentId/);
    });

    it("PUTs partner invoice and keeps extra fields", async () => {
      vi.mocked(client.put).mockResolvedValue(workflowFixture.partner_update);
      const result = await tools.erply_update_partner_invoice.handler({
        documentId: 902,
        typeCode: "DOCUMENT_SELL",
        date: "2025-06-03",
        partnerDocumentId: "P-3",
        searchByCustomerCode: true,
      });
      expect(client.put).toHaveBeenCalledWith(
        "/invoices/partner/902",
        expect.objectContaining({
          id: 902,
          typeCode: "DOCUMENT_SELL",
          partnerDocumentId: "P-3",
        }),
        { registrationCode: undefined, searchByCustomerCode: true },
      );
      expect(JSON.parse(result.content[0].text).id).toBe(902);
    });
  });

  describe("erply_delete_invoice_row", () => {
    it("requires documentId and articleRowId", async () => {
      await expect(tools.erply_delete_invoice_row.handler({})).rejects.toThrow(
        /documentId|articleRowId/,
      );
    });

    it("DELETEs /invoices/{documentId}/rows/{articleRowId}", async () => {
      vi.mocked(client.delete).mockResolvedValue(workflowFixture.delete_row);
      await tools.erply_delete_invoice_row.handler({ documentId: 55, articleRowId: 3 });
      expect(client.delete).toHaveBeenCalledWith("/invoices/55/rows/3");
    });
  });
});
