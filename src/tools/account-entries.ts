import { z } from "zod";

import type { ErplyBooksClient } from "../client.js";
import type { AccountEntry } from "../types/account-entries.js";
import {
  optionalInt,
  optionalNonNegativeInt,
  optionalPositiveInt,
  optionalString,
  parseToolArgs,
  ymdDateString,
} from "../validation/tool-args.js";
import { jsonToolResult, unwrapListEnvelope } from "./list-response.js";

const listAccountEntriesSchema = z.object({
  dateFrom: ymdDateString,
  dateTo: ymdDateString,
  accountId: optionalPositiveInt,
  customerId: optionalPositiveInt,
  projectId: optionalPositiveInt,
  articleId: optionalPositiveInt,
  balanceType: optionalString,
  incomeType: optionalString,
  reportType: optionalInt,
  start: optionalNonNegativeInt,
  limit: optionalPositiveInt,
});

export function createAccountEntryTools(client: ErplyBooksClient) {
  return {
    erply_list_account_entries: {
      description:
        "List account ledger entries from Erply Books (GET /account_entries). Requires dateFrom and dateTo. Some price plans return HTTP 409 (MODULE_LEDGER). Returns { totalCount, items } when available.",
      inputSchema: {
        type: "object" as const,
        properties: {
          dateFrom: { type: "string", description: "Start date YYYY-MM-DD (required)" },
          dateTo: { type: "string", description: "End date YYYY-MM-DD (required)" },
          accountId: { type: "number", description: "Filter by account id" },
          customerId: { type: "number", description: "Filter by customer id" },
          projectId: { type: "number", description: "Filter by project id" },
          articleId: { type: "number", description: "Filter by article id" },
          balanceType: { type: "string", description: "BALANCE_TYPE dictionary code" },
          incomeType: { type: "string", description: "INCOME_TYPE dictionary code" },
          reportType: { type: "number", description: "Report type filter (integer per spec)" },
          start: { type: "number", description: "Offset (default 0)" },
          limit: { type: "number", description: "Page size" },
        },
        required: ["dateFrom", "dateTo"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(listAccountEntriesSchema, params);
        const response = await client.get("/account_entries", args);
        return jsonToolResult(unwrapListEnvelope<AccountEntry>(response));
      },
    },
  };
}
