import { z } from "zod";

import type { ErplyBooksClient } from "../client.js";
import { ERPLY_TRANSACTION_TYPES, type TransactionEntry } from "../types/transaction-entries.js";
import {
  optionalNonNegativeInt,
  optionalNumber,
  optionalPositiveInt,
  optionalString,
  parseToolArgs,
  positiveInt,
  ymdDateString,
} from "../validation/tool-args.js";
import { jsonToolResult, mutationToolResult, unwrapListEnvelope } from "./list-response.js";

const listTransactionEntriesSchema = z.object({
  dateFrom: ymdDateString,
  dateTo: ymdDateString,
  typeCode: optionalString,
  projectId: optionalPositiveInt,
  documentId: optionalPositiveInt,
  description: optionalString,
  start: optionalNonNegativeInt,
  limit: optionalPositiveInt,
});

const getTransactionEntrySchema = z.object({
  transactionEntryId: positiveInt,
  lang: optionalString,
});

const accountEntryRowSchema = z
  .object({
    accountId: positiveInt,
    debitSum: optionalNumber,
    creditSum: optionalNumber,
    description: optionalString,
    projectId: optionalPositiveInt,
    taxRateId: optionalPositiveInt,
    accountNumber: optionalString,
  })
  .passthrough();

const createTransactionEntrySchema = z
  .object({
    opDate: ymdDateString,
    typeCode: z.string().min(1),
    accountEntries: z.array(accountEntryRowSchema).min(1),
    description: optionalString,
    sum: optionalNumber,
    projectId: optionalPositiveInt,
    taxRateId: optionalPositiveInt,
    code: optionalString,
    percent: optionalNumber,
    documentStatusTypeCode: optionalString,
  })
  .passthrough();

const updateTransactionEntrySchema = z
  .object({
    transactionEntryId: positiveInt,
    opDate: optionalString,
    typeCode: optionalString,
    accountEntries: z.array(accountEntryRowSchema).min(1).optional(),
    description: optionalString,
    sum: optionalNumber,
    projectId: optionalPositiveInt,
    taxRateId: optionalPositiveInt,
    code: optionalString,
    percent: optionalNumber,
    documentStatusTypeCode: optionalString,
  })
  .passthrough();

const deleteTransactionEntrySchema = z.object({
  transactionEntryId: positiveInt,
});

export function createTransactionEntryTools(client: ErplyBooksClient) {
  return {
    erply_list_transaction_entries: {
      description:
        "List transaction/journal entries from Erply Books (GET /transaction_entries). Requires dateFrom and dateTo. Optional typeCode uses TRANSACTION_TYPE dictionary codes (e.g. INVOICE_TRANSACTION, PAYMENT_TRANSACTION, DIRECT_TRANSACTION). Some price plans return HTTP 409 (MODULE_TRANSACTIONS). Returns { totalCount, items } when available.",
      inputSchema: {
        type: "object" as const,
        properties: {
          dateFrom: { type: "string", description: "Start date YYYY-MM-DD (required)" },
          dateTo: { type: "string", description: "End date YYYY-MM-DD (required)" },
          typeCode: {
            type: "string",
            description: `TRANSACTION_TYPE code (examples: ${ERPLY_TRANSACTION_TYPES.slice(0, 4).join(", ")})`,
          },
          projectId: { type: "number", description: "Filter by project id" },
          documentId: { type: "number", description: "Filter by related document id" },
          description: { type: "string", description: "Description filter" },
          start: { type: "number", description: "Offset (default 0)" },
          limit: { type: "number", description: "Page size" },
        },
        required: ["dateFrom", "dateTo"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(listTransactionEntriesSchema, params);
        const response = await client.get("/transaction_entries", args);
        return jsonToolResult(unwrapListEnvelope<TransactionEntry>(response));
      },
    },

    erply_get_transaction_entry: {
      description:
        "Get a single transaction/journal entry by id (GET /transaction_entries/{transactionEntryId}). Optional lang. May 409 on plans without MODULE_TRANSACTIONS.",
      inputSchema: {
        type: "object" as const,
        properties: {
          transactionEntryId: { type: "number", description: "Transaction entry id (required)" },
          lang: { type: "string", description: "Optional language code" },
        },
        required: ["transactionEntryId"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(getTransactionEntrySchema, params);
        const entry = await client.get<TransactionEntry>(
          `/transaction_entries/${args.transactionEntryId}`,
          { lang: args.lang },
        );
        return jsonToolResult(entry);
      },
    },

    erply_create_transaction_entry: {
      description:
        "Create a transaction/journal entry (POST /transaction_entries). Requires opDate (YYYY-MM-DD), typeCode (e.g. DIRECT_TRANSACTION for manual journals), and a non-empty accountEntries array (each row needs accountId; use debitSum and/or creditSum). Sends id: 0. Erply validates that debits equal credits. Some price plans return HTTP 409 (MODULE_TRANSACTIONS). Extra APITransactionEntryInfo fields may be passed through.",
      inputSchema: {
        type: "object" as const,
        properties: {
          opDate: { type: "string", description: "Operation date YYYY-MM-DD (required)" },
          typeCode: {
            type: "string",
            description:
              "TRANSACTION_TYPE code (required); use DIRECT_TRANSACTION for manual journals",
          },
          accountEntries: {
            type: "array",
            description:
              "Ledger rows (required, non-empty). Each object needs accountId; optional debitSum, creditSum, description, projectId, taxRateId.",
            items: {
              type: "object",
              properties: {
                accountId: { type: "number" },
                debitSum: { type: "number" },
                creditSum: { type: "number" },
                description: { type: "string" },
                projectId: { type: "number" },
                taxRateId: { type: "number" },
                accountNumber: { type: "string" },
              },
              required: ["accountId"],
            },
          },
          description: { type: "string" },
          sum: { type: "number" },
          projectId: { type: "number" },
          taxRateId: { type: "number" },
          code: { type: "string" },
          percent: { type: "number" },
          documentStatusTypeCode: { type: "string" },
        },
        required: ["opDate", "typeCode", "accountEntries"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(createTransactionEntrySchema, params);
        const created = await client.post<TransactionEntry>("/transaction_entries", {
          ...args,
          id: 0,
        });
        return mutationToolResult(created);
      },
    },

    erply_update_transaction_entry: {
      description:
        "Update a transaction/journal entry (PUT /transaction_entries/{transactionEntryId}). Requires transactionEntryId. Path id wins over body id. May 409 (MODULE_TRANSACTIONS).",
      inputSchema: {
        type: "object" as const,
        properties: {
          transactionEntryId: {
            type: "number",
            description: "Transaction entry id (required)",
          },
          opDate: { type: "string", description: "Operation date YYYY-MM-DD" },
          typeCode: { type: "string" },
          accountEntries: {
            type: "array",
            description: "Replacement ledger rows when provided (non-empty if set)",
            items: {
              type: "object",
              properties: {
                accountId: { type: "number" },
                debitSum: { type: "number" },
                creditSum: { type: "number" },
                description: { type: "string" },
                projectId: { type: "number" },
                taxRateId: { type: "number" },
                accountNumber: { type: "string" },
              },
              required: ["accountId"],
            },
          },
          description: { type: "string" },
          sum: { type: "number" },
          projectId: { type: "number" },
          taxRateId: { type: "number" },
          code: { type: "string" },
          percent: { type: "number" },
          documentStatusTypeCode: { type: "string" },
        },
        required: ["transactionEntryId"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(updateTransactionEntrySchema, params);
        const { transactionEntryId, ...body } = args;
        const updated = await client.put<TransactionEntry>(
          `/transaction_entries/${transactionEntryId}`,
          { ...body, id: transactionEntryId },
        );
        return mutationToolResult(updated);
      },
    },

    erply_delete_transaction_entry: {
      description:
        "Delete a transaction/journal entry by id (DELETE /transaction_entries/{transactionEntryId}). Destructive — requires an explicit transactionEntryId. May 409 (MODULE_TRANSACTIONS).",
      inputSchema: {
        type: "object" as const,
        properties: {
          transactionEntryId: {
            type: "number",
            description: "Transaction entry id to delete (required)",
          },
        },
        required: ["transactionEntryId"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(deleteTransactionEntrySchema, params);
        const result = await client.delete(`/transaction_entries/${args.transactionEntryId}`);
        return mutationToolResult(result);
      },
    },
  };
}
