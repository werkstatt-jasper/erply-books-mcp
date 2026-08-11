import { z } from "zod";

import type { ErplyBooksClient } from "../client.js";
import { ERPLY_DICTIONARY_CODES } from "../types/dictionaries.js";
import { optionalString, parseToolArgs } from "../validation/tool-args.js";
import { jsonToolResult } from "./list-response.js";

const getDictionarySchema = z.object({
  dictionaryCode: z.enum(ERPLY_DICTIONARY_CODES),
  languageCode: optionalString,
});

export function createDictionaryTools(client: ErplyBooksClient) {
  return {
    erply_get_dictionary: {
      description:
        "Fetch Erply Books dictionary entries (GET /settings/dictionaries/{dictionaryCode}). " +
        "dictionaryCode must be one of: ACCOUNT_TYPE, TRANSACTION_TYPE, INCOME_TYPE, BALANCE_TYPE, " +
        "ACCOUNT_FEATURE_TYPE, DOCUMENT_TYPE, ENTITY_TYPE, ARTICLE_TYPE, UNIT, PAYMENT_TYPE, " +
        "ARTICLE_ROW_TYPE, CURRENCY, CASH_FLOW_TYPE, ARTICLE_FEATURE_TYPE, TAX_RATE_TYPE, " +
        "DOCUMENT_STATUS_TYPE, LANGUAGE. Optional languageCode (e.g. LANGUAGE_ET) localizes names.",
      inputSchema: {
        type: "object" as const,
        properties: {
          dictionaryCode: {
            type: "string",
            description: "Dictionary code (e.g. DOCUMENT_TYPE, PAYMENT_TYPE, CURRENCY)",
          },
          languageCode: {
            type: "string",
            description: "Optional language code for localized names (e.g. LANGUAGE_ET)",
          },
        },
        required: ["dictionaryCode"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(getDictionarySchema, params);
        const dictionary = await client.get(`/settings/dictionaries/${args.dictionaryCode}`, {
          languageCode: args.languageCode,
        });
        return jsonToolResult(dictionary);
      },
    },
  };
}
