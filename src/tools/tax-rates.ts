import { z } from "zod";

import type { ErplyBooksClient } from "../client.js";
import type { TaxRate } from "../types/tax-rates.js";
import {
  optionalBoolean,
  optionalNonNegativeInt,
  optionalNumber,
  optionalPositiveInt,
  optionalString,
  parseToolArgs,
  positiveInt,
} from "../validation/tool-args.js";
import { jsonToolResult, mutationToolResult, unwrapListEnvelope } from "./list-response.js";

const listTaxRatesSchema = z.object({
  lang: optionalString,
  start: optionalNonNegativeInt,
  limit: optionalPositiveInt,
});

const createTaxRateSchema = z
  .object({
    name: z.string().min(1),
    percent: z.coerce.number(),
    description: optionalString,
    typeCode: optionalString,
    sales: optionalBoolean,
    purchase: optionalBoolean,
    partnerTaxRateId: optionalString,
    debitAccountId: optionalPositiveInt,
    creditAccountId: optionalPositiveInt,
    coefficient: optionalNumber,
    validToDate: optionalString,
    code: optionalString,
    additionalSalesDebitAccountId: optionalPositiveInt,
    additionalSalesCreditAccountId: optionalPositiveInt,
    additionalSalesPercent: optionalNumber,
    additionalPurchasesDebitAccountId: optionalPositiveInt,
    additionalPurchasesCreditAccountId: optionalPositiveInt,
    additionalPurchasesPercent: optionalNumber,
  })
  .passthrough();

const updateTaxRateSchema = z
  .object({
    taxRateId: positiveInt,
    name: optionalString,
    percent: optionalNumber,
    description: optionalString,
    typeCode: optionalString,
    sales: optionalBoolean,
    purchase: optionalBoolean,
    partnerTaxRateId: optionalString,
    debitAccountId: optionalPositiveInt,
    creditAccountId: optionalPositiveInt,
    coefficient: optionalNumber,
    validToDate: optionalString,
    code: optionalString,
    additionalSalesDebitAccountId: optionalPositiveInt,
    additionalSalesCreditAccountId: optionalPositiveInt,
    additionalSalesPercent: optionalNumber,
    additionalPurchasesDebitAccountId: optionalPositiveInt,
    additionalPurchasesCreditAccountId: optionalPositiveInt,
    additionalPurchasesPercent: optionalNumber,
  })
  .passthrough();

const deleteTaxRateSchema = z.object({
  taxRateId: positiveInt,
});

export function createTaxRateTools(client: ErplyBooksClient) {
  return {
    erply_list_tax_rates: {
      description:
        "List tax rates from Erply Books (GET /tax_rates). Returns { totalCount, items } (organisation blob stripped).",
      inputSchema: {
        type: "object" as const,
        properties: {
          lang: { type: "string", description: "Optional language code" },
          start: { type: "number", description: "Offset (default 0)" },
          limit: { type: "number", description: "Page size" },
        },
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(listTaxRatesSchema, params);
        const response = await client.get("/tax_rates", args);
        return jsonToolResult(unwrapListEnvelope<TaxRate>(response));
      },
    },

    erply_create_tax_rate: {
      description:
        "Create a tax rate (POST /tax_rates). Requires name and percent. Sends id: 0. Extra APITaxRateInfo fields may be passed through (typeCode, sales/purchase, account ids, etc.).",
      inputSchema: {
        type: "object" as const,
        properties: {
          name: { type: "string", description: "Tax rate name (required)" },
          percent: { type: "number", description: "Tax percent (required)" },
          description: { type: "string" },
          typeCode: { type: "string", description: "TAX_RATE dictionary code" },
          sales: { type: "boolean", description: "Applies to sales" },
          purchase: { type: "boolean", description: "Applies to purchases" },
          partnerTaxRateId: { type: "string" },
          debitAccountId: { type: "number" },
          creditAccountId: { type: "number" },
          coefficient: { type: "number" },
          validToDate: { type: "string" },
          code: { type: "string", description: "Code for label articles" },
          additionalSalesDebitAccountId: { type: "number" },
          additionalSalesCreditAccountId: { type: "number" },
          additionalSalesPercent: { type: "number" },
          additionalPurchasesDebitAccountId: { type: "number" },
          additionalPurchasesCreditAccountId: { type: "number" },
          additionalPurchasesPercent: { type: "number" },
        },
        required: ["name", "percent"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(createTaxRateSchema, params);
        const created = await client.post<TaxRate>("/tax_rates", { ...args, id: 0 });
        return mutationToolResult(created);
      },
    },

    erply_update_tax_rate: {
      description:
        "Update a tax rate (PUT /tax_rates/{taxRateId}). Requires taxRateId. Path id wins over body id.",
      inputSchema: {
        type: "object" as const,
        properties: {
          taxRateId: { type: "number", description: "Tax rate id (required)" },
          name: { type: "string" },
          percent: { type: "number" },
          description: { type: "string" },
          typeCode: { type: "string" },
          sales: { type: "boolean" },
          purchase: { type: "boolean" },
          partnerTaxRateId: { type: "string" },
          debitAccountId: { type: "number" },
          creditAccountId: { type: "number" },
          coefficient: { type: "number" },
          validToDate: { type: "string" },
          code: { type: "string" },
          additionalSalesDebitAccountId: { type: "number" },
          additionalSalesCreditAccountId: { type: "number" },
          additionalSalesPercent: { type: "number" },
          additionalPurchasesDebitAccountId: { type: "number" },
          additionalPurchasesCreditAccountId: { type: "number" },
          additionalPurchasesPercent: { type: "number" },
        },
        required: ["taxRateId"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(updateTaxRateSchema, params);
        const { taxRateId, ...body } = args;
        const updated = await client.put<TaxRate>(`/tax_rates/${taxRateId}`, {
          ...body,
          id: taxRateId,
        });
        return mutationToolResult(updated);
      },
    },

    erply_delete_tax_rate: {
      description:
        "Delete a tax rate by id (DELETE /tax_rates/{taxRateId}). Destructive — requires an explicit taxRateId.",
      inputSchema: {
        type: "object" as const,
        properties: {
          taxRateId: { type: "number", description: "Tax rate id to delete (required)" },
        },
        required: ["taxRateId"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(deleteTaxRateSchema, params);
        const result = await client.delete(`/tax_rates/${args.taxRateId}`);
        return mutationToolResult(result);
      },
    },
  };
}
