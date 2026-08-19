import { z } from "zod";

import type { ErplyBooksClient } from "../client.js";
import type { Payment } from "../types/payments.js";
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

const createPaymentSchema = z
  .object({
    opDate: ymdDateString,
    sumPaid: z.coerce.number(),
    invoiceId: optionalPositiveInt,
    customerId: optionalPositiveInt,
    accountId: optionalPositiveInt,
    typeCode: optionalString,
    currencyCode: optionalString,
    referenceNumber: optionalString,
    note: optionalString,
    projectId: optionalPositiveInt,
    originalSum: optionalNumber,
  })
  .passthrough();

const updatePaymentSchema = z
  .object({
    paymentId: positiveInt,
    opDate: optionalString,
    sumPaid: optionalNumber,
    invoiceId: optionalPositiveInt,
    customerId: optionalPositiveInt,
    accountId: optionalPositiveInt,
    typeCode: optionalString,
    currencyCode: optionalString,
    referenceNumber: optionalString,
    note: optionalString,
  })
  .passthrough();

const deletePaymentSchema = z.object({
  paymentId: positiveInt,
});

export function createPaymentTools(client: ErplyBooksClient) {
  return {
    erply_list_payments: {
      description:
        "List confirmed Erply Books payments (GET /payments). Requires dateFrom and dateTo. " +
        "Does not include unmatched bank-import rows — use erply_list_pending_payments for the Bank Import feed. " +
        "Note: some Erply Books price plans return HTTP 409 (MODULE_PAID_MONEY_REPORT) for this endpoint. Returns { totalCount, items } when available.",
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

    erply_create_payment: {
      description:
        "Create a payment (POST /payments). Requires opDate (YYYY-MM-DD) and sumPaid. Sends id: 0. " +
        "Pass invoiceId to link the payment to an invoice/sales order immediately. Some price plans return HTTP 409 (MODULE_PAID_MONEY_REPORT). Extra APIPaymentInfo fields may be passed through.",
      inputSchema: {
        type: "object" as const,
        properties: {
          opDate: { type: "string", description: "Payment date YYYY-MM-DD (required)" },
          sumPaid: { type: "number", description: "Amount paid (required)" },
          invoiceId: { type: "number", description: "Related invoice/document id" },
          customerId: { type: "number" },
          accountId: { type: "number" },
          typeCode: { type: "string", description: "PAYMENT_TYPE dictionary code" },
          currencyCode: { type: "string" },
          referenceNumber: { type: "string" },
          note: { type: "string" },
          projectId: { type: "number" },
          originalSum: { type: "number" },
        },
        required: ["opDate", "sumPaid"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(createPaymentSchema, params);
        const created = await client.post<Payment>("/payments", { ...args, id: 0 });
        return mutationToolResult(created);
      },
    },

    erply_update_payment: {
      description:
        "Update a payment (PUT /payments/{paymentId}). Requires a real paymentId. Path id wins over body id. " +
        "A pending-feed pendingPaymentId is not a payment id (409 Ei leidnud 'payment'). " +
        "When a real payment exists, pass invoiceId together with opDate, sumPaid, typeCode, accountId, customerId, and currencyCode to change invoice balances.",
      inputSchema: {
        type: "object" as const,
        properties: {
          paymentId: { type: "number", description: "Payment id (required)" },
          opDate: { type: "string" },
          sumPaid: { type: "number" },
          invoiceId: { type: "number" },
          customerId: { type: "number" },
          accountId: { type: "number" },
          typeCode: { type: "string" },
          currencyCode: { type: "string" },
          referenceNumber: { type: "string" },
          note: { type: "string" },
        },
        required: ["paymentId"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(updatePaymentSchema, params);
        const { paymentId, ...body } = args;
        const updated = await client.put<Payment>(`/payments/${paymentId}`, {
          ...body,
          id: paymentId,
        });
        return mutationToolResult(updated);
      },
    },

    erply_delete_payment: {
      description:
        "Delete a payment by id (DELETE /payments/{paymentId}). Destructive — requires an explicit paymentId. Some plans return HTTP 409.",
      inputSchema: {
        type: "object" as const,
        properties: {
          paymentId: { type: "number", description: "Payment id to delete (required)" },
        },
        required: ["paymentId"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(deletePaymentSchema, params);
        const result = await client.delete(`/payments/${args.paymentId}`);
        return mutationToolResult(result);
      },
    },
  };
}
