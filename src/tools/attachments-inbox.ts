import { z } from "zod";

import type { ErplyBooksClient } from "../client.js";
import type {
  Attachment,
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
import { ocrTextFromListItems } from "./attachment-ocr.js";
import { decodeBase64File } from "./file-base64.js";
import { jsonToolResult, mutationToolResult, unwrapListEnvelope } from "./list-response.js";

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
  includeOcrText: optionalBoolean,
});

const DEFAULT_CONFIRM_STATUS = "STATUS_CONFIRMED";

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
  .passthrough()
  .superRefine((v, ctx) => {
    if (v.documentId !== undefined && v.attachmentId === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["attachmentId"],
        message:
          "attachmentId is required when documentId is set (use list field attachmentId, not id or activityItemId)",
      });
    }
    if (v.documentId !== undefined && v.activityItemId !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["activityItemId"],
        message:
          "omit activityItemId when linking to a document — the live API 409s with Cannot Find File Information",
      });
    }
  });

const attachInboxToDocumentSchema = z.object({
  attachmentId: positiveInt,
  documentId: positiveInt,
  documentStatusTypeCode: optionalString,
});

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
        "Read parsed invoice data from a digitized Purchase Inbox attachment (GET /attachments/parse/{attachmentId}). " +
        "Requires attachmentId. Optional onlyParseTotal, isEmail, customerId, baseDocumentIds, orgId, isSalesDocument. " +
        "Parse accuracy is upstream Erply; when the structured fields are wrong, pass includeOcrText=true to merge " +
        "ocrText (raw pipe-delimited OCR from the list record, item.alternativeValue9). Lookup failures set ocrText to null.",
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
          includeOcrText: {
            type: "boolean",
            description: "Also fetch raw OCR text from the attachment list record",
          },
        },
        required: ["attachmentId"],
      },
      handler: async (params: unknown) => {
        const { attachmentId, includeOcrText, ...query } = parseToolArgs(
          parseAttachmentSchema,
          params,
        );
        const parsed = await client.get<ParsedAttachmentInfo>(
          `/attachments/parse/${attachmentId}`,
          query,
        );
        if (!includeOcrText) {
          return jsonToolResult(parsed);
        }
        let ocrText: string | null = null;
        try {
          const listResponse = await client.get("/attachments/all", {
            attachmentId: String(attachmentId),
            getEverything: true,
          });
          const { items } = unwrapListEnvelope<Attachment>(listResponse);
          ocrText = ocrTextFromListItems(items, attachmentId);
        } catch {
          ocrText = null;
        }
        return jsonToolResult({ ...parsed, ocrText });
      },
    },

    erply_confirm_attachment: {
      description:
        "Ask confirmation / approve a Purchase Inbox attachment (POST /attachments/confirm JSON APIDocumentConfirmationInfo). " +
        "To associate an existing inbox item with an existing document, prefer erply_attach_inbox_item_to_document. " +
        "That recipe is attachmentId (list field, not id/activityItemId) + documentId; documentStatusTypeCode defaults to STATUS_CONFIRMED. " +
        "Passing activityItemId together with documentId 409s (Cannot Find File Information). " +
        "Confirm writes a confirmation log — the inbox row documentId stays 0. " +
        "Optional waitingForUserId, additionalMessage, customEmail, sendEmail. Extra fields are passed through. Live API rejects multipart (HTTP 415).",
      inputSchema: {
        type: "object" as const,
        properties: {
          id: { type: "number", description: "Confirmation id when updating" },
          attachmentId: {
            type: "number",
            description: "List field attachmentId (required when documentId is set)",
          },
          documentId: { type: "number", description: "Existing document id to confirm against" },
          activityItemId: {
            type: "number",
            description: "Do not pass with documentId — live API 409s",
          },
          activityItemAttachmentId: { type: "number" },
          documentStatusTypeCode: {
            type: "string",
            description: "Defaults to STATUS_CONFIRMED",
          },
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
        const result = await client.post<DocumentConfirmationInfo>("/attachments/confirm", {
          ...args,
          documentStatusTypeCode: args.documentStatusTypeCode ?? DEFAULT_CONFIRM_STATUS,
        });
        return mutationToolResult(result);
      },
    },

    erply_attach_inbox_item_to_document: {
      description:
        "Associate an existing Purchase Inbox item with an existing document (POST /attachments/confirm). " +
        "Requires attachmentId (from erply_list_attachments — not id or activityItemId) and documentId. " +
        "documentStatusTypeCode defaults to STATUS_CONFIRMED. " +
        "This is the live API path: do not pass activityItemId (409 Cannot Find File Information). " +
        "Creates a confirmation on the inbox item; the inbox row documentId stays 0 and GET invoice attachments may still be null. " +
        "To upload a new file onto a document, use erply_create_attachment with documentId. " +
        "GET /attachments/all/{id} often returns truncated NO_CONTENT, so re-uploading the original inbox bytes is not possible.",
      inputSchema: {
        type: "object" as const,
        properties: {
          attachmentId: {
            type: "number",
            description: "Purchase Inbox attachmentId from erply_list_attachments (required)",
          },
          documentId: {
            type: "number",
            description: "Existing document/invoice id (required)",
          },
          documentStatusTypeCode: {
            type: "string",
            description: "Defaults to STATUS_CONFIRMED",
          },
        },
        required: ["attachmentId", "documentId"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(attachInboxToDocumentSchema, params);
        const result = await client.post<DocumentConfirmationInfo>("/attachments/confirm", {
          attachmentId: args.attachmentId,
          documentId: args.documentId,
          documentStatusTypeCode: args.documentStatusTypeCode ?? DEFAULT_CONFIRM_STATUS,
        });
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
        "attachmentId is a spec query param but does not attach a Purchase Inbox item to a document — use erply_attach_inbox_item_to_document.",
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
