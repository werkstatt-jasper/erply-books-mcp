import { z } from "zod";

import type { ErplyBooksClient } from "../client.js";
import type { Organisation } from "../types/organisation.js";
import { optionalInt, optionalString, parseToolArgs } from "../validation/tool-args.js";
import { jsonToolResult } from "./list-response.js";

const emptyToolArgs = z.object({});

const listOrganisationsSchema = z.object({
  privilege: optionalString,
});

const getGoerpTokenSchema = z.object({
  type: optionalString,
});

const lastHistoryActionSchema = z.object({
  userId: optionalInt,
});

export function createOrganisationTools(client: ErplyBooksClient) {
  return {
    erply_get_organisation: {
      description:
        "Get the Erply Books organisation bound to the API token (name, registration code, addresses, VAT, currency).",
      inputSchema: {
        type: "object" as const,
        properties: {},
      },
      handler: async (params: unknown) => {
        parseToolArgs(emptyToolArgs, params);
        const org = await client.get<Organisation>("/organisation");
        return jsonToolResult(org);
      },
    },
    erply_list_organisations: {
      description:
        "List organisations visible to the API token (GET /organisation/all). " +
        "Optional privilege filters the list. Returns the API body as-is.",
      inputSchema: {
        type: "object" as const,
        properties: {
          privilege: {
            type: "string",
            description: "Optional privilege filter",
          },
        },
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(listOrganisationsSchema, params);
        const body = await client.get("/organisation/all", { privilege: args.privilege });
        return jsonToolResult(body);
      },
    },
    erply_get_goerp_token: {
      description:
        "Fetch the GoERP crypto token for the organisation (GET /organisation/get_goerp_token). " +
        "Optional type selects the token variant. The response may include a secret; treat it as credentials.",
      inputSchema: {
        type: "object" as const,
        properties: {
          type: {
            type: "string",
            description: "Optional token type filter",
          },
        },
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(getGoerpTokenSchema, params);
        const body = await client.get("/organisation/get_goerp_token", { type: args.type });
        return jsonToolResult(body);
      },
    },
    erply_is_key_valid: {
      description:
        "Check whether the current API key is valid (GET /organisation/is_key_valid). Returns the API body as-is.",
      inputSchema: {
        type: "object" as const,
        properties: {},
      },
      handler: async (params: unknown) => {
        parseToolArgs(emptyToolArgs, params);
        const body = await client.get("/organisation/is_key_valid");
        return jsonToolResult(body);
      },
    },
    erply_is_token_valid: {
      description:
        "Check whether the current API token is valid (GET /organisation/is_token_valid). Returns the API body as-is.",
      inputSchema: {
        type: "object" as const,
        properties: {},
      },
      handler: async (params: unknown) => {
        parseToolArgs(emptyToolArgs, params);
        const body = await client.get("/organisation/is_token_valid");
        return jsonToolResult(body);
      },
    },
    erply_list_last_history_actions: {
      description:
        "Fetch the last 100 user activity records (GET /organisation/last_history_action). " +
        "Optional userId limits the list to one user. Returns the API body as-is.",
      inputSchema: {
        type: "object" as const,
        properties: {
          userId: {
            type: "number",
            description: "Optional user id to filter activity",
          },
        },
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(lastHistoryActionSchema, params);
        const body = await client.get("/organisation/last_history_action", { userId: args.userId });
        return jsonToolResult(body);
      },
    },
    erply_list_organisation_terms: {
      description:
        "List organisation payment terms (GET /organisation/terms). Returns the API body as-is.",
      inputSchema: {
        type: "object" as const,
        properties: {},
      },
      handler: async (params: unknown) => {
        parseToolArgs(emptyToolArgs, params);
        const body = await client.get("/organisation/terms");
        return jsonToolResult(body);
      },
    },
  };
}
