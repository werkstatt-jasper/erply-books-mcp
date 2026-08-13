import { z } from "zod";

import type { ErplyBooksClient } from "../client.js";
import type { Attachment } from "../types/attachments.js";
import {
  optionalBoolean,
  optionalNonNegativeInt,
  optionalPositiveInt,
  optionalString,
  parseToolArgs,
  positiveInt,
} from "../validation/tool-args.js";
import { normalizeFileBase64 } from "./file-base64.js";
import { jsonToolResult, mutationToolResult, unwrapListEnvelope } from "./list-response.js";

const listAttachmentsSchema = z.object({
  attachmentId: optionalString,
  documentId: optionalPositiveInt,
  customerId: optionalPositiveInt,
  dateTo: optionalString,
  start: optionalNonNegativeInt,
  limit: optionalPositiveInt,
  getEverything: optionalBoolean,
  transactionEntryId: optionalPositiveInt,
  projectId: optionalString,
  description: optionalString,
  activityItemId: optionalPositiveInt,
  changedSince: optionalPositiveInt,
  documentStatusType: optionalString,
  activityItemType: optionalString,
  getNotConnectedInvoices: optionalBoolean,
  getOnlyPartnerSupplierDocuments: optionalBoolean,
  getOnlyLocalSupplierDocuments: optionalBoolean,
  getOnlyNotSupplierConnectedDocuments: optionalBoolean,
  doNotGetInvoice: optionalBoolean,
  getLast10: optionalBoolean,
  getProjectsFromDocuments: optionalBoolean,
  reportGeneratorInput: optionalString,
});

const getAttachmentSchema = z.object({
  attachmentId: positiveInt,
  noDownload: optionalPositiveInt,
});

const createAttachmentSchema = z
  .object({
    fileBase64: z.string().min(1),
    fileName: z.string().min(1),
    documentId: optionalPositiveInt,
    typeCode: optionalString,
    description: optionalString,
    date: optionalString,
    folder: optionalString,
    partnerDocumentId: optionalString,
    contactName: optionalString,
    expenseType: optionalString,
    netTotal: z.coerce
      .number()
      .nullish()
      .transform((v) => v ?? undefined),
    taxSum: z.coerce
      .number()
      .nullish()
      .transform((v) => v ?? undefined),
    taxRateId: optionalPositiveInt,
    total: z.coerce
      .number()
      .nullish()
      .transform((v) => v ?? undefined),
  })
  .passthrough();

const deleteAttachmentSchema = z.object({
  attachmentId: positiveInt,
  documentId: optionalPositiveInt,
});

export function createAttachmentTools(client: ErplyBooksClient) {
  return {
    erply_list_attachments: {
      description:
        "List attachments including Purchase Inbox items (GET /attachments/all). Optional filters: attachmentId, documentId, customerId, dateTo, transactionEntryId, projectId, getEverything, start/limit, activity filters, and inbox-style flags (getNotConnectedInvoices, getOnlyPartnerSupplierDocuments, getOnlyLocalSupplierDocuments, getOnlyNotSupplierConnectedDocuments, doNotGetInvoice, getLast10, getProjectsFromDocuments, reportGeneratorInput). Returns { totalCount, items } when available.",
      inputSchema: {
        type: "object" as const,
        properties: {
          attachmentId: { type: "string", description: "Attachment id filter" },
          documentId: { type: "number", description: "Document id filter" },
          customerId: { type: "number", description: "Customer id filter" },
          dateTo: { type: "string", description: "End date filter" },
          start: { type: "number", description: "Offset (default 0)" },
          limit: { type: "number", description: "Page size" },
          getEverything: { type: "boolean" },
          transactionEntryId: { type: "number" },
          projectId: { type: "string", description: "Project id filter (API string)" },
          description: { type: "string" },
          activityItemId: { type: "number" },
          changedSince: { type: "number", description: "Changed-since timestamp/id filter" },
          documentStatusType: { type: "string" },
          activityItemType: { type: "string" },
          getNotConnectedInvoices: {
            type: "boolean",
            description: "Purchase Inbox: items not yet connected to an invoice",
          },
          getOnlyPartnerSupplierDocuments: {
            type: "boolean",
            description: "Purchase Inbox: partner-supplier documents only",
          },
          getOnlyLocalSupplierDocuments: {
            type: "boolean",
            description: "Purchase Inbox: local-supplier documents only",
          },
          getOnlyNotSupplierConnectedDocuments: {
            type: "boolean",
            description: "Purchase Inbox: documents not connected to a supplier",
          },
          doNotGetInvoice: {
            type: "boolean",
            description: "Omit linked invoice payloads from the list",
          },
          getLast10: { type: "boolean", description: "Return only the last 10 attachments" },
          getProjectsFromDocuments: { type: "boolean" },
          reportGeneratorInput: { type: "string" },
        },
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(listAttachmentsSchema, params);
        const response = await client.get("/attachments/all", args);
        return jsonToolResult(unwrapListEnvelope<Attachment>(response));
      },
    },

    erply_get_attachment: {
      description:
        "Get a single attachment (GET /attachments/all/{attachmentId}). Optional noDownload (integer). Response is APIAttachmentInfo JSON; includes base64 when downloaded.",
      inputSchema: {
        type: "object" as const,
        properties: {
          attachmentId: { type: "number", description: "Attachment id (required)" },
          noDownload: {
            type: "number",
            description: "When set (OpenAPI integer), skip embedding file bytes",
          },
        },
        required: ["attachmentId"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(getAttachmentSchema, params);
        const { attachmentId, noDownload } = args;
        const attachment = await client.get<Attachment>(`/attachments/all/${attachmentId}`, {
          noDownload,
        });
        return jsonToolResult(attachment);
      },
    },

    erply_create_attachment: {
      description:
        "Create/upload an attachment (POST /attachments JSON APIAttachmentInfo). Requires fileName and fileBase64 (mapped to filename/base64). Three modes: (1) attach to an existing invoice — pass documentId and keep total null; (2) add to the Purchase Inbox — omit documentId and keep total null; (3) create an expense document instantly — set total (and optional netTotal, taxRateId, contactName, expenseType, number). Extra APIAttachmentInfo fields may be passed through.",
      inputSchema: {
        type: "object" as const,
        properties: {
          fileBase64: {
            type: "string",
            description: "File contents as base64 (required)",
          },
          fileName: {
            type: "string",
            description: "Original file name including extension (required)",
          },
          documentId: { type: "number", description: "Link to document/invoice id" },
          typeCode: { type: "string" },
          description: { type: "string" },
          date: { type: "string" },
          folder: { type: "string" },
          partnerDocumentId: { type: "string" },
          contactName: { type: "string" },
          expenseType: { type: "string" },
          netTotal: { type: "number" },
          taxSum: { type: "number" },
          taxRateId: { type: "number" },
          total: { type: "number" },
        },
        required: ["fileBase64", "fileName"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(createAttachmentSchema, params);
        const { fileBase64, fileName, ...rest } = args;
        const body: Attachment = {
          ...rest,
          filename: fileName,
          base64: normalizeFileBase64(fileBase64),
        };
        const created = await client.post<Attachment>("/attachments", body);
        return mutationToolResult(created);
      },
    },

    erply_delete_attachment: {
      description:
        "Delete an attachment (DELETE /attachments/{attachmentId}). Optional documentId query param.",
      inputSchema: {
        type: "object" as const,
        properties: {
          attachmentId: { type: "number", description: "Attachment id (required)" },
          documentId: { type: "number", description: "Related document id" },
        },
        required: ["attachmentId"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(deleteAttachmentSchema, params);
        const { attachmentId, documentId } = args;
        const result = await client.delete(`/attachments/${attachmentId}`, { documentId });
        return mutationToolResult(result);
      },
    },
  };
}
