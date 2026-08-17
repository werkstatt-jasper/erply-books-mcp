import { z } from "zod";

import type { ErplyBooksClient } from "../client.js";
import type { Customer, CustomerBankAccount, CustomerV2 } from "../types/customers.js";
import {
  optionalBoolean,
  optionalNonNegativeInt,
  optionalNumber,
  optionalPositiveInt,
  optionalString,
  optionalYmd,
  parseToolArgs,
  positiveInt,
} from "../validation/tool-args.js";
import { jsonToolResult, mutationToolResult, unwrapListEnvelope } from "./list-response.js";

/** Accept comma-separated string or non-empty number array → API string. */
const idsQuerySchema = z.union([z.string().min(1), z.array(positiveInt).min(1)]);

function toIdsString(ids: string | number[]): string {
  return Array.isArray(ids) ? ids.join(",") : ids;
}

const listBankAccountsSchema = z.object({
  customerId: positiveInt,
  start: optionalNonNegativeInt,
  limit: optionalPositiveInt,
});

const getBankAccountSchema = z.object({
  bankAccountId: positiveInt,
  customerId: positiveInt,
});

const createBankAccountSchema = z
  .object({
    customerId: positiveInt,
    iban: optionalString,
    accountNumber: optionalString,
    bankName: optionalString,
    swift: optionalString,
    bankIdentifier: optionalString,
    accountId: optionalPositiveInt,
    ifMainAccount: optionalBoolean,
  })
  .passthrough();

const updateBankAccountSchema = z
  .object({
    customerId: positiveInt,
    bankAccountId: positiveInt,
    iban: optionalString,
    accountNumber: optionalString,
    bankName: optionalString,
    swift: optionalString,
    bankIdentifier: optionalString,
    accountId: optionalPositiveInt,
    ifMainAccount: optionalBoolean,
  })
  .passthrough();

const deleteBankAccountSchema = z.object({
  bankAccountId: positiveInt,
  customerId: positiveInt,
});

const entityBalanceSchema = z.object({
  entityIds: idsQuerySchema,
  sales: optionalBoolean,
});

const projectBalanceSchema = z.object({
  projectIds: idsQuerySchema,
  sales: optionalBoolean,
});

const customerReportSchema = z.object({
  customerId: positiveInt,
  ids: idsQuerySchema.optional(),
  showCustomers: optionalBoolean,
  projectId: optionalString,
  dateFrom: optionalYmd,
  dateTo: optionalYmd,
  useThisCount: optionalPositiveInt,
  getSummary: optionalBoolean,
  doNotUseCurrencies: optionalBoolean,
  getOnlyOpenValues: optionalBoolean,
  start: optionalNonNegativeInt,
  limit: optionalPositiveInt,
});

const deleteCustomersSchema = z.object({
  customerId: positiveInt,
});

const updateAllTaxRateSchema = z.object({
  wrongTaxRateId: positiveInt,
  correctTaxRateId: positiveInt,
});

const customerV2BodySchema = z
  .object({
    name: optionalString,
    code: optionalString,
    registrationCode: optionalString,
    legalAddress: optionalString,
    legalCity: optionalString,
    legalCountryCode: optionalString,
    legalPostcode: optionalString,
    deadlineDays: optionalNumber,
    discount: optionalNumber,
    penalty: optionalNumber,
    referenceNumber: optionalString,
    vatNumber: optionalString,
    actualAddress: optionalString,
    actualPostcode: optionalString,
    actualCountryCode: optionalString,
    email: optionalString,
    phone1: optionalString,
    phone2: optionalString,
    website: optionalString,
    contactPersonName: optionalString,
    contactPersonEmail: optionalString,
    contactPersonPhone: optionalString,
    info: optionalString,
    customer: optionalBoolean,
    supplier: optionalBoolean,
    entityTypeCode: optionalString,
    bankName: optionalString,
    bankAccountNumber: optionalString,
    bankIban: optionalString,
    bankSwift: optionalString,
    bankIdentificator: optionalString,
    customerDebitAccountId: optionalPositiveInt,
    customerCreditAccountId: optionalPositiveInt,
    supplierDebitAccountId: optionalPositiveInt,
    supplierCreditAccountId: optionalPositiveInt,
    prepaymentAccountId: optionalPositiveInt,
    taxRateId: optionalPositiveInt,
    invoiceSendingAddress: optionalString,
    invoiceSendingIdentifier: optionalString,
    birthday: optionalString,
    attributes: z
      .array(z.unknown())
      .nullish()
      .transform((v) => v ?? undefined),
  })
  .passthrough();

const createCustomerV2Schema = customerV2BodySchema.extend({
  name: z.string().min(1),
});

const updateCustomerV2Schema = customerV2BodySchema.extend({
  customerId: positiveInt,
});

const markAnonymousSchema = z.object({
  customerId: positiveInt,
});

const customerV2InputProperties = {
  name: { type: "string", description: "Customer/supplier name" },
  code: { type: "string" },
  registrationCode: { type: "string" },
  legalAddress: { type: "string" },
  legalCity: { type: "string" },
  legalCountryCode: { type: "string" },
  legalPostcode: { type: "string" },
  deadlineDays: { type: "number" },
  discount: { type: "number" },
  penalty: { type: "number" },
  referenceNumber: { type: "string" },
  vatNumber: { type: "string" },
  actualAddress: { type: "string" },
  actualPostcode: { type: "string" },
  actualCountryCode: { type: "string" },
  email: { type: "string" },
  phone1: { type: "string" },
  phone2: { type: "string" },
  website: { type: "string" },
  contactPersonName: { type: "string" },
  contactPersonEmail: { type: "string" },
  contactPersonPhone: { type: "string" },
  info: { type: "string" },
  customer: { type: "boolean" },
  supplier: { type: "boolean" },
  entityTypeCode: {
    type: "string",
    description: "ENTITY_TYPE dictionary code (e.g. ENTITY_TYPE_LEGAL)",
  },
  bankName: { type: "string" },
  bankAccountNumber: { type: "string" },
  bankIban: { type: "string" },
  bankSwift: { type: "string" },
  bankIdentificator: { type: "string" },
  customerDebitAccountId: { type: "number" },
  customerCreditAccountId: { type: "number" },
  supplierDebitAccountId: { type: "number" },
  supplierCreditAccountId: { type: "number" },
  prepaymentAccountId: { type: "number" },
  taxRateId: { type: "number" },
  invoiceSendingAddress: { type: "string" },
  invoiceSendingIdentifier: { type: "string" },
  birthday: { type: "string" },
  attributes: { type: "array", items: {}, description: "Attribute list" },
};

const bankAccountInputProperties = {
  iban: { type: "string", description: "IBAN" },
  accountNumber: { type: "string" },
  bankName: { type: "string" },
  swift: { type: "string", description: "SWIFT code" },
  bankIdentifier: { type: "string", description: "BIC / bank identifier" },
  accountId: { type: "number", description: "Linked chart-of-accounts id" },
  ifMainAccount: { type: "boolean", description: "Mark as the main bank account" },
};

export function createCustomerExtraTools(client: ErplyBooksClient) {
  return {
    erply_list_customer_bank_accounts: {
      description:
        "List bank accounts for a customer (GET /customers/bank_accounts/{customerId}). Requires customerId. Optional start/limit. Returns { totalCount, items }.",
      inputSchema: {
        type: "object" as const,
        properties: {
          customerId: { type: "number", description: "Customer id (required)" },
          start: { type: "number", description: "Offset (default 0)" },
          limit: { type: "number", description: "Page size" },
        },
        required: ["customerId"],
      },
      handler: async (params: unknown) => {
        const { customerId, ...query } = parseToolArgs(listBankAccountsSchema, params);
        const response = await client.get(`/customers/bank_accounts/${customerId}`, query);
        return jsonToolResult(unwrapListEnvelope<CustomerBankAccount>(response));
      },
    },

    erply_get_customer_bank_account: {
      description:
        "Get a single customer bank account (GET /customers/bank_accounts/{bankAccountId}/customerId/{customerId}). Requires bankAccountId and customerId. Live API often returns a stub with id: 0 even when the account exists on the list — prefer erply_list_customer_bank_accounts.",
      inputSchema: {
        type: "object" as const,
        properties: {
          bankAccountId: { type: "number", description: "Bank account id (required)" },
          customerId: { type: "number", description: "Customer id (required)" },
        },
        required: ["bankAccountId", "customerId"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(getBankAccountSchema, params);
        const result = await client.get(
          `/customers/bank_accounts/${args.bankAccountId}/customerId/${args.customerId}`,
        );
        return jsonToolResult(result);
      },
    },

    erply_create_customer_bank_account: {
      description:
        "Create a customer bank account (POST /customers/bank_accounts/{customerId}). Requires customerId. Sends id: 0 and entityId: customerId (needed for the row to persist). Typically include iban or accountNumber. Extra APIBankAccountInfo fields may be passed through.",
      inputSchema: {
        type: "object" as const,
        properties: {
          customerId: { type: "number", description: "Customer id (required)" },
          ...bankAccountInputProperties,
        },
        required: ["customerId"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(createBankAccountSchema, params);
        const { customerId, ...body } = args;
        const created = await client.post<CustomerBankAccount>(
          `/customers/bank_accounts/${customerId}`,
          { entityId: customerId, ...body, id: 0 },
        );
        return mutationToolResult(created);
      },
    },

    erply_update_customer_bank_account: {
      description:
        "Update a customer bank account (PUT /customers/bank_accounts/{customerId}). Requires customerId and bankAccountId. Body id is the bank account id; entityId defaults to customerId. PUT is a full replace — resend iban/accountNumber/bankName or they are cleared. Extra APIBankAccountInfo fields may be passed through.",
      inputSchema: {
        type: "object" as const,
        properties: {
          customerId: { type: "number", description: "Customer id (required)" },
          bankAccountId: { type: "number", description: "Bank account id (required)" },
          ...bankAccountInputProperties,
        },
        required: ["customerId", "bankAccountId"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(updateBankAccountSchema, params);
        const { customerId, bankAccountId, ...body } = args;
        const updated = await client.put<CustomerBankAccount>(
          `/customers/bank_accounts/${customerId}`,
          { entityId: customerId, ...body, id: bankAccountId },
        );
        return mutationToolResult(updated);
      },
    },

    erply_delete_customer_bank_account: {
      description:
        "Delete a customer bank account (DELETE /customers/bank_accounts/{bankAccountId}/customerId/{id}). Requires bankAccountId and customerId. Destructive.",
      inputSchema: {
        type: "object" as const,
        properties: {
          bankAccountId: { type: "number", description: "Bank account id (required)" },
          customerId: { type: "number", description: "Customer id (required)" },
        },
        required: ["bankAccountId", "customerId"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(deleteBankAccountSchema, params);
        const result = await client.delete(
          `/customers/bank_accounts/${args.bankAccountId}/customerId/${args.customerId}`,
        );
        return mutationToolResult(result);
      },
    },

    erply_get_entity_balance: {
      description:
        "Fetch entity/customer balances (GET /customers/entity_balance). Requires entityIds as a comma-separated string or number array. Optional sales (true = sales, false = purchases). Live API returns a JSON array (often empty).",
      inputSchema: {
        type: "object" as const,
        properties: {
          entityIds: {
            description: "Customer/entity ids (comma-separated string or number array, required)",
          },
          sales: { type: "boolean", description: "true = sales balances, false = purchases" },
        },
        required: ["entityIds"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(entityBalanceSchema, params);
        const result = await client.get("/customers/entity_balance", {
          entityIds: toIdsString(args.entityIds),
          sales: args.sales,
        });
        return jsonToolResult(result);
      },
    },

    erply_get_project_balance: {
      description:
        "Fetch project balances (GET /customers/project_balance). Requires projectIds as a comma-separated string or number array. Optional sales (true = sales, false = purchases). Live API returns a JSON array (often empty).",
      inputSchema: {
        type: "object" as const,
        properties: {
          projectIds: {
            description: "Project ids (comma-separated string or number array, required)",
          },
          sales: { type: "boolean", description: "true = sales balances, false = purchases" },
        },
        required: ["projectIds"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(projectBalanceSchema, params);
        const result = await client.get("/customers/project_balance", {
          projectIds: toIdsString(args.projectIds),
          sales: args.sales,
        });
        return jsonToolResult(result);
      },
    },

    erply_get_customer_report: {
      description:
        "Fetch a customer report (GET /customers/report/{customerId}). Requires customerId. Optional ids, showCustomers, projectId, dateFrom/dateTo, useThisCount, getSummary, doNotUseCurrencies, getOnlyOpenValues, start, limit. Live API returns a list envelope { items, totalCount, organisation }.",
      inputSchema: {
        type: "object" as const,
        properties: {
          customerId: { type: "number", description: "Customer id (required)" },
          ids: { description: "Additional ids (comma-separated string or number array)" },
          showCustomers: { type: "boolean" },
          projectId: { type: "string" },
          dateFrom: { type: "string", description: "Start date YYYY-MM-DD" },
          dateTo: { type: "string", description: "End date YYYY-MM-DD" },
          useThisCount: { type: "number" },
          getSummary: { type: "boolean" },
          doNotUseCurrencies: { type: "boolean" },
          getOnlyOpenValues: { type: "boolean" },
          start: { type: "number", description: "Offset (default 0)" },
          limit: { type: "number", description: "Page size" },
        },
        required: ["customerId"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(customerReportSchema, params);
        const { customerId, ids, ...query } = args;
        const result = await client.get(`/customers/report/${customerId}`, {
          ...query,
          ids: ids === undefined ? undefined : toIdsString(ids),
        });
        return jsonToolResult(result);
      },
    },

    erply_delete_customers: {
      description:
        "Delete a customer via POST /customers/delete (alternate to DELETE /customers/{customerId} / erply_delete_customer). Requires customerId, sent as the id query param. Destructive.",
      inputSchema: {
        type: "object" as const,
        properties: {
          customerId: { type: "number", description: "Customer id to delete (required)" },
        },
        required: ["customerId"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(deleteCustomersSchema, params);
        const result = await client.post("/customers/delete", undefined, { id: args.customerId });
        return mutationToolResult(result);
      },
    },

    erply_update_all_customer_tax_rates: {
      description:
        "Replace a tax rate on all customers (POST /customers/update_all_tax_rate). Requires wrongTaxRateId and correctTaxRateId as query params. Destructive bulk update.",
      inputSchema: {
        type: "object" as const,
        properties: {
          wrongTaxRateId: {
            type: "number",
            description: "Tax rate id to replace (required)",
          },
          correctTaxRateId: {
            type: "number",
            description: "Replacement tax rate id (required)",
          },
        },
        required: ["wrongTaxRateId", "correctTaxRateId"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(updateAllTaxRateSchema, params);
        const result = await client.post("/customers/update_all_tax_rate", undefined, args);
        return mutationToolResult(result);
      },
    },

    erply_create_customer_v2: {
      description:
        "Create a customer/supplier via POST /customers/v2 (APICustomerInfoV2). Requires name. Sends id: 0. Extra v2 fields (addresses, bank, account ids, taxRateId, attributes) may be passed through. GET /customers/v2 returns 405 on current tokens; POST /customers/v2 works.",
      inputSchema: {
        type: "object" as const,
        properties: customerV2InputProperties,
        required: ["name"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(createCustomerV2Schema, params);
        const created = await client.post<CustomerV2>("/customers/v2", { ...args, id: 0 });
        return mutationToolResult(created);
      },
    },

    erply_update_customer_v2: {
      description:
        "Update a customer/supplier via PUT /customers/v2/{customerId} (APICustomerInfoV2). Requires customerId. Path id wins over any body id. Extra v2 fields may be passed through. GET /customers/v2 returns 405 on current tokens; PUT /customers/v2/{id} works.",
      inputSchema: {
        type: "object" as const,
        properties: {
          customerId: { type: "number", description: "Customer id (required)" },
          ...customerV2InputProperties,
        },
        required: ["customerId"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(updateCustomerV2Schema, params);
        const { customerId, ...body } = args;
        const updated = await client.put<CustomerV2>(`/customers/v2/${customerId}`, {
          ...body,
          id: customerId,
        });
        return mutationToolResult(updated);
      },
    },

    erply_mark_customer_anonymous: {
      description:
        "Anonymize a customer (PUT /customers/mark_as_anonymous/{customerId}). Requires customerId. Destructive and irreversible (GDPR-style wipe of personal data).",
      inputSchema: {
        type: "object" as const,
        properties: {
          customerId: { type: "number", description: "Customer id to anonymize (required)" },
        },
        required: ["customerId"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(markAnonymousSchema, params);
        const result = await client.put<Customer>(
          `/customers/mark_as_anonymous/${args.customerId}`,
          {
            id: args.customerId,
          },
        );
        return mutationToolResult(result);
      },
    },
  };
}

export const __test__ = { toIdsString };
