import { z } from "zod";

import type { ErplyBooksClient } from "../client.js";
import type { Attachment } from "../types/attachments.js";
import {
  optionalPositiveInt,
  optionalString,
  parseToolArgs,
  positiveInt,
} from "../validation/tool-args.js";
import { decodeBase64File, normalizeFileBase64 } from "./file-base64.js";
import { bytesToolResult, jsonToolResult, mutationToolResult } from "./list-response.js";

const attachmentIdSchema = z.object({
  attachmentId: positiveInt,
});

const previewSchema = z.object({
  attachmentId: optionalPositiveInt,
});

const htmlTemplateSchema = z.object({
  attachmentId: optionalPositiveInt,
  documentId: optionalPositiveInt,
  attachmentType: optionalString,
});

const zipSchema = z.object({
  documentId: positiveInt,
});

const summaryInvoiceSchema = z.object({
  attachmentId: positiveInt,
  invoiceIds: optionalString,
});

const childSchema = z.object({
  attachmentId: positiveInt,
  noDownload: optionalPositiveInt,
});

const fileItemSchema = z
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
    total: z.coerce
      .number()
      .nullish()
      .transform((v) => v ?? undefined),
  })
  .passthrough();

const multipleSchema = z.object({
  files: z.array(fileItemSchema).min(1),
});

const simpleFileSchema = z.object({
  fileBase64: z.string().min(1),
  fileName: z.string().min(1),
});

const digiQuerySchema = {
  encoding: optionalString,
  separatorField: optionalString,
  type: optionalString,
};

const digiBase64Schema = z
  .object({
    fileBase64: z.string().min(1),
    fileName: z.string().min(1),
    ...digiQuerySchema,
  })
  .passthrough();

const digiFormSchema = z.object({
  fileBase64: z.string().min(1),
  fileName: z.string().min(1),
  ...digiQuerySchema,
});

const countryFromParserSchema = z
  .object({
    code: optionalString,
    name: optionalString,
  })
  .passthrough();

const kycJsonSchema = z
  .object({
    fileBase64: z.string().min(1),
    fileName: z.string().min(1),
    documentId: optionalPositiveInt,
    description: optionalString,
  })
  .passthrough();

const deleteViaPostSchema = z.object({
  id: positiveInt,
  documentId: optionalPositiveInt,
});

const deleteActivitySchema = z.object({
  activityItemAttachmentId: positiveInt,
  transactionEntryId: optionalPositiveInt,
  customerId: optionalPositiveInt,
  activityItemType: optionalString,
});

function toApiAttachment(args: {
  fileBase64: string;
  fileName: string;
  [key: string]: unknown;
}): Attachment {
  const { fileBase64, fileName, ...rest } = args;
  return {
    ...rest,
    filename: fileName,
    base64: normalizeFileBase64(fileBase64),
  };
}

export function createAttachmentExtraTools(client: ErplyBooksClient) {
  return {
    erply_get_attachment_preview: {
      description:
        "Fetch a Purchase Inbox / attachment preview (GET /attachments/preview). Returns text/html (client sends Accept: text/html; application/json yields HTTP 406). Optional attachmentId.",
      inputSchema: {
        type: "object" as const,
        properties: {
          attachmentId: { type: "number" },
        },
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(previewSchema, params);
        const html = await client.getText("/attachments/preview", args);
        return jsonToolResult({ contentType: "text/html", body: html });
      },
    },

    erply_get_attachment_html_template: {
      description:
        "Fetch an attachment HTML template (GET /attachments/html_template). Optional attachmentId, documentId, attachmentType.",
      inputSchema: {
        type: "object" as const,
        properties: {
          attachmentId: { type: "number" },
          documentId: { type: "number" },
          attachmentType: { type: "string" },
        },
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(htmlTemplateSchema, params);
        const result = await client.get("/attachments/html_template", args);
        return jsonToolResult(result);
      },
    },

    erply_get_attachments_zip: {
      description:
        "Download a zip of attachments for a document (GET /attachments/zip_file/{documentId}). Requires documentId.",
      inputSchema: {
        type: "object" as const,
        properties: {
          documentId: { type: "number", description: "Document id (required)" },
        },
        required: ["documentId"],
      },
      handler: async (params: unknown) => {
        const { documentId } = parseToolArgs(zipSchema, params);
        const result = await client.get(`/attachments/zip_file/${documentId}`);
        return jsonToolResult(result);
      },
    },

    erply_get_summary_invoice: {
      description:
        "Fetch a summary invoice built from attachments (GET /attachments/summary_invoice/{attachmentId}). Requires attachmentId. Optional invoiceIds (comma-separated).",
      inputSchema: {
        type: "object" as const,
        properties: {
          attachmentId: { type: "number", description: "Attachment id (required)" },
          invoiceIds: { type: "string", description: "Comma-separated invoice ids" },
        },
        required: ["attachmentId"],
      },
      handler: async (params: unknown) => {
        const { attachmentId, invoiceIds } = parseToolArgs(summaryInvoiceSchema, params);
        const result = await client.get(`/attachments/summary_invoice/${attachmentId}`, {
          invoiceIds,
        });
        return jsonToolResult(result);
      },
    },

    erply_get_attachment_child: {
      description:
        'Get a child / e-invoice attachment (GET /attachments/{attachmentId}/child). Requires attachmentId. Optional noDownload. Response is JSON when the API returns JSON; otherwise UTF-8 text or base64 (encoding: "base64").',
      inputSchema: {
        type: "object" as const,
        properties: {
          attachmentId: { type: "number", description: "Attachment id (required)" },
          noDownload: {
            type: "number",
            description: "When set, skip embedding file bytes",
          },
        },
        required: ["attachmentId"],
      },
      handler: async (params: unknown) => {
        const { attachmentId, noDownload } = parseToolArgs(childSchema, params);
        const bytes = await client.getArrayBuffer(`/attachments/${attachmentId}/child`, {
          noDownload,
        });
        return bytesToolResult(bytes);
      },
    },

    erply_create_attachments_multiple: {
      description:
        "Upload multiple attachments (POST /attachments/multiple JSON array of APIAttachmentInfo). Requires files: [{ fileBase64, fileName, ... }]. Mapped to filename/base64 like erply_create_attachment.",
      inputSchema: {
        type: "object" as const,
        properties: {
          files: {
            type: "array",
            description: "Attachments to upload (required, non-empty)",
            items: {
              type: "object",
              properties: {
                fileBase64: { type: "string" },
                fileName: { type: "string" },
                documentId: { type: "number" },
                typeCode: { type: "string" },
                description: { type: "string" },
                date: { type: "string" },
                folder: { type: "string" },
                partnerDocumentId: { type: "string" },
                contactName: { type: "string" },
                expenseType: { type: "string" },
                total: { type: "number" },
              },
              required: ["fileBase64", "fileName"],
            },
          },
        },
        required: ["files"],
      },
      handler: async (params: unknown) => {
        const { files } = parseToolArgs(multipleSchema, params);
        const body = files.map((file) => toApiAttachment(file));
        const result = await client.post("/attachments/multiple", body);
        return mutationToolResult(result);
      },
    },

    erply_create_attachment_simple: {
      description:
        "Upload a single attachment via the simple endpoint (POST /attachments/simple multipart). Requires fileBase64 and fileName.",
      inputSchema: {
        type: "object" as const,
        properties: {
          fileBase64: { type: "string", description: "File contents as base64 (required)" },
          fileName: { type: "string", description: "Original file name (required)" },
        },
        required: ["fileBase64", "fileName"],
      },
      handler: async (params: unknown) => {
        const { fileBase64, fileName } = parseToolArgs(simpleFileSchema, params);
        const form = new FormData();
        form.append("file", decodeBase64File(fileBase64, fileName), fileName);
        const result = await client.postMultipart("/attachments/simple", form);
        return mutationToolResult(result);
      },
    },

    erply_get_digi_attachment: {
      description:
        "Get a digitized document attachment from the digi queue (GET /attachments/digi/{attachmentId}). Requires attachmentId.",
      inputSchema: {
        type: "object" as const,
        properties: {
          attachmentId: { type: "number", description: "Attachment id (required)" },
        },
        required: ["attachmentId"],
      },
      handler: async (params: unknown) => {
        const { attachmentId } = parseToolArgs(attachmentIdSchema, params);
        const result = await client.get<Attachment>(`/attachments/digi/${attachmentId}`);
        return jsonToolResult(result);
      },
    },

    erply_create_digi_base64: {
      description:
        "Submit a document for digitization from base64 (POST /attachments/digi/base64 JSON APIAttachmentInfo). Requires fileBase64 and fileName. Optional query: encoding, separatorField, type.",
      inputSchema: {
        type: "object" as const,
        properties: {
          fileBase64: { type: "string", description: "File contents as base64 (required)" },
          fileName: { type: "string", description: "Original file name (required)" },
          encoding: { type: "string" },
          separatorField: { type: "string" },
          type: { type: "string" },
        },
        required: ["fileBase64", "fileName"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(digiBase64Schema, params);
        const { encoding, separatorField, type, ...file } = args;
        const result = await client.post("/attachments/digi/base64", toApiAttachment(file), {
          encoding,
          separatorField,
          type,
        });
        return mutationToolResult(result);
      },
    },

    erply_create_digi_form: {
      description:
        "Submit a document for digitization from a multipart form (POST /attachments/digi/form). Requires fileBase64 and fileName. Optional query: encoding, separatorField, type.",
      inputSchema: {
        type: "object" as const,
        properties: {
          fileBase64: { type: "string", description: "File contents as base64 (required)" },
          fileName: { type: "string", description: "Original file name (required)" },
          encoding: { type: "string" },
          separatorField: { type: "string" },
          type: { type: "string" },
        },
        required: ["fileBase64", "fileName"],
      },
      handler: async (params: unknown) => {
        const { fileBase64, fileName, ...query } = parseToolArgs(digiFormSchema, params);
        const form = new FormData();
        form.append("file", decodeBase64File(fileBase64, fileName), fileName);
        const result = await client.postMultipart("/attachments/digi/form", form, query);
        return mutationToolResult(result);
      },
    },

    erply_get_digi_country_from_parser: {
      description:
        "Infer country from parser text (POST /attachments/digi/country_from_parser JSON APIDictionaryValueInfo). Optional code and name; extra fields may be passed through.",
      inputSchema: {
        type: "object" as const,
        properties: {
          code: { type: "string" },
          name: { type: "string" },
        },
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(countryFromParserSchema, params);
        const result = await client.post("/attachments/digi/country_from_parser", args);
        return mutationToolResult(result);
      },
    },

    erply_submit_kyc: {
      description:
        "Submit a KYC file (POST /attachments/kyc multipart). Requires fileBase64 and fileName.",
      inputSchema: {
        type: "object" as const,
        properties: {
          fileBase64: { type: "string", description: "File contents as base64 (required)" },
          fileName: { type: "string", description: "Original file name (required)" },
        },
        required: ["fileBase64", "fileName"],
      },
      handler: async (params: unknown) => {
        const { fileBase64, fileName } = parseToolArgs(simpleFileSchema, params);
        const form = new FormData();
        form.append("file", decodeBase64File(fileBase64, fileName), fileName);
        const result = await client.postMultipart("/attachments/kyc", form);
        return mutationToolResult(result);
      },
    },

    erply_submit_kyc_json: {
      description:
        "Submit KYC as JSON APIAttachmentInfo (POST /attachments/kyc/json). Requires fileBase64 and fileName. Extra APIAttachmentInfo fields may be passed through.",
      inputSchema: {
        type: "object" as const,
        properties: {
          fileBase64: { type: "string", description: "File contents as base64 (required)" },
          fileName: { type: "string", description: "Original file name (required)" },
          documentId: { type: "number" },
          description: { type: "string" },
        },
        required: ["fileBase64", "fileName"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(kycJsonSchema, params);
        const result = await client.post("/attachments/kyc/json", toApiAttachment(args));
        return mutationToolResult(result);
      },
    },

    erply_delete_attachment_via_post: {
      description:
        "Delete an attachment via the GoERP-style alias (POST /attachments/delete). Requires id (attachment id). Optional documentId.",
      inputSchema: {
        type: "object" as const,
        properties: {
          id: { type: "number", description: "Attachment id (required)" },
          documentId: { type: "number" },
        },
        required: ["id"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(deleteViaPostSchema, params);
        const result = await client.post("/attachments/delete", undefined, args);
        return mutationToolResult(result);
      },
    },

    erply_delete_activity_attachment: {
      description:
        "Delete an activity-item attachment (DELETE /attachments/all/{activityItemAttachmentId}). Requires activityItemAttachmentId. Optional transactionEntryId, customerId, activityItemType.",
      inputSchema: {
        type: "object" as const,
        properties: {
          activityItemAttachmentId: {
            type: "number",
            description: "Activity item attachment id (required)",
          },
          transactionEntryId: { type: "number" },
          customerId: { type: "number" },
          activityItemType: { type: "string" },
        },
        required: ["activityItemAttachmentId"],
      },
      handler: async (params: unknown) => {
        const { activityItemAttachmentId, ...query } = parseToolArgs(deleteActivitySchema, params);
        const result = await client.delete(`/attachments/all/${activityItemAttachmentId}`, query);
        return mutationToolResult(result);
      },
    },
  };
}

/** Exported for unit tests. */
export const __test__ = { toApiAttachment };
