import { z } from "zod";

import type { ErplyBooksClient } from "../client.js";
import type { Payment } from "../types/payments.js";
import {
  optionalBoolean,
  optionalNonNegativeInt,
  optionalPositiveInt,
  optionalString,
  parseToolArgs,
  ymdDateString,
} from "../validation/tool-args.js";
import { jsonToolResult, unwrapListEnvelope } from "./list-response.js";

const listPaymentsSchema = z.object({
  dateFrom: ymdDateString,
  dateTo: ymdDateString,
  customerId: optionalPositiveInt,
  isIncome: optionalBoolean,
  accountId: optionalPositiveInt,
  documentId: optionalPositiveInt,
  paymentType: optionalString,
  description: optionalString,
  sort: optionalString,
  start: optionalNonNegativeInt,
  limit: optionalPositiveInt,
});

export function createPaymentTools(client: ErplyBooksClient) {
  return {
    erply_list_payments: {
      description:
        "List Erply Books payments. Requires dateFrom and dateTo. Note: some Erply Books price plans return HTTP 409 (MODULE_PAID_MONEY_REPORT) for this endpoint. Returns { totalCount, items } when available.",
      inputSchema: {
        type: "object" as const,
        properties: {
          dateFrom: { type: "string", description: "Start date YYYY-MM-DD (required)" },
          dateTo: { type: "string", description: "End date YYYY-MM-DD (required)" },
          customerId: { type: "number", description: "Filter by customer id" },
          isIncome: { type: "boolean", description: "Income vs outgoing when supported" },
          accountId: { type: "number", description: "Bank/cash account id" },
          documentId: { type: "number", description: "Related document id" },
          paymentType: { type: "string", description: "PAYMENT_TYPE dictionary code" },
          description: { type: "string", description: "Description filter" },
          sort: { type: "string", description: "Sort expression" },
          start: { type: "number", description: "Offset (default 0)" },
          limit: { type: "number", description: "Page size" },
        },
        required: ["dateFrom", "dateTo"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(listPaymentsSchema, params);
        const response = await client.get("/payments", args);
        return jsonToolResult(unwrapListEnvelope<Payment>(response));
      },
    },
  };
}
