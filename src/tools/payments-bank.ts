import { z } from "zod";

import type { ErplyBooksClient } from "../client.js";
import type { PaymentImport, SepaPaymentRequest } from "../types/payments.js";
import {
  optionalBoolean,
  optionalNumber,
  optionalPositiveInt,
  optionalString,
  parseToolArgs,
} from "../validation/tool-args.js";
import { jsonToolResult, mutationToolResult, unwrapListEnvelope } from "./list-response.js";

const importPaymentSchema = z
  .object({
    date: z.string().min(1),
    amount: z.coerce.number(),
    typeCode: z.string().min(1),
    debit: optionalString,
    customerId: optionalPositiveInt,
    invoiceId: optionalPositiveInt,
    debitAccountId: optionalPositiveInt,
    creditAccountId: optionalPositiveInt,
    referenceNumber: optionalString,
    description: optionalString,
    currencyCode: optionalString,
    invoiceNumber: optionalString,
    projectId: optionalPositiveInt,
    reconciled: optionalBoolean,
    findCustomerMatch: optionalBoolean,
    calculateCurrencyRate: optionalBoolean,
  })
  .passthrough();

const saveAllPaymentImportsSchema = z.object({
  items: z.array(z.record(z.string(), z.unknown())).min(1),
});

const connectPaymentSchema = z
  .object({
    paymentId: optionalPositiveInt,
    invoiceId: optionalPositiveInt,
    customerId: optionalPositiveInt,
    amount: optionalNumber,
    date: optionalString,
    typeCode: optionalString,
    referenceNumber: optionalString,
    description: optionalString,
  })
  .passthrough()
  .refine(
    (v) => v.paymentId !== undefined || v.invoiceId !== undefined,
    "paymentId or invoiceId is required",
  );

const listPendingPaymentsSchema = z.object({
  dateFrom: optionalString,
  dateTo: optionalString,
  status: optionalString,
  accountId: optionalPositiveInt,
  paymentId: optionalString,
});

const settlePrepaymentsSchema = z
  .object({
    paymentId: optionalPositiveInt,
    paymentId2: optionalPositiveInt,
    ids: optionalString,
  })
  .refine(
    (v) =>
      v.paymentId !== undefined ||
      v.paymentId2 !== undefined ||
      (v.ids !== undefined && v.ids.length > 0),
    "paymentId, paymentId2, or ids is required",
  );

const sepaPaymentsSchema = z
  .object({
    bankAccountId: optionalPositiveInt,
    invoiceIds: optionalString,
    invoiceNumbers: optionalString,
    invoiceSums: optionalString,
    dateValues: optionalString,
    referenceNumbers: optionalString,
    ibans: optionalString,
    type: optionalString,
    organisationId: optionalPositiveInt,
    allowInvalidIbans: optionalBoolean,
    customMsg: optionalString,
  })
  .passthrough();

const bankImportSchema = z.object({
  fileBase64: z.string().min(1),
  fileName: z.string().min(1),
  encoding: optionalString,
  calculateCurrency: optionalBoolean,
  dateFormatCode: optionalString,
  type: optionalString,
  getEverything: optionalBoolean,
  accountId: optionalPositiveInt,
  getMissing: optionalBoolean,
  separatorField: optionalString,
  detectDateFormatAutomatically: optionalBoolean,
  includeHeader: optionalBoolean,
});

function decodeBase64File(fileBase64: string, fileName: string): File {
  const normalized = fileBase64.replace(/\s/g, "");
  if (normalized.length === 0) {
    throw new Error("fileBase64: empty");
  }
  if (!/^[A-Za-z0-9+/]+=*$/.test(normalized)) {
    throw new Error("fileBase64: invalid base64 characters");
  }
  const bytes = Buffer.from(normalized, "base64");
  if (bytes.length === 0) {
    throw new Error("fileBase64: decoded file is empty");
  }
  return new File([bytes], fileName);
}

export function createPaymentBankTools(client: ErplyBooksClient) {
  return {
    erply_import_payment: {
      description:
        "Create a bank/payment import row (POST /payments/import). Requires date, amount, and typeCode (e.g. MONEY_OUT_TRANSACTION). Sends id: 0. Use for already-matched bank lines; pair with erply_connect_payment_with_documents and erply_save_all_payment_imports. Extra APIPaymentImportInfo fields may be passed through.",
      inputSchema: {
        type: "object" as const,
        properties: {
          date: {
            type: "string",
            description: "Payment/import date (required; ISO or YYYY-MM-DD)",
          },
          amount: { type: "number", description: "Amount (required)" },
          typeCode: {
            type: "string",
            description: "Payment import type code (required), e.g. MONEY_OUT_TRANSACTION",
          },
          debit: { type: "string", description: "D or C (debit/credit side)" },
          customerId: { type: "number" },
          invoiceId: { type: "number" },
          debitAccountId: { type: "number" },
          creditAccountId: { type: "number" },
          referenceNumber: { type: "string" },
          description: { type: "string" },
          currencyCode: { type: "string" },
          invoiceNumber: { type: "string" },
          projectId: { type: "number" },
          reconciled: { type: "boolean" },
          findCustomerMatch: { type: "boolean" },
          calculateCurrencyRate: { type: "boolean" },
        },
        required: ["date", "amount", "typeCode"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(importPaymentSchema, params);
        const created = await client.post<PaymentImport>("/payments/import", {
          ...args,
          id: 0,
        });
        return mutationToolResult(created);
      },
    },

    erply_save_all_payment_imports: {
      description:
        "Batch-save payment import rows (POST /payments/save_all_payments). Body is { items: [...] } of APIPaymentImportInfo objects. Use after import/match editing.",
      inputSchema: {
        type: "object" as const,
        properties: {
          items: {
            type: "array",
            description: "Payment import rows to save (required, non-empty)",
            items: { type: "object" },
          },
        },
        required: ["items"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(saveAllPaymentImportsSchema, params);
        const result = await client.post("/payments/save_all_payments", { items: args.items });
        return mutationToolResult(result);
      },
    },

    erply_connect_payment_with_documents: {
      description:
        "Match a payment import row to invoice(s) (POST /payments/connect_payment_with_documents). Requires paymentId and/or invoiceId. Extra APIPaymentImportInfo fields may be passed through.",
      inputSchema: {
        type: "object" as const,
        properties: {
          paymentId: { type: "number", description: "Payment or import payment id" },
          invoiceId: { type: "number", description: "Invoice/document id to match" },
          customerId: { type: "number" },
          amount: { type: "number" },
          date: { type: "string" },
          typeCode: { type: "string" },
          referenceNumber: { type: "string" },
          description: { type: "string" },
        },
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(connectPaymentSchema, params);
        const result = await client.post<PaymentImport>(
          "/payments/connect_payment_with_documents",
          args,
        );
        return mutationToolResult(result);
      },
    },

    erply_list_pending_payments: {
      description:
        "List pending payment imports (GET /payments/pending_payments). Optional filters: dateFrom, dateTo, status, accountId, paymentId. Returns { totalCount, items } when available.",
      inputSchema: {
        type: "object" as const,
        properties: {
          dateFrom: { type: "string", description: "Start date filter" },
          dateTo: { type: "string", description: "End date filter" },
          status: { type: "string", description: "Pending payment status filter" },
          accountId: { type: "number", description: "Bank/cash account id" },
          paymentId: { type: "string", description: "Payment id filter" },
        },
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(listPendingPaymentsSchema, params);
        const response = await client.get("/payments/pending_payments", args);
        return jsonToolResult(unwrapListEnvelope<PaymentImport>(response));
      },
    },

    erply_settle_prepayments: {
      description:
        "Settle prepayments against each other or listed ids (POST /payments/settle_prepayments). Requires paymentId, paymentId2, and/or ids (comma-separated).",
      inputSchema: {
        type: "object" as const,
        properties: {
          paymentId: { type: "number", description: "First payment id" },
          paymentId2: { type: "number", description: "Second payment id" },
          ids: { type: "string", description: "Comma-separated payment ids" },
        },
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(settlePrepaymentsSchema, params);
        const result = await client.post("/payments/settle_prepayments", undefined, args);
        return mutationToolResult(result);
      },
    },

    erply_sepa_payments: {
      description:
        "Generate/process SEPA payment data as JSON (POST /payments/sepa_payments/json_format). Pass invoiceIds/invoiceSums/dateValues/ibans (and related fields) as the API expects string lists. Extra APIPaymentImportFileInfo fields may be passed through.",
      inputSchema: {
        type: "object" as const,
        properties: {
          bankAccountId: { type: "number" },
          invoiceIds: { type: "string", description: "Comma-separated invoice ids" },
          invoiceNumbers: { type: "string" },
          invoiceSums: { type: "string" },
          dateValues: { type: "string" },
          referenceNumbers: { type: "string" },
          ibans: { type: "string" },
          type: { type: "string" },
          organisationId: { type: "number" },
          allowInvalidIbans: { type: "boolean" },
          customMsg: { type: "string" },
        },
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(sepaPaymentsSchema, params);
        const result = await client.post<SepaPaymentRequest>(
          "/payments/sepa_payments/json_format",
          args,
        );
        return mutationToolResult(result);
      },
    },

    erply_bank_import: {
      description:
        "Upload a bank statement file (POST /payments/bank_import multipart). Requires fileBase64 and fileName. Optional query: accountId, encoding, type, dateFormatCode, separatorField, calculateCurrency, getEverything, getMissing, detectDateFormatAutomatically, includeHeader. Prefer this over bank_import/v2 (needs attachments — not shipped yet).",
      inputSchema: {
        type: "object" as const,
        properties: {
          fileBase64: {
            type: "string",
            description: "Bank statement file contents as base64 (required)",
          },
          fileName: {
            type: "string",
            description: "Original file name including extension, e.g. statement.csv (required)",
          },
          encoding: { type: "string" },
          calculateCurrency: { type: "boolean" },
          dateFormatCode: { type: "string" },
          type: { type: "string", description: "Bank import type code when required by Erply" },
          getEverything: { type: "boolean" },
          accountId: { type: "number", description: "Bank account id" },
          getMissing: { type: "boolean" },
          separatorField: { type: "string" },
          detectDateFormatAutomatically: { type: "boolean" },
          includeHeader: { type: "boolean" },
        },
        required: ["fileBase64", "fileName"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(bankImportSchema, params);
        const { fileBase64, fileName, ...query } = args;
        const file = decodeBase64File(fileBase64, fileName);
        const form = new FormData();
        form.append("file", file, fileName);
        const result = await client.postMultipart("/payments/bank_import", form, query);
        return mutationToolResult(result);
      },
    },
  };
}

/** Exported for unit tests. */
export const __test__ = { decodeBase64File };
