import { z } from "zod";

import type { ErplyBooksClient } from "../client.js";
import { ERPLY_DOCUMENT_TYPES, type Invoice } from "../types/invoices.js";
import {
  optionalBoolean,
  optionalNonNegativeInt,
  optionalPositiveInt,
  optionalString,
  parseToolArgs,
  positiveInt,
  ymdDateString,
} from "../validation/tool-args.js";
import { jsonToolResult, unwrapListEnvelope } from "./list-response.js";

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
  };
}
