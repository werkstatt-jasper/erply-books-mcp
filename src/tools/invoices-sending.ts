import { z } from "zod";

import type { ErplyBooksClient } from "../client.js";
import type { Attachment } from "../types/attachments.js";
import type { EmailInfo } from "../types/invoices-extras.js";
import {
  optionalBoolean,
  optionalPositiveInt,
  optionalString,
  parseToolArgs,
  positiveInt,
} from "../validation/tool-args.js";
import { decodeBase64File, normalizeFileBase64 } from "./file-base64.js";
import { bytesToolResult, jsonToolResult, mutationToolResult } from "./list-response.js";

/** Accept comma-separated string or non-empty number array → API string. */
const idsQuerySchema = z.union([z.string().min(1), z.array(positiveInt).min(1)]);

function toIdsString(ids: string | number[]): string {
  return Array.isArray(ids) ? ids.join(",") : ids;
}

const emailFieldsSchema = {
  receiver: optionalString,
  subject: optionalString,
  body: optionalString,
  sender: optionalString,
  senderName: optionalString,
  additionalTypes: optionalString,
};

const emailInputProperties = {
  receiver: { type: "string", description: "Recipient email" },
  subject: { type: "string" },
  body: { type: "string" },
  sender: { type: "string" },
  senderName: { type: "string" },
  additionalTypes: { type: "string" },
};

function emailBody(args: EmailInfo): EmailInfo {
  const { receiver, subject, body, sender, senderName, additionalTypes } = args;
  return { receiver, subject, body, sender, senderName, additionalTypes };
}

const getInvoicePdfV1Schema = z.object({
  documentId: positiveInt,
  template: optionalString,
  hash: optionalString,
});

const sendInvoiceEmailByHashSchema = z.object({
  hash: z.string().min(1),
  documentId: optionalPositiveInt,
  ...emailFieldsSchema,
});

const importQuerySchema = {
  encoding: optionalString,
  dateFormatCode: optionalString,
  separatorField: optionalString,
  decimalSeparator: optionalString,
  useDot: optionalBoolean,
  detectDateFormatAutomatically: optionalBoolean,
  projectId: optionalPositiveInt,
  type: optionalString,
  typeCode: optionalString,
  opDate: optionalString,
  order: optionalString,
  includeHeader: optionalBoolean,
  syncWarehouse: optionalBoolean,
  getPreview: optionalBoolean,
};

const importQueryInputProperties = {
  encoding: { type: "string", description: "File encoding (e.g. UTF-8)" },
  dateFormatCode: { type: "string" },
  separatorField: { type: "string", description: "CSV field separator" },
  decimalSeparator: { type: "string" },
  useDot: { type: "boolean" },
  detectDateFormatAutomatically: { type: "boolean" },
  projectId: { type: "number" },
  type: { type: "string" },
  typeCode: { type: "string", description: "DOCUMENT_* type code for imported rows" },
  opDate: { type: "string", description: "Operation date" },
  order: { type: "string" },
  includeHeader: { type: "boolean", description: "First row is a header" },
  syncWarehouse: { type: "boolean" },
  getPreview: {
    type: "boolean",
    description: "Preview without committing. Prefer true until the mapping looks correct.",
  },
};

const importInvoicesFileSchema = z.object({
  fileBase64: z.string().min(1),
  fileName: z.string().min(1),
  ...importQuerySchema,
});

const importInvoicesFormsubmitSchema = z
  .object({
    fileBase64: z.string().min(1),
    fileName: z.string().min(1),
    ...importQuerySchema,
  })
  .passthrough();

const sendErplyInvoiceSchema = z.object({
  documentId: positiveInt,
  ...emailFieldsSchema,
});

const sendErplyInvoicesSchema = z
  .object({
    ids: idsQuerySchema.optional(),
    partnerDocumentIds: idsQuerySchema.optional(),
    ...emailFieldsSchema,
  })
  .superRefine((val, ctx) => {
    if (val.ids == null && val.partnerDocumentIds == null) {
      ctx.addIssue({
        code: "custom",
        message: "ids or partnerDocumentIds is required",
        path: ["ids"],
      });
    }
  });

function importQueryFrom(args: {
  encoding?: string;
  dateFormatCode?: string;
  separatorField?: string;
  decimalSeparator?: string;
  useDot?: boolean;
  detectDateFormatAutomatically?: boolean;
  projectId?: number;
  type?: string;
  typeCode?: string;
  opDate?: string;
  order?: string;
  includeHeader?: boolean;
  syncWarehouse?: boolean;
  getPreview?: boolean;
}): Record<string, string | number | boolean | undefined> {
  return {
    encoding: args.encoding,
    dateFormatCode: args.dateFormatCode,
    separatorField: args.separatorField,
    decimalSeparator: args.decimalSeparator,
    useDot: args.useDot,
    detectDateFormatAutomatically: args.detectDateFormatAutomatically,
    projectId: args.projectId,
    type: args.type,
    typeCode: args.typeCode,
    opDate: args.opDate,
    order: args.order,
    includeHeader: args.includeHeader,
    syncWarehouse: args.syncWarehouse,
    getPreview: args.getPreview,
  };
}

export function createInvoiceSendingTools(client: ErplyBooksClient) {
  return {
    erply_get_invoice_pdf_v1: {
      description:
        "Fetch an invoice PDF as binary bytes (GET /invoices/pdf/{documentId}). Requires documentId. Optional template and hash. " +
        'Response is JSON when the API returns JSON; otherwise UTF-8 text or base64 (encoding: "base64"). ' +
        "Prefer erply_get_invoice_pdf (GET /invoices/pdf/v2/{documentId}) for a JSON payload.",
      inputSchema: {
        type: "object" as const,
        properties: {
          documentId: { type: "number", description: "Document id (required)" },
          template: { type: "string", description: "Print template code" },
          hash: { type: "string", description: "Optional document hash" },
        },
        required: ["documentId"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(getInvoicePdfV1Schema, params);
        const { documentId, template, hash } = args;
        const bytes = await client.getArrayBuffer(`/invoices/pdf/${documentId}`, {
          template,
          hash,
        });
        return bytesToolResult(bytes);
      },
    },

    erply_send_invoice_email_by_hash: {
      description:
        "Email an invoice by document hash (POST /invoices/email/{hash} or /invoices/email/{hash}/{documentId}). " +
        "Requires hash. Optional documentId selects the longer path. Optional APIEmailInfo fields (receiver, subject, body, sender, senderName, additionalTypes). " +
        "Prefer erply_send_invoice_email (POST /invoices/email/simple) when you have a documentId.",
      inputSchema: {
        type: "object" as const,
        properties: {
          hash: { type: "string", description: "Document hash (required)" },
          documentId: {
            type: "number",
            description: "Document id; when set, appended to the path",
          },
          ...emailInputProperties,
        },
        required: ["hash"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(sendInvoiceEmailByHashSchema, params);
        const { hash, documentId, ...email } = args;
        const path =
          documentId === undefined
            ? `/invoices/email/${hash}`
            : `/invoices/email/${hash}/${documentId}`;
        const result = await client.post(path, emailBody(email));
        return mutationToolResult(result);
      },
    },

    erply_import_invoices_file: {
      description:
        "Import invoices from a CSV/file upload (POST /invoices/import/file multipart). Requires fileBase64 and fileName. " +
        "Optional query: encoding, dateFormatCode, separatorField, decimalSeparator, useDot, detectDateFormatAutomatically, " +
        "projectId, type, typeCode, opDate, order, includeHeader, syncWarehouse, getPreview. " +
        "Response is text/html. Prefer getPreview=true until the mapping looks correct.",
      inputSchema: {
        type: "object" as const,
        properties: {
          fileBase64: {
            type: "string",
            description: "Invoice CSV/file contents as base64 (required)",
          },
          fileName: {
            type: "string",
            description: "Original file name including extension, e.g. invoices.csv (required)",
          },
          ...importQueryInputProperties,
        },
        required: ["fileBase64", "fileName"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(importInvoicesFileSchema, params);
        const { fileBase64, fileName, ...query } = args;
        const file = decodeBase64File(fileBase64, fileName);
        const form = new FormData();
        form.append("file", file, fileName);
        const html = await client.request<string>("/invoices/import/file", {
          method: "POST",
          formData: form,
          params: importQueryFrom(query),
          parseAs: "text",
        });
        return jsonToolResult({ contentType: "text/html", body: html });
      },
    },

    erply_import_invoices_formsubmit: {
      description:
        "Import invoices from a JSON APIAttachmentInfo body (POST /invoices/import/formsubmit). Requires fileBase64 and fileName " +
        "(mapped to filename/base64). Same optional query params as erply_import_invoices_file. Extra APIAttachmentInfo fields may be passed through. " +
        "Response is text/html. Prefer getPreview=true until the mapping looks correct.",
      inputSchema: {
        type: "object" as const,
        properties: {
          fileBase64: {
            type: "string",
            description: "Invoice CSV/file contents as base64 (required)",
          },
          fileName: {
            type: "string",
            description: "Original file name including extension (required)",
          },
          ...importQueryInputProperties,
        },
        required: ["fileBase64", "fileName"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(importInvoicesFormsubmitSchema, params);
        const { fileBase64, fileName, ...rest } = args;
        const query = importQueryFrom(rest);
        const body: Attachment = {
          ...rest,
          filename: fileName,
          base64: normalizeFileBase64(fileBase64),
        };
        for (const key of Object.keys(query)) {
          delete body[key];
        }
        const html = await client.request<string>("/invoices/import/formsubmit", {
          method: "POST",
          body,
          params: query,
          parseAs: "text",
        });
        return jsonToolResult({ contentType: "text/html", body: html });
      },
    },

    erply_send_erply_invoice: {
      description:
        "Send one invoice via Erply-managed delivery (POST /invoices/send_erply_invoice/{documentId}). Requires documentId. " +
        "Optional APIEmailInfo fields (receiver, subject, body, sender, senderName, additionalTypes).",
      inputSchema: {
        type: "object" as const,
        properties: {
          documentId: { type: "number", description: "Document id (required)" },
          ...emailInputProperties,
        },
        required: ["documentId"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(sendErplyInvoiceSchema, params);
        const { documentId, ...email } = args;
        const result = await client.post(
          `/invoices/send_erply_invoice/${documentId}`,
          emailBody(email),
        );
        return mutationToolResult(result);
      },
    },

    erply_send_erply_invoices: {
      description:
        "Send invoices via Erply-managed delivery (POST /invoices/send_erply_invoices). Requires ids or partnerDocumentIds " +
        "(comma-separated string or number array). Optional APIEmailInfo fields (receiver, subject, body, sender, senderName, additionalTypes).",
      inputSchema: {
        type: "object" as const,
        properties: {
          ids: {
            description: "Document id(s): comma-separated string or number array",
            oneOf: [{ type: "string" }, { type: "array", items: { type: "number" }, minItems: 1 }],
          },
          partnerDocumentIds: {
            description: "Partner document id(s): comma-separated string or number array",
            oneOf: [{ type: "string" }, { type: "array", items: { type: "number" }, minItems: 1 }],
          },
          ...emailInputProperties,
        },
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(sendErplyInvoicesSchema, params);
        const { ids, partnerDocumentIds, ...email } = args;
        const result = await client.post("/invoices/send_erply_invoices", emailBody(email), {
          ids: ids === undefined ? undefined : toIdsString(ids),
          partnerDocumentIds:
            partnerDocumentIds === undefined ? undefined : toIdsString(partnerDocumentIds),
        });
        return mutationToolResult(result);
      },
    },
  };
}

/** Exported for unit tests. */
export const __test__ = { toIdsString, emailBody, importQueryFrom };
