import { z } from "zod";

import type { ErplyBooksClient } from "../client.js";
import {
  optionalBoolean,
  optionalPositiveInt,
  optionalString,
  parseToolArgs,
  ymdDateString,
} from "../validation/tool-args.js";
import { jsonToolResult } from "./list-response.js";

const dateRangeSchema = z.object({
  dateFrom: ymdDateString,
  dateTo: ymdDateString,
});

const balanceIncomeSchema = dateRangeSchema.extend({
  projectId: optionalPositiveInt,
  printByCategories: optionalBoolean,
  printWithAccounts: optionalBoolean,
  removeZeroValues: optionalBoolean,
  getConsolidated: optionalBoolean,
});

const agedSchema = dateRangeSchema.extend({
  customerId: optionalPositiveInt,
  projectId: optionalPositiveInt,
  showOnlyOverdue: optionalBoolean,
  showCustomers: optionalBoolean,
  keyword: optionalString,
  currencyCode: optionalString,
});

const generalLedgerSchema = dateRangeSchema.extend({
  accountId: optionalPositiveInt,
  customerId: optionalPositiveInt,
  projectId: optionalPositiveInt,
  articleId: optionalPositiveInt,
  balanceType: optionalString,
  incomeType: optionalString,
  reportType: optionalString,
  getSummary: optionalBoolean,
});

export function createReportTools(client: ErplyBooksClient) {
  return {
    erply_balance_sheet: {
      description:
        "Fetch the Erply Books balance sheet report (GET /reports/balance_sheet). Requires dateFrom and dateTo. Some orgs/plans return HTTP 500 or 409.",
      inputSchema: {
        type: "object" as const,
        properties: {
          dateFrom: { type: "string", description: "Start date YYYY-MM-DD (required)" },
          dateTo: { type: "string", description: "End date YYYY-MM-DD (required)" },
          projectId: { type: "number", description: "Optional project filter" },
          printByCategories: { type: "boolean" },
          printWithAccounts: { type: "boolean" },
          removeZeroValues: { type: "boolean" },
          getConsolidated: { type: "boolean" },
        },
        required: ["dateFrom", "dateTo"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(balanceIncomeSchema, params);
        const report = await client.get("/reports/balance_sheet", args);
        return jsonToolResult(report);
      },
    },

    erply_income_sheet: {
      description:
        "Fetch the Erply Books income statement / P&L (GET /reports/income_sheet). Requires dateFrom and dateTo. Some orgs/plans return HTTP 500 or 409.",
      inputSchema: {
        type: "object" as const,
        properties: {
          dateFrom: { type: "string", description: "Start date YYYY-MM-DD (required)" },
          dateTo: { type: "string", description: "End date YYYY-MM-DD (required)" },
          projectId: { type: "number", description: "Optional project filter" },
          printByCategories: { type: "boolean" },
          printWithAccounts: { type: "boolean" },
          removeZeroValues: { type: "boolean" },
          getConsolidated: { type: "boolean" },
        },
        required: ["dateFrom", "dateTo"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(balanceIncomeSchema, params);
        const report = await client.get("/reports/income_sheet", args);
        return jsonToolResult(report);
      },
    },

    erply_aged_receivables: {
      description:
        "Fetch aged receivables/payables style report (GET /reports/aged). Requires dateFrom and dateTo. Some price plans return HTTP 409 (e.g. MODULE_SUPPLIER_REPORT).",
      inputSchema: {
        type: "object" as const,
        properties: {
          dateFrom: { type: "string", description: "Start date YYYY-MM-DD (required)" },
          dateTo: { type: "string", description: "End date YYYY-MM-DD (required)" },
          customerId: { type: "number" },
          projectId: { type: "number" },
          showOnlyOverdue: { type: "boolean" },
          showCustomers: { type: "boolean" },
          keyword: { type: "string" },
          currencyCode: { type: "string" },
        },
        required: ["dateFrom", "dateTo"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(agedSchema, params);
        const report = await client.get("/reports/aged", args);
        return jsonToolResult(report);
      },
    },

    erply_general_ledger: {
      description:
        "Fetch the general ledger report (GET /reports/general_ledger). Requires dateFrom and dateTo. Optional accountId and related filters. Some orgs return HTTP 500.",
      inputSchema: {
        type: "object" as const,
        properties: {
          dateFrom: { type: "string", description: "Start date YYYY-MM-DD (required)" },
          dateTo: { type: "string", description: "End date YYYY-MM-DD (required)" },
          accountId: { type: "number" },
          customerId: { type: "number" },
          projectId: { type: "number" },
          articleId: { type: "number" },
          balanceType: { type: "string" },
          incomeType: { type: "string" },
          reportType: { type: "string" },
          getSummary: { type: "boolean" },
        },
        required: ["dateFrom", "dateTo"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(generalLedgerSchema, params);
        const report = await client.get("/reports/general_ledger", args);
        return jsonToolResult(report);
      },
    },
  };
}
