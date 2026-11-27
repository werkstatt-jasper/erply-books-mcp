import { z } from "zod";

import type { ErplyBooksClient } from "../client.js";
import {
  optionalBoolean,
  optionalNonNegativeInt,
  optionalPositiveInt,
  optionalString,
  parseToolArgs,
} from "../validation/tool-args.js";
import { jsonToolResult } from "./list-response.js";

const emptyToolArgs = z.object({});

const addAttributesSchema = z.object({
  ids: optionalString,
  attributeName: optionalString,
  attributeValue: optionalString,
});

const approveRemindersSchema = z.object({
  id: optionalString,
});

const countriesSchema = z.object({
  languageCode: optionalString,
});

const currencyRatesSchema = z.object({
  firstCurrency: optionalString,
  secondCurrency: optionalString,
  opDate: optionalString,
});

const eePartnerCodesSchema = z.object({
  isLegalEntity: optionalBoolean,
  name: optionalString,
  country: optionalString,
  regCode: optionalString,
  start: optionalNonNegativeInt,
  limit: optionalPositiveInt,
});

const parametersSchema = z.object({
  typeCode: optionalString,
});

const translationsSchema = z.object({
  lang: optionalString,
});

export function createSettingsTools(client: ErplyBooksClient) {
  return {
    erply_add_attributes_to_erply_invoices: {
      description:
        "GET /settings/add_attributes_to_erply_invoices. Warning: this is a GET in the OpenAPI spec, " +
        "but the path and operationId (addAttributesToErplyInvoices) suggest it may add attributes to " +
        "Erply invoices as a side effect. Optional query params: ids, attributeName, attributeValue. " +
        "Returns the API body as-is.",
      inputSchema: {
        type: "object" as const,
        properties: {
          ids: {
            type: "string",
            description: "Optional invoice id list (as accepted by the API)",
          },
          attributeName: {
            type: "string",
            description: "Optional attribute name to add",
          },
          attributeValue: {
            type: "string",
            description: "Optional attribute value to add",
          },
        },
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(addAttributesSchema, params);
        const body = await client.get("/settings/add_attributes_to_erply_invoices", {
          ids: args.ids,
          attributeName: args.attributeName,
          attributeValue: args.attributeValue,
        });
        return jsonToolResult(body);
      },
    },
    erply_list_all_subscription_invoices: {
      description:
        "List all subscription invoices (GET /settings/all_subscription_invoices). Returns the API body as-is.",
      inputSchema: {
        type: "object" as const,
        properties: {},
      },
      handler: async (params: unknown) => {
        parseToolArgs(emptyToolArgs, params);
        const body = await client.get("/settings/all_subscription_invoices");
        return jsonToolResult(body);
      },
    },
    erply_list_api_whitelist: {
      description:
        "List API token IP whitelist entries (GET /settings/api_whitelist). Returns the API body as-is.",
      inputSchema: {
        type: "object" as const,
        properties: {},
      },
      handler: async (params: unknown) => {
        parseToolArgs(emptyToolArgs, params);
        const body = await client.get("/settings/api_whitelist");
        return jsonToolResult(body);
      },
    },
    erply_list_api_whitelist_v2: {
      description:
        "Fetch user-organisation auth / whitelist info (GET /settings/api_whitelistV2). Returns the API body as-is.",
      inputSchema: {
        type: "object" as const,
        properties: {},
      },
      handler: async (params: unknown) => {
        parseToolArgs(emptyToolArgs, params);
        const body = await client.get("/settings/api_whitelistV2");
        return jsonToolResult(body);
      },
    },
    erply_approve_sending_reminders: {
      description:
        "GET /settings/approve_sending_reminders. Warning: this is a GET in the OpenAPI spec, " +
        "but the path and operationId (sendReminders) suggest it may send or approve payment reminders " +
        "as a side effect. Optional query param: id. Returns the API body as-is.",
      inputSchema: {
        type: "object" as const,
        properties: {
          id: {
            type: "string",
            description: "Optional reminder or document id",
          },
        },
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(approveRemindersSchema, params);
        const body = await client.get("/settings/approve_sending_reminders", { id: args.id });
        return jsonToolResult(body);
      },
    },
    erply_list_auth_permissions: {
      description:
        "List organisation auth permissions (GET /settings/auth_permissions). Returns the API body as-is.",
      inputSchema: {
        type: "object" as const,
        properties: {},
      },
      handler: async (params: unknown) => {
        parseToolArgs(emptyToolArgs, params);
        const body = await client.get("/settings/auth_permissions");
        return jsonToolResult(body);
      },
    },
    erply_list_auth_permission_users: {
      description:
        "List users for the organisation (GET /settings/auth_permissions/users). Returns the API body as-is.",
      inputSchema: {
        type: "object" as const,
        properties: {},
      },
      handler: async (params: unknown) => {
        parseToolArgs(emptyToolArgs, params);
        const body = await client.get("/settings/auth_permissions/users");
        return jsonToolResult(body);
      },
    },
    erply_list_countries: {
      description:
        "List countries (GET /settings/countries). Optional languageCode (e.g. LANGUAGE_ET) localizes names. " +
        "Returns the API body as-is.",
      inputSchema: {
        type: "object" as const,
        properties: {
          languageCode: {
            type: "string",
            description: "Optional language code for localized names (e.g. LANGUAGE_ET)",
          },
        },
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(countriesSchema, params);
        const body = await client.get("/settings/countries", { languageCode: args.languageCode });
        return jsonToolResult(body);
      },
    },
    erply_get_currency_rates: {
      description:
        "Fetch currency rates used for calculation (GET /settings/currency_rates). " +
        "Optional firstCurrency, secondCurrency, and opDate (YYYY-MM-DD). Returns the API body as-is.",
      inputSchema: {
        type: "object" as const,
        properties: {
          firstCurrency: {
            type: "string",
            description: "Optional source currency code (e.g. EUR)",
          },
          secondCurrency: {
            type: "string",
            description: "Optional target currency code (e.g. USD)",
          },
          opDate: {
            type: "string",
            description: "Optional operation date (YYYY-MM-DD)",
          },
        },
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(currencyRatesSchema, params);
        const body = await client.get("/settings/currency_rates", {
          firstCurrency: args.firstCurrency,
          secondCurrency: args.secondCurrency,
          opDate: args.opDate,
        });
        return jsonToolResult(body);
      },
    },
    erply_list_default_priceplans: {
      description:
        "List default price plans (GET /settings/default_priceplans). Returns the API body as-is.",
      inputSchema: {
        type: "object" as const,
        properties: {},
      },
      handler: async (params: unknown) => {
        parseToolArgs(emptyToolArgs, params);
        const body = await client.get("/settings/default_priceplans");
        return jsonToolResult(body);
      },
    },
    erply_list_ee_partner_codes: {
      description:
        "Look up Estonian partner codes (GET /settings/ee/get_partner_code). " +
        "Optional filters: isLegalEntity, name, country, regCode, start, limit. Returns the API body as-is.",
      inputSchema: {
        type: "object" as const,
        properties: {
          isLegalEntity: {
            type: "boolean",
            description: "Optional filter for legal entities vs individuals",
          },
          name: { type: "string", description: "Optional name filter" },
          country: { type: "string", description: "Optional country filter" },
          regCode: { type: "string", description: "Optional registration code" },
          start: { type: "number", description: "Offset (default 0)" },
          limit: { type: "number", description: "Page size" },
        },
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(eePartnerCodesSchema, params);
        const body = await client.get("/settings/ee/get_partner_code", {
          isLegalEntity: args.isLegalEntity,
          name: args.name,
          country: args.country,
          regCode: args.regCode,
          start: args.start,
          limit: args.limit,
        });
        return jsonToolResult(body);
      },
    },
    erply_list_valid_payer_organisations: {
      description:
        "List valid payer organisations (GET /settings/find_valid_payer_organisations). Returns the API body as-is.",
      inputSchema: {
        type: "object" as const,
        properties: {},
      },
      handler: async (params: unknown) => {
        parseToolArgs(emptyToolArgs, params);
        const body = await client.get("/settings/find_valid_payer_organisations");
        return jsonToolResult(body);
      },
    },
    erply_get_payer_organisation_documents: {
      description:
        "Fetch payer organisation documents (GET /settings/get_payer_organisation_documents). Returns the API body as-is.",
      inputSchema: {
        type: "object" as const,
        properties: {},
      },
      handler: async (params: unknown) => {
        parseToolArgs(emptyToolArgs, params);
        const body = await client.get("/settings/get_payer_organisation_documents");
        return jsonToolResult(body);
      },
    },
    erply_get_my_user_info: {
      description: "Fetch the current user profile (GET /settings/me). Returns the API body as-is.",
      inputSchema: {
        type: "object" as const,
        properties: {},
      },
      handler: async (params: unknown) => {
        parseToolArgs(emptyToolArgs, params);
        const body = await client.get("/settings/me");
        return jsonToolResult(body);
      },
    },
    erply_get_parameters: {
      description:
        "Fetch user/organisation parameters (GET /settings/parameters). " +
        "Optional typeCode selects a parameter group. Returns the API body as-is.",
      inputSchema: {
        type: "object" as const,
        properties: {
          typeCode: {
            type: "string",
            description: "Optional parameter type code filter",
          },
        },
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(parametersSchema, params);
        const body = await client.get("/settings/parameters", { typeCode: args.typeCode });
        return jsonToolResult(body);
      },
    },
    erply_get_parameters_encrypted: {
      description:
        "Fetch encrypted user parameters (GET /settings/parameters_encrypted). " +
        "Optional typeCode selects a parameter group. The response may include secrets; treat it as credentials. " +
        "Returns the API body as-is.",
      inputSchema: {
        type: "object" as const,
        properties: {
          typeCode: {
            type: "string",
            description: "Optional parameter type code filter",
          },
        },
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(parametersSchema, params);
        const body = await client.get("/settings/parameters_encrypted", {
          typeCode: args.typeCode,
        });
        return jsonToolResult(body);
      },
    },
    erply_list_system_articles: {
      description:
        "List system article features (GET /settings/system_article). Returns the API body as-is.",
      inputSchema: {
        type: "object" as const,
        properties: {},
      },
      handler: async (params: unknown) => {
        parseToolArgs(emptyToolArgs, params);
        const body = await client.get("/settings/system_article");
        return jsonToolResult(body);
      },
    },
    erply_get_translations: {
      description:
        "Fetch UI translations (GET /settings/translations). Optional lang (e.g. LANGUAGE_ET or et). " +
        "Returns the API body as-is.",
      inputSchema: {
        type: "object" as const,
        properties: {
          lang: {
            type: "string",
            description: "Optional language code (e.g. LANGUAGE_ET)",
          },
        },
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(translationsSchema, params);
        const body = await client.get("/settings/translations", { lang: args.lang });
        return jsonToolResult(body);
      },
    },
    erply_list_unpaid_subscription_invoices: {
      description:
        "List unpaid subscription invoices (GET /settings/unpaid_subscription_invoices). Returns the API body as-is.",
      inputSchema: {
        type: "object" as const,
        properties: {},
      },
      handler: async (params: unknown) => {
        parseToolArgs(emptyToolArgs, params);
        const body = await client.get("/settings/unpaid_subscription_invoices");
        return jsonToolResult(body);
      },
    },
  };
}
