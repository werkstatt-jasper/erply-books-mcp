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
  positiveInt,
} from "../validation/tool-args.js";
import { jsonToolResult, mutationToolResult, unwrapListEnvelope } from "./list-response.js";

const listAccountsSchema = z.object({
  date: optionalYmd,
  projectId: optionalPositiveInt,
  getEverything: optionalBoolean,
  lang: optionalString,
  start: optionalNonNegativeInt,
  limit: optionalPositiveInt,
});

const createAccountSchema = z
  .object({
    number: z.string().min(1),
    name: z.string().min(1),
    notActive: optionalBoolean,
    incomeTypeCode: optionalString,
    balanceTypeCode: optionalString,
    cashFlowTypeCode: optionalString,
    typeCode: optionalString,
    description: optionalString,
    currencyCode: optionalString,
  })
  .passthrough();

const updateAccountSchema = z
  .object({
    accountId: positiveInt,
    number: optionalString,
    name: optionalString,
    notActive: optionalBoolean,
    incomeTypeCode: optionalString,
    balanceTypeCode: optionalString,
    cashFlowTypeCode: optionalString,
    typeCode: optionalString,
    description: optionalString,
    currencyCode: optionalString,
  })
  .passthrough();

const deleteAccountSchema = z.object({
  accountId: positiveInt,
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

    erply_create_account: {
      description:
        "Create a chart-of-accounts entry (POST /accounts). Requires number and name. Sends id: 0. Extra APIAccountInfo fields may be passed through. Some price plans may reject writes.",
      inputSchema: {
        type: "object" as const,
        properties: {
          number: { type: "string", description: "Account number (required)" },
          name: { type: "string", description: "Account name (required)" },
          notActive: { type: "boolean" },
          incomeTypeCode: { type: "string" },
          balanceTypeCode: { type: "string" },
          cashFlowTypeCode: { type: "string" },
          typeCode: { type: "string", description: "ACCOUNT_TYPE dictionary code" },
          description: { type: "string" },
          currencyCode: { type: "string" },
        },
        required: ["number", "name"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(createAccountSchema, params);
        const created = await client.post<Account>("/accounts", { ...args, id: 0 });
        return mutationToolResult(created);
      },
    },

    erply_update_account: {
      description:
        "Update a chart-of-accounts entry (PUT /accounts/{accountId}). Requires accountId. Path id wins over body id.",
      inputSchema: {
        type: "object" as const,
        properties: {
          accountId: { type: "number", description: "Account id (required)" },
          number: { type: "string" },
          name: { type: "string" },
          notActive: { type: "boolean" },
          incomeTypeCode: { type: "string" },
          balanceTypeCode: { type: "string" },
          cashFlowTypeCode: { type: "string" },
          typeCode: { type: "string" },
          description: { type: "string" },
          currencyCode: { type: "string" },
        },
        required: ["accountId"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(updateAccountSchema, params);
        const { accountId, ...body } = args;
        const updated = await client.put<Account>(`/accounts/${accountId}`, {
          ...body,
          id: accountId,
        });
        return mutationToolResult(updated);
      },
    },

    erply_delete_account: {
      description:
        "Delete a chart-of-accounts entry by id (DELETE /accounts/{accountId}). Destructive — requires an explicit accountId.",
      inputSchema: {
        type: "object" as const,
        properties: {
          accountId: { type: "number", description: "Account id to delete (required)" },
        },
        required: ["accountId"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(deleteAccountSchema, params);
        const result = await client.delete(`/accounts/${args.accountId}`);
        return mutationToolResult(result);
      },
    },
  };
}
