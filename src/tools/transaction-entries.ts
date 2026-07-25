import { z } from "zod";

import type { ErplyBooksClient } from "../client.js";
import { ERPLY_TRANSACTION_TYPES, type TransactionEntry } from "../types/transaction-entries.js";
import {
  optionalNonNegativeInt,
  optionalPositiveInt,
  optionalString,
  parseToolArgs,
  positiveInt,
  ymdDateString,
} from "../validation/tool-args.js";
import { jsonToolResult, unwrapListEnvelope } from "./list-response.js";

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
  };
}
