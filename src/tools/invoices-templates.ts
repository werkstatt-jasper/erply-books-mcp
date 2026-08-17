import { z } from "zod";

import type { ErplyBooksClient } from "../client.js";
import {
  ERPLY_DOCUMENT_TYPES,
  type InvoiceHistoryEntry,
  type InvoiceInitialData,
  type InvoiceTemplate,
} from "../types/invoices.js";
import {
  optionalBoolean,
  optionalNonNegativeInt,
  optionalPositiveInt,
  optionalString,
  parseToolArgs,
  positiveInt,
} from "../validation/tool-args.js";
import { jsonToolResult, mutationToolResult, unwrapListEnvelope } from "./list-response.js";

const documentTypeSchema = z.enum(ERPLY_DOCUMENT_TYPES);

/** Live GET /invoices/new_number rejects YYYY-MM-DD; YYYY-MM-DDTHH:mm:ss works. */
const newNumberDateSchema = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}Z?)?$/,
    "Expected YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss",
  );

export function normalizeNewNumberDate(date: string): string {
  if (date.length === 10) {
    return `${date}T00:00:00`;
  }
  return date.endsWith("Z") ? date.slice(0, -1) : date;
}

const listTemplatesSchema = z.object({
  languageCode: optionalString,
  deprecated: optionalBoolean,
  start: optionalNonNegativeInt,
  limit: optionalPositiveInt,
});

const getTemplateSchema = z.object({
  documentInfoId: positiveInt,
});

const templateBodySchema = z
  .object({
    documentName: optionalString,
    languageCode: optionalString,
    templateId: optionalString,
  })
  .passthrough();

const createTemplateSchema = templateBodySchema.extend({
  documentName: z.string().min(1),
  languageCode: z.string().min(1),
});

const updateTemplateSchema = templateBodySchema.extend({
  documentInfoId: positiveInt,
});

const deleteTemplateSchema = z.object({
  documentInfoId: positiveInt,
});

const historySchema = z.object({
  documentId: positiveInt,
});

const nextNumberSchema = z.object({
  typeCode: documentTypeSchema,
  date: newNumberDateSchema.nullish().transform((v) => v ?? undefined),
  projectId: z
    .union([z.string().min(1), positiveInt])
    .nullish()
    .transform((v) => v ?? undefined),
  articleRowType: optionalString,
});

const checkNumberSchema = z
  .object({
    number: z.string().min(1),
    customerId: optionalPositiveInt,
    typeCode: documentTypeSchema.optional(),
    date: optionalString,
    existingDocumentId: optionalPositiveInt,
  })
  .passthrough();

const parsedValidationsSchema = z.object({
  documentType: documentTypeSchema,
  year: z.coerce.number().int().min(1900).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  start: optionalNonNegativeInt,
  limit: optionalPositiveInt,
});

const templateInputProperties = {
  documentName: { type: "string", description: "Template display name" },
  languageCode: {
    type: "string",
    description: "LANGUAGE_* dictionary code (e.g. LANGUAGE_EN). ISO codes like en/et 409/404.",
  },
  templateId: {
    type: "string",
    description: 'Print-template id (numeric string, e.g. "20324")',
  },
};

export function createInvoiceTemplateTools(client: ErplyBooksClient) {
  return {
    erply_list_invoice_templates: {
      description:
        "List invoice text templates (GET /invoices/templates). Optional languageCode (LANGUAGE_* dictionary code — ISO en/et returns 404), deprecated, start, limit. Returns { totalCount, items }.",
      inputSchema: {
        type: "object" as const,
        properties: {
          languageCode: {
            type: "string",
            description: "LANGUAGE_* filter (e.g. LANGUAGE_EN). ISO codes 404.",
          },
          deprecated: { type: "boolean", description: "Include/filter deprecated templates" },
          start: { type: "number", description: "Offset (default 0)" },
          limit: { type: "number", description: "Page size" },
        },
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(listTemplatesSchema, params);
        const response = await client.get("/invoices/templates", args);
        return jsonToolResult(unwrapListEnvelope<InvoiceTemplate>(response));
      },
    },

    erply_get_invoice_template: {
      description:
        "Get a single invoice text template (GET /invoices/templates/{documentInfoId}). Requires documentInfoId. Live API may still return a deleted template object; prefer the list tool to confirm it exists.",
      inputSchema: {
        type: "object" as const,
        properties: {
          documentInfoId: { type: "number", description: "Template id (required)" },
        },
        required: ["documentInfoId"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(getTemplateSchema, params);
        const result = await client.get<InvoiceTemplate>(
          `/invoices/templates/${args.documentInfoId}`,
        );
        return jsonToolResult(result);
      },
    },

    erply_create_invoice_template: {
      description:
        "Create an invoice text template (POST /invoices/templates). Requires documentName and languageCode (LANGUAGE_*). Optional templateId (numeric print-template id). Sends id: 0. Extra APIDocumentTextsInfo fields may be passed through.",
      inputSchema: {
        type: "object" as const,
        properties: templateInputProperties,
        required: ["documentName", "languageCode"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(createTemplateSchema, params);
        const created = await client.post<InvoiceTemplate>("/invoices/templates", {
          ...args,
          id: 0,
        });
        return mutationToolResult(created);
      },
    },

    erply_update_invoice_template: {
      description:
        "Update an invoice text template (PUT /invoices/templates/{documentInfoId}). Requires documentInfoId. Path id wins over any body id. Extra APIDocumentTextsInfo fields may be passed through.",
      inputSchema: {
        type: "object" as const,
        properties: {
          documentInfoId: { type: "number", description: "Template id (required)" },
          ...templateInputProperties,
        },
        required: ["documentInfoId"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(updateTemplateSchema, params);
        const { documentInfoId, ...body } = args;
        const updated = await client.put<InvoiceTemplate>(`/invoices/templates/${documentInfoId}`, {
          ...body,
          id: documentInfoId,
        });
        return mutationToolResult(updated);
      },
    },

    erply_delete_invoice_template: {
      description:
        "Delete an invoice text template (DELETE /invoices/templates/{documentInfoId}). Requires documentInfoId. Destructive. Live GET after delete may still return the object; the list no longer includes it.",
      inputSchema: {
        type: "object" as const,
        properties: {
          documentInfoId: { type: "number", description: "Template id to delete (required)" },
        },
        required: ["documentInfoId"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(deleteTemplateSchema, params);
        const result = await client.delete(`/invoices/templates/${args.documentInfoId}`);
        return mutationToolResult(result);
      },
    },

    erply_get_invoice_history: {
      description:
        "Fetch document history (GET /invoices/history). Requires documentId. Live API returns a JSON array (not a list envelope). Omitting documentId 409s.",
      inputSchema: {
        type: "object" as const,
        properties: {
          documentId: { type: "number", description: "Document id (required)" },
        },
        required: ["documentId"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(historySchema, params);
        const result = await client.get<InvoiceHistoryEntry[]>("/invoices/history", {
          documentId: args.documentId,
        });
        return jsonToolResult(result);
      },
    },

    erply_get_next_invoice_number: {
      description:
        "Suggest the next document number (GET /invoices/new_number). Requires typeCode (DOCUMENT_*). Optional date (YYYY-MM-DD is sent as YYYY-MM-DDT00:00:00 — bare YYYY-MM-DD 409s), projectId, articleRowType. Returns APIInvoiceInitialData (number may be empty for some types).",
      inputSchema: {
        type: "object" as const,
        properties: {
          typeCode: {
            type: "string",
            description: "DOCUMENT_* type code (required)",
            enum: [...ERPLY_DOCUMENT_TYPES],
          },
          date: {
            type: "string",
            description: "YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss (YYYY-MM-DD is normalized)",
          },
          projectId: { description: "Project id (string or number)" },
          articleRowType: { type: "string", description: "ARTICLE_ROW_* type" },
        },
        required: ["typeCode"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(nextNumberSchema, params);
        const result = await client.get<InvoiceInitialData>("/invoices/new_number", {
          typeCode: args.typeCode,
          date: args.date === undefined ? undefined : normalizeNewNumberDate(args.date),
          projectId: args.projectId === undefined ? undefined : String(args.projectId),
          articleRowType: args.articleRowType,
        });
        return jsonToolResult(result);
      },
    },

    erply_check_invoice_number: {
      description:
        "Check whether a document number already exists (POST /invoices/new_number). Requires number. Optional customerId, typeCode, date (YYYY-MM-DD works here), existingDocumentId. Returns APIInvoiceInitialData with exists and existingDocumentId.",
      inputSchema: {
        type: "object" as const,
        properties: {
          number: { type: "string", description: "Document number to check (required)" },
          customerId: { type: "number" },
          typeCode: {
            type: "string",
            description: "DOCUMENT_* type code",
            enum: [...ERPLY_DOCUMENT_TYPES],
          },
          date: { type: "string", description: "Document date YYYY-MM-DD" },
          existingDocumentId: { type: "number" },
        },
        required: ["number"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(checkNumberSchema, params);
        const checked = await client.post<InvoiceInitialData>("/invoices/new_number", {
          ...args,
          id: 0,
        });
        return jsonToolResult(checked);
      },
    },

    erply_list_parsed_invoice_validations: {
      description:
        "List parsed-invoice validation rows (GET /invoices/parsed_invoice_info_validation). Requires documentType, year, and month (missing date range 409s; missing documentType 409s). Optional start/limit. Live API returns a JSON array.",
      inputSchema: {
        type: "object" as const,
        properties: {
          documentType: {
            type: "string",
            description: "DOCUMENT_* type code (required)",
            enum: [...ERPLY_DOCUMENT_TYPES],
          },
          year: { type: "number", description: "Calendar year (required)" },
          month: { type: "number", description: "Calendar month 1-12 (required)" },
          start: { type: "number", description: "Offset (default 0)" },
          limit: { type: "number", description: "Page size" },
        },
        required: ["documentType", "year", "month"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(parsedValidationsSchema, params);
        const result = await client.get("/invoices/parsed_invoice_info_validation", args);
        return jsonToolResult(result);
      },
    },
  };
}

export const __test__ = { normalizeNewNumberDate };
