import { z } from "zod";

import type { ErplyBooksClient } from "../client.js";
import type {
  DocumentConfirmationInfo,
  ParsedAttachmentInfo,
  PurchaseOrderFromAttachmentInfo,
} from "../types/attachments.js";
import {
  optionalBoolean,
  optionalPositiveInt,
  optionalString,
  parseToolArgs,
  positiveInt,
} from "../validation/tool-args.js";
import { decodeBase64File } from "./file-base64.js";
import { jsonToolResult, mutationToolResult } from "./list-response.js";

const itemIdSchema = z.object({
  itemId: positiveInt,
});

const parseAttachmentSchema = z.object({
  attachmentId: positiveInt,
  onlyParseTotal: optionalBoolean,
  isEmail: optionalBoolean,
  customerId: optionalPositiveInt,
  baseDocumentIds: optionalString,
  orgId: optionalPositiveInt,
  isSalesDocument: optionalBoolean,
});

const confirmAttachmentSchema = z
  .object({
    id: optionalPositiveInt,
    attachmentId: optionalPositiveInt,
    documentId: optionalPositiveInt,
    activityItemId: optionalPositiveInt,
    activityItemAttachmentId: optionalPositiveInt,
    documentStatusTypeCode: optionalString,
    createDatetime: optionalString,
    creatorUserId: optionalPositiveInt,
    waitingForUserId: optionalPositiveInt,
    additionalMessage: optionalString,
    customEmail: optionalString,
    sendEmail: optionalBoolean,
  })
  .passthrough();

const markNotDigitizableSchema = z.object({
  itemId: positiveInt,
  info: optionalString,
});

const purchaseOrderSchema = z
  .object({
    fileBase64: optionalString,
    fileName: optionalString,
    customerId: optionalPositiveInt,
    articleId: optionalPositiveInt,
    projectId: optionalPositiveInt,
    documentInfoId: optionalPositiveInt,
    lang: optionalString,
    status: optionalString,
    additionalPercentage: optionalString,
    baseDocumentId: optionalPositiveInt,
    currency: optionalString,
    ATTRIBUTE_GROSS_WEIGHT: optionalString,
    ATTRIBUTE_LICENCEPLATE: optionalString,
    ATTRIBUTE_UNLADEN_WEIGHT: optionalString,
  })
  .superRefine((v, ctx) => {
    const hasPartial =
      (v.fileBase64 !== undefined && v.fileBase64.length > 0) !==
      (v.fileName !== undefined && v.fileName.length > 0);
    if (hasPartial) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "fileBase64 and fileName are required together",
      });
    }
  });

const linkErplyInvoiceSchema = z.object({
  attachmentId: optionalPositiveInt,
  baseDocumentIds: optionalString,
  documentId: optionalPositiveInt,
});

export function createAttachmentInboxTools(client: ErplyBooksClient) {
  return {
    erply_digitize_attachment: {
      description:
        "Trigger OCR/digitization of a Purchase Inbox attachment (PUT /attachments/digitize/{itemId}). Requires itemId. Spec has no field docs; live orgs may return 409 MODULE_* on restricted plans.",
      inputSchema: {
        type: "object" as const,
        properties: {
          itemId: { type: "number", description: "Attachment/inbox item id (required)" },
        },
        required: ["itemId"],
      },
      handler: async (params: unknown) => {
        const { itemId } = parseToolArgs(itemIdSchema, params);
        const result = await client.put(`/attachments/digitize/${itemId}`);
        return mutationToolResult(result);
      },
    },

    erply_parse_attachment: {
      description:
        "Read parsed invoice data from a digitized Purchase Inbox attachment (GET /attachments/parse/{attachmentId}). Requires attachmentId. Optional onlyParseTotal, isEmail, customerId, baseDocumentIds, orgId, isSalesDocument.",
      inputSchema: {
        type: "object" as const,
        properties: {
          attachmentId: { type: "number", description: "Attachment id (required)" },
          onlyParseTotal: { type: "boolean" },
          isEmail: { type: "boolean" },
          customerId: { type: "number" },
          baseDocumentIds: { type: "string", description: "Comma-separated base document ids" },
          orgId: { type: "number" },
          isSalesDocument: { type: "boolean" },
        },
        required: ["attachmentId"],
      },
      handler: async (params: unknown) => {
        const { attachmentId, ...query } = parseToolArgs(parseAttachmentSchema, params);
        const parsed = await client.get<ParsedAttachmentInfo>(
          `/attachments/parse/${attachmentId}`,
          query,
        );
        return jsonToolResult(parsed);
      },
    },

    erply_confirm_attachment: {
      description:
        "Ask confirmation / approve a Purchase Inbox attachment (POST /attachments/confirm JSON APIDocumentConfirmationInfo). Pass attachmentId and optional waitingForUserId, additionalMessage, customEmail, sendEmail, documentStatusTypeCode, documentId. Extra fields are passed through. Spec has no operation description; live API rejects multipart (HTTP 415).",
      inputSchema: {
        type: "object" as const,
        properties: {
          id: { type: "number", description: "Confirmation id when updating" },
          attachmentId: { type: "number", description: "Attachment/inbox item id" },
          documentId: { type: "number" },
          activityItemId: { type: "number" },
          activityItemAttachmentId: { type: "number" },
          documentStatusTypeCode: { type: "string" },
          createDatetime: { type: "string" },
          creatorUserId: { type: "number" },
          waitingForUserId: { type: "number", description: "User id to ask for confirmation" },
          additionalMessage: { type: "string" },
          customEmail: { type: "string" },
          sendEmail: { type: "boolean" },
        },
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(confirmAttachmentSchema, params);
        const result = await client.post<DocumentConfirmationInfo>("/attachments/confirm", args);
        return mutationToolResult(result);
      },
    },

    erply_mark_attachment_opened: {
      description:
        "Mark a Purchase Inbox attachment as opened (PUT /attachments/mark_attachment_as_opened/{itemId}). Requires itemId.",
      inputSchema: {
        type: "object" as const,
        properties: {
          itemId: { type: "number", description: "Attachment/inbox item id (required)" },
        },
        required: ["itemId"],
      },
      handler: async (params: unknown) => {
        const { itemId } = parseToolArgs(itemIdSchema, params);
        const result = await client.put(`/attachments/mark_attachment_as_opened/${itemId}`);
        return mutationToolResult(result);
      },
    },

    erply_mark_attachment_not_digitizable: {
      description:
        "Flag a Purchase Inbox attachment as not digitizable (PUT /attachments/not_digitizable/{itemId}). Requires itemId. Optional info note.",
      inputSchema: {
        type: "object" as const,
        properties: {
          itemId: { type: "number", description: "Attachment/inbox item id (required)" },
          info: { type: "string", description: "Optional reason/note" },
        },
        required: ["itemId"],
      },
      handler: async (params: unknown) => {
        const { itemId, info } = parseToolArgs(markNotDigitizableSchema, params);
        const result = await client.put(`/attachments/not_digitizable/${itemId}`, undefined, {
          info,
        });
        return mutationToolResult(result);
      },
    },

    erply_create_purchase_order_from_attachment: {
      description:
        "Convert a Purchase Inbox item to a purchase order (POST /attachments/add_purchase_order multipart). Optional fileBase64+fileName and query fields: customerId, articleId, projectId, documentInfoId, lang, status, additionalPercentage, baseDocumentId, currency, ATTRIBUTE_GROSS_WEIGHT, ATTRIBUTE_LICENCEPLATE, ATTRIBUTE_UNLADEN_WEIGHT.",
      inputSchema: {
        type: "object" as const,
        properties: {
          fileBase64: { type: "string", description: "Optional file contents as base64" },
          fileName: { type: "string", description: "Optional original file name" },
          customerId: { type: "number" },
          articleId: { type: "number" },
          projectId: { type: "number" },
          documentInfoId: { type: "number" },
          lang: { type: "string" },
          status: { type: "string" },
          additionalPercentage: { type: "string" },
          baseDocumentId: { type: "number" },
          currency: { type: "string" },
          ATTRIBUTE_GROSS_WEIGHT: { type: "string" },
          ATTRIBUTE_LICENCEPLATE: { type: "string" },
          ATTRIBUTE_UNLADEN_WEIGHT: { type: "string" },
        },
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(purchaseOrderSchema, params);
        const { fileBase64, fileName, ...query } = args;
        const form = new FormData();
        if (fileBase64 !== undefined && fileName !== undefined) {
          form.append("file", decodeBase64File(fileBase64, fileName), fileName);
        }
        const result = await client.postMultipart<PurchaseOrderFromAttachmentInfo>(
          "/attachments/add_purchase_order",
          form,
          query,
        );
        return mutationToolResult(result);
      },
    },

    erply_link_attachment_to_erply_invoice: {
      description:
        "Link base documents (waybills / orders) to an invoice (POST /attachments/erply_invoice_only, or PUT /attachments/erply_invoice_only/{documentId} when documentId is set). " +
        "Pass baseDocumentIds (comma-separated document ids) or the documentId path. " +
        "attachmentId is a spec query param but does not attach a Purchase Inbox item to a document — that flow is not exposed (see E56).",
      inputSchema: {
        type: "object" as const,
        properties: {
          attachmentId: { type: "number" },
          baseDocumentIds: { type: "string", description: "Comma-separated document ids" },
          documentId: {
            type: "number",
            description: "When set, uses PUT /attachments/erply_invoice_only/{documentId}",
          },
        },
      },
      handler: async (params: unknown) => {
        const { documentId, ...query } = parseToolArgs(linkErplyInvoiceSchema, params);
        const result =
          documentId !== undefined
            ? await client.put(`/attachments/erply_invoice_only/${documentId}`, undefined, query)
            : await client.post("/attachments/erply_invoice_only", undefined, query);
        return mutationToolResult(result);
      },
    },
  };
}
