import { z } from "zod";

import type { ErplyBooksClient } from "../client.js";
import { ERPLY_DOCUMENT_TYPES, type Invoice } from "../types/invoices.js";
import {
  optionalBoolean,
  optionalNonNegativeInt,
  optionalNumber,
  optionalPositiveInt,
  optionalString,
  parseToolArgs,
  positiveInt,
  ymdDateString,
} from "../validation/tool-args.js";
import { jsonToolResult, mutationToolResult, unwrapListEnvelope } from "./list-response.js";

const documentTypeSchema = z.enum(ERPLY_DOCUMENT_TYPES);

const listInvoicesSchema = z.object({
  dateFrom: ymdDateString,
  dateTo: ymdDateString,
  documentType: documentTypeSchema,
  customerId: optionalPositiveInt,
  keyword: optionalString,
  number: optionalString,
  projectId: optionalPositiveInt,
  getUnpaid: optionalBoolean,
  sort: optionalString,
  start: optionalNonNegativeInt,
  limit: optionalPositiveInt,
});

const getInvoiceSchema = z.object({
  documentId: positiveInt,
  lang: optionalString,
});

const createInvoiceSchema = z
  .object({
    typeCode: documentTypeSchema,
    date: ymdDateString,
    customerId: optionalPositiveInt,
    customer: z
      .record(z.string(), z.unknown())
      .nullish()
      .transform((v) => v ?? undefined),
    number: optionalString,
    currencyCode: optionalString,
    projectId: optionalPositiveInt,
    vatPercent: optionalNumber,
    referenceNumber: optionalString,
    deadlineDate: optionalString,
    rows: z
      .array(z.record(z.string(), z.unknown()))
      .nullish()
      .transform((v) => v ?? undefined),
    registrationCode: optionalString,
  })
  .passthrough()
  .superRefine((val, ctx) => {
    if (val.customerId == null && val.customer == null) {
      ctx.addIssue({
        code: "custom",
        message: "customerId or customer is required",
        path: ["customerId"],
      });
    }
  });

const updateInvoiceSchema = z
  .object({
    documentId: positiveInt,
    typeCode: documentTypeSchema.optional(),
    date: optionalString,
    customerId: optionalPositiveInt,
    number: optionalString,
    currencyCode: optionalString,
    projectId: optionalPositiveInt,
    rows: z
      .array(z.record(z.string(), z.unknown()))
      .nullish()
      .transform((v) => v ?? undefined),
    registrationCode: optionalString,
  })
  .passthrough();

const deleteInvoiceSchema = z.object({
  invoiceId: positiveInt,
  registrationCode: optionalString,
});

export function createInvoiceTools(client: ErplyBooksClient) {
  return {
    erply_list_invoices: {
      description:
        "List Erply Books documents (invoices and related types). Requires dateFrom, dateTo, and documentType. Document types: DOCUMENT_SELL (sales invoice), DOCUMENT_BUY (purchase), DOCUMENT_POS_SELL (cash sales), DOCUMENT_POS_BUY, DOCUMENT_PRE_SELL, DOCUMENT_PRE_BUY, DOCUMENT_BID, DOCUMENT_SALES_ORDER, DOCUMENT_WAYBILL, DOCUMENT_PURCHASE_WAYBILL. Some types require a higher Erply Books price plan. Returns { totalCount, items }.",
      inputSchema: {
        type: "object" as const,
        properties: {
          dateFrom: { type: "string", description: "Start date YYYY-MM-DD (required)" },
          dateTo: { type: "string", description: "End date YYYY-MM-DD (required)" },
          documentType: {
            type: "string",
            description: "Required DOCUMENT_* type code from the Erply API dictionary",
            enum: [...ERPLY_DOCUMENT_TYPES],
          },
          customerId: { type: "number", description: "Filter by customer id" },
          keyword: { type: "string", description: "Free-text search" },
          number: { type: "string", description: "Document number" },
          projectId: { type: "number", description: "Filter by project id" },
          getUnpaid: { type: "boolean", description: "Only unpaid documents when supported" },
          sort: { type: "string", description: "Sort expression" },
          start: { type: "number", description: "Offset (default 0)" },
          limit: { type: "number", description: "Page size" },
        },
        required: ["dateFrom", "dateTo", "documentType"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(listInvoicesSchema, params);
        const response = await client.get("/invoices", args);
        return jsonToolResult(unwrapListEnvelope<Invoice>(response));
      },
    },

    erply_get_invoice: {
      description:
        "Get a single Erply Books document by id (GET /invoices/{documentId}). Optional lang for localized fields.",
      inputSchema: {
        type: "object" as const,
        properties: {
          documentId: { type: "number", description: "Document id (required)" },
          lang: { type: "string", description: "Optional language code" },
        },
        required: ["documentId"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(getInvoiceSchema, params);
        const invoice = await client.get<Invoice>(`/invoices/${args.documentId}`, {
          lang: args.lang,
        });
        return jsonToolResult(invoice);
      },
    },

    erply_create_invoice: {
      description:
        "Create an Erply Books document (POST /invoices). Requires typeCode (DOCUMENT_*), date (YYYY-MM-DD), and customerId or nested customer. Sends id: 0. Optional rows[] and registrationCode (query). Some document types / plans return HTTP 409.",
      inputSchema: {
        type: "object" as const,
        properties: {
          typeCode: {
            type: "string",
            description: "DOCUMENT_* type code (required)",
            enum: [...ERPLY_DOCUMENT_TYPES],
          },
          date: { type: "string", description: "Document date YYYY-MM-DD (required)" },
          customerId: { type: "number", description: "Existing customer id (or pass customer)" },
          customer: {
            type: "object",
            description: "Inline customer object when creating with the document",
            additionalProperties: true,
          },
          number: { type: "string" },
          currencyCode: { type: "string" },
          projectId: { type: "number" },
          vatPercent: { type: "number" },
          referenceNumber: { type: "string" },
          deadlineDate: { type: "string" },
          rows: {
            type: "array",
            description: "Invoice line rows (APIInvoiceRow-shaped objects)",
            items: { type: "object", additionalProperties: true },
          },
          registrationCode: {
            type: "string",
            description: "Optional query param for partner/queue flows",
          },
        },
        required: ["typeCode", "date"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(createInvoiceSchema, params);
        const { registrationCode, ...body } = args;
        const created = await client.post<Invoice>(
          "/invoices",
          { ...body, id: 0 },
          { registrationCode },
        );
        return mutationToolResult(created);
      },
    },

    erply_update_invoice: {
      description:
        "Update an Erply Books document (PUT /invoices/{documentId}). Requires documentId. Optional registrationCode query. Extra APIInvoiceInfo fields may be passed through.",
      inputSchema: {
        type: "object" as const,
        properties: {
          documentId: { type: "number", description: "Document id (required)" },
          typeCode: {
            type: "string",
            enum: [...ERPLY_DOCUMENT_TYPES],
          },
          date: { type: "string" },
          customerId: { type: "number" },
          number: { type: "string" },
          currencyCode: { type: "string" },
          projectId: { type: "number" },
          rows: {
            type: "array",
            items: { type: "object", additionalProperties: true },
          },
          registrationCode: { type: "string" },
        },
        required: ["documentId"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(updateInvoiceSchema, params);
        const { documentId, registrationCode, ...body } = args;
        const updated = await client.put<Invoice>(
          `/invoices/${documentId}`,
          { ...body, id: documentId },
          { registrationCode },
        );
        return mutationToolResult(updated);
      },
    },

    erply_delete_invoice: {
      description:
        "Delete an Erply Books document by id (DELETE /invoices/{invoiceId}). Destructive — requires an explicit invoiceId. Optional registrationCode query.",
      inputSchema: {
        type: "object" as const,
        properties: {
          invoiceId: { type: "number", description: "Invoice/document id to delete (required)" },
          registrationCode: { type: "string" },
        },
        required: ["invoiceId"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(deleteInvoiceSchema, params);
        const result = await client.delete(`/invoices/${args.invoiceId}`, {
          registrationCode: args.registrationCode,
        });
        return mutationToolResult(result);
      },
    },
  };
}
