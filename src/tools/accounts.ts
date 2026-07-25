import { z } from "zod";

import type { ErplyBooksClient } from "../client.js";
import type { Account } from "../types/accounts.js";
import {
  optionalBoolean,
  optionalNonNegativeInt,
  optionalPositiveInt,
  optionalString,
  optionalYmd,
  parseToolArgs,
} from "../validation/tool-args.js";
import { jsonToolResult, unwrapListEnvelope } from "./list-response.js";

const listAccountsSchema = z.object({
  date: optionalYmd,
  projectId: optionalPositiveInt,
  getEverything: optionalBoolean,
  lang: optionalString,
  start: optionalNonNegativeInt,
  limit: optionalPositiveInt,
});

export function createAccountTools(client: ErplyBooksClient) {
  return {
    erply_list_accounts: {
      description:
        "List chart-of-accounts entries from Erply Books. Returns { totalCount, items } (organisation blob stripped).",
      inputSchema: {
        type: "object" as const,
        properties: {
          date: {
            type: "string",
            description: "Optional balance date (YYYY-MM-DD)",
          },
          projectId: { type: "number", description: "Optional project filter" },
          getEverything: {
            type: "boolean",
            description: "When true, include inactive / all accounts as supported by the API",
          },
          lang: { type: "string", description: "Optional language code" },
          start: { type: "number", description: "Offset (default 0)" },
          limit: { type: "number", description: "Page size" },
        },
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(listAccountsSchema, params);
        const response = await client.get("/accounts", args);
        return jsonToolResult(unwrapListEnvelope<Account>(response));
      },
    },
  };
}
