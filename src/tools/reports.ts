import { z } from "zod";

import type { ErplyBooksClient } from "../client.js";
import {
  optionalBoolean,
  optionalInt,
  optionalNonNegativeInt,
  optionalPositiveInt,
  optionalString,
  optionalYmd,
  parseToolArgs,
  ymdDateString,
} from "../validation/tool-args.js";
import { bytesToolResult, jsonToolResult } from "./list-response.js";

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
  comparativeDateFrom: optionalYmd,
  comparativeDateTo: optionalYmd,
  budgetName: optionalString,
  cashFlowReport: optionalBoolean,
  currencyCode: optionalString,
  lang: optionalString,
  layout: optionalString,
  isCsv: optionalBoolean,
  addSummaries: optionalBoolean,
});

const agedSchema = dateRangeSchema.extend({
  customerId: optionalPositiveInt,
  projectId: optionalPositiveInt,
  showOnlyOverdue: optionalBoolean,
  showCustomers: optionalBoolean,
  keyword: optionalString,
  currencyCode: optionalString,
  changedSinceSeconds: optionalNonNegativeInt,
});

const generalLedgerSchema = dateRangeSchema.extend({
  accountId: optionalPositiveInt,
  customerId: optionalPositiveInt,
  projectId: optionalPositiveInt,
  articleId: optionalPositiveInt,
  balanceType: optionalString,
  incomeType: optionalString,
  reportType: optionalInt,
  getSummary: optionalBoolean,
});

const daybookSchema = dateRangeSchema.extend({
  accountId: optionalPositiveInt,
  typeCode: optionalString,
  projectId: optionalPositiveInt,
  documentId: optionalPositiveInt,
  keyword: optionalString,
  start: optionalNonNegativeInt,
  limit: optionalPositiveInt,
});

const trialBalanceSchema = dateRangeSchema.extend({
  accountId: optionalPositiveInt,
  projectId: optionalPositiveInt,
  getSummary: optionalBoolean,
  getConsolidated: optionalBoolean,
  printWithAccounts: optionalBoolean,
  balanceType: optionalString,
  start: optionalNonNegativeInt,
  limit: optionalPositiveInt,
});

const vatEeSchema = dateRangeSchema.extend({
  projectId: optionalPositiveInt,
  showSales: optionalBoolean,
  showPurchases: optionalBoolean,
  cashBasis: optionalBoolean,
  country: optionalString,
  transactionTypes: optionalString,
  versionNr: optionalString,
});

const contactBalanceSchema = dateRangeSchema.extend({
  customerId: optionalPositiveInt,
  projectId: optionalPositiveInt,
  showCustomers: optionalBoolean,
  showOnlyOverdue: optionalBoolean,
  currencyCode: optionalString,
  keyword: optionalString,
  changedSinceSeconds: optionalNonNegativeInt,
  addBalanceAtEndOfLastPeriod: optionalBoolean,
  addPaymentsThisPeriodForLastPeriod: optionalBoolean,
  addLastPeriodInvoicesBalanceAtEndOfLastPeriod: optionalBoolean,
  addInvoicesFromLastPeriod: optionalBoolean,
  addLastPeriodPayments: optionalBoolean,
  addThisPeriodPayments: optionalBoolean,
  addLastPeriodPaymentsForLastPeriodInvoices: optionalBoolean,
  start: optionalNonNegativeInt,
  limit: optionalPositiveInt,
});

const fixedAssetsSchema = dateRangeSchema.extend({
  projectId: optionalPositiveInt,
  customerId: optionalPositiveInt,
  articleId: optionalPositiveInt,
  documentId: optionalPositiveInt,
  expenseAccountId: optionalPositiveInt,
  getFixedAssets: optionalBoolean,
  start: optionalNonNegativeInt,
  limit: optionalPositiveInt,
});

const balanceIncomeQueryProperties = {
  dateFrom: { type: "string" as const, description: "Start date YYYY-MM-DD (required)" },
  dateTo: { type: "string" as const, description: "End date YYYY-MM-DD (required)" },
  projectId: { type: "number" as const, description: "Optional project filter" },
  printByCategories: { type: "boolean" as const },
  printWithAccounts: { type: "boolean" as const },
  removeZeroValues: { type: "boolean" as const },
  getConsolidated: { type: "boolean" as const },
  comparativeDateFrom: {
    type: "string" as const,
    description: "Comparative period start (YYYY-MM-DD)",
  },
  comparativeDateTo: {
    type: "string" as const,
    description: "Comparative period end (YYYY-MM-DD)",
  },
  budgetName: { type: "string" as const, description: "Budget name when comparing to a budget" },
  cashFlowReport: { type: "boolean" as const, description: "Request the cash-flow presentation" },
  currencyCode: { type: "string" as const },
  lang: { type: "string" as const, description: "Optional language code" },
  layout: { type: "string" as const, description: "Report layout identifier" },
  isCsv: {
    type: "boolean" as const,
    description:
      "Request a CSV body; when true the tool reads the raw response so CSV is not JSON-parsed",
  },
  addSummaries: { type: "boolean" as const, description: "Include summary rows" },
};

async function fetchBalanceIncomeReport(
  client: ErplyBooksClient,
  path: "/reports/balance_sheet" | "/reports/income_sheet",
  params: unknown,
) {
  const args = parseToolArgs(balanceIncomeSchema, params);
  if (args.isCsv) {
    const bytes = await client.getArrayBuffer(path, args);
    return bytesToolResult(bytes);
  }
  const report = await client.get(path, args);
  return jsonToolResult(report);
}

export function createReportTools(client: ErplyBooksClient) {
  return {
    erply_balance_sheet: {
      description:
        "Fetch the Erply Books balance sheet report (GET /reports/balance_sheet). Requires dateFrom and dateTo. Optional comparativeDateFrom/To, budgetName, cashFlowReport, currencyCode, lang, layout, addSummaries, and isCsv. Some orgs/plans return HTTP 500 or 409.",
      inputSchema: {
        type: "object" as const,
        properties: balanceIncomeQueryProperties,
        required: ["dateFrom", "dateTo"],
      },
      handler: async (params: unknown) => {
        return fetchBalanceIncomeReport(client, "/reports/balance_sheet", params);
      },
    },

    erply_income_sheet: {
      description:
        "Fetch the Erply Books income statement / P&L (GET /reports/income_sheet). Requires dateFrom and dateTo. Optional comparativeDateFrom/To, budgetName, cashFlowReport, currencyCode, lang, layout, addSummaries, and isCsv. Some orgs/plans return HTTP 500 or 409.",
      inputSchema: {
        type: "object" as const,
        properties: balanceIncomeQueryProperties,
        required: ["dateFrom", "dateTo"],
      },
      handler: async (params: unknown) => {
        return fetchBalanceIncomeReport(client, "/reports/income_sheet", params);
      },
    },

    erply_aged_receivables: {
      description:
        "Fetch aged receivables/payables style report (GET /reports/aged). Requires dateFrom and dateTo. Optional changedSinceSeconds for incremental sync. Some price plans return HTTP 409 (e.g. MODULE_SUPPLIER_REPORT).",
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
          changedSinceSeconds: {
            type: "number",
            description:
              "Incremental sync cursor (non-negative seconds, per OpenAPI changedSinceSeconds)",
          },
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
          reportType: { type: "number", description: "Report type filter (integer per spec)" },
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

    erply_daybook: {
      description:
        "Fetch the daybook report (GET /reports/daybook). Requires dateFrom and dateTo. Optional accountId, typeCode, projectId, documentId, keyword, start, limit. Some orgs/plans return HTTP 500 or 409.",
      inputSchema: {
        type: "object" as const,
        properties: {
          dateFrom: { type: "string", description: "Start date YYYY-MM-DD (required)" },
          dateTo: { type: "string", description: "End date YYYY-MM-DD (required)" },
          accountId: { type: "number" },
          typeCode: { type: "string", description: "Transaction type code filter" },
          projectId: { type: "number" },
          documentId: { type: "number" },
          keyword: { type: "string" },
          start: { type: "number", description: "Offset (default 0)" },
          limit: { type: "number", description: "Page size" },
        },
        required: ["dateFrom", "dateTo"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(daybookSchema, params);
        const report = await client.get("/reports/daybook", args);
        return jsonToolResult(report);
      },
    },

    erply_trial_balance: {
      description:
        "Fetch the trial balance / account registry report (GET /reports/trial_balance). Requires dateFrom and dateTo. Optional accountId, projectId, getSummary, getConsolidated, printWithAccounts, balanceType, start, limit. Some orgs/plans return HTTP 500 or 409.",
      inputSchema: {
        type: "object" as const,
        properties: {
          dateFrom: { type: "string", description: "Start date YYYY-MM-DD (required)" },
          dateTo: { type: "string", description: "End date YYYY-MM-DD (required)" },
          accountId: { type: "number" },
          projectId: { type: "number" },
          getSummary: { type: "boolean" },
          getConsolidated: { type: "boolean" },
          printWithAccounts: { type: "boolean" },
          balanceType: { type: "string" },
          start: { type: "number", description: "Offset (default 0)" },
          limit: { type: "number", description: "Page size" },
        },
        required: ["dateFrom", "dateTo"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(trialBalanceSchema, params);
        const report = await client.get("/reports/trial_balance", args);
        return jsonToolResult(report);
      },
    },

    erply_vat_ee: {
      description:
        "Fetch the Estonian VAT declaration report (GET /reports/tax/ee/vat). Requires dateFrom and dateTo. Optional projectId, showSales, showPurchases, cashBasis, country, transactionTypes, versionNr. Some orgs/plans return HTTP 500 or 409.",
      inputSchema: {
        type: "object" as const,
        properties: {
          dateFrom: { type: "string", description: "Start date YYYY-MM-DD (required)" },
          dateTo: { type: "string", description: "End date YYYY-MM-DD (required)" },
          projectId: { type: "number" },
          showSales: { type: "boolean" },
          showPurchases: { type: "boolean" },
          cashBasis: { type: "boolean" },
          country: { type: "string" },
          transactionTypes: { type: "string" },
          versionNr: { type: "string", description: "VAT declaration form version" },
        },
        required: ["dateFrom", "dateTo"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(vatEeSchema, params);
        const report = await client.get("/reports/tax/ee/vat", args);
        return jsonToolResult(report);
      },
    },

    erply_contact_balance: {
      description:
        "Fetch contact/customer balance report (GET /reports/contact_balance). Requires dateFrom and dateTo. Optional customerId, projectId, showCustomers, showOnlyOverdue, currencyCode, keyword, start, limit, changedSinceSeconds, and period-comparison flags (addBalanceAtEndOfLastPeriod, addPaymentsThisPeriodForLastPeriod, addLastPeriodInvoicesBalanceAtEndOfLastPeriod, addInvoicesFromLastPeriod, addLastPeriodPayments, addThisPeriodPayments, addLastPeriodPaymentsForLastPeriodInvoices). Some orgs/plans return HTTP 500 or 409.",
      inputSchema: {
        type: "object" as const,
        properties: {
          dateFrom: { type: "string", description: "Start date YYYY-MM-DD (required)" },
          dateTo: { type: "string", description: "End date YYYY-MM-DD (required)" },
          customerId: { type: "number" },
          projectId: { type: "number" },
          showCustomers: { type: "boolean" },
          showOnlyOverdue: { type: "boolean" },
          currencyCode: { type: "string" },
          keyword: { type: "string" },
          changedSinceSeconds: {
            type: "number",
            description:
              "Incremental sync cursor (non-negative seconds, per OpenAPI changedSinceSeconds)",
          },
          addBalanceAtEndOfLastPeriod: { type: "boolean" },
          addPaymentsThisPeriodForLastPeriod: { type: "boolean" },
          addLastPeriodInvoicesBalanceAtEndOfLastPeriod: { type: "boolean" },
          addInvoicesFromLastPeriod: { type: "boolean" },
          addLastPeriodPayments: { type: "boolean" },
          addThisPeriodPayments: { type: "boolean" },
          addLastPeriodPaymentsForLastPeriodInvoices: { type: "boolean" },
          start: { type: "number", description: "Offset (default 0)" },
          limit: { type: "number", description: "Page size" },
        },
        required: ["dateFrom", "dateTo"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(contactBalanceSchema, params);
        const report = await client.get("/reports/contact_balance", args);
        return jsonToolResult(report);
      },
    },

    erply_fixed_assets: {
      description:
        "Fetch fixed assets report (GET /reports/fixed_assets). Requires dateFrom and dateTo. Optional projectId, customerId, articleId, documentId, expenseAccountId, getFixedAssets, start, limit. Some orgs/plans return HTTP 500 or 409.",
      inputSchema: {
        type: "object" as const,
        properties: {
          dateFrom: { type: "string", description: "Start date YYYY-MM-DD (required)" },
          dateTo: { type: "string", description: "End date YYYY-MM-DD (required)" },
          projectId: { type: "number" },
          customerId: { type: "number" },
          articleId: { type: "number" },
          documentId: { type: "number" },
          expenseAccountId: { type: "number" },
          getFixedAssets: { type: "boolean" },
          start: { type: "number", description: "Offset (default 0)" },
          limit: { type: "number", description: "Page size" },
        },
        required: ["dateFrom", "dateTo"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(fixedAssetsSchema, params);
        const report = await client.get("/reports/fixed_assets", args);
        return jsonToolResult(report);
      },
    },
  };
}
