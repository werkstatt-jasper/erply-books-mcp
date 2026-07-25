import { z } from "zod";

import type { ErplyBooksClient } from "../client.js";
import type { Customer } from "../types/customers.js";
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

const listCustomersSchema = z.object({
  keyword: optionalString,
  code: optionalString,
  id: optionalPositiveInt,
  noSuppliers: optionalBoolean,
  noCustomers: optionalBoolean,
  includeEmployees: optionalBoolean,
  changedSinceDate: optionalYmd,
  sort: optionalString,
  start: optionalNonNegativeInt,
  limit: optionalPositiveInt,
});

const createCustomerSchema = z
  .object({
    name: z.string().min(1),
    code: optionalString,
    registrationCode: optionalString,
    email: optionalString,
    phone1: optionalString,
    legalAddress: optionalString,
    vatNumber: optionalString,
    customer: optionalBoolean,
    supplier: optionalBoolean,
    entityTypeCode: optionalString,
  })
  .passthrough();

const updateCustomerSchema = z
  .object({
    customerId: positiveInt,
    name: optionalString,
    code: optionalString,
    registrationCode: optionalString,
    email: optionalString,
    phone1: optionalString,
    legalAddress: optionalString,
    vatNumber: optionalString,
    customer: optionalBoolean,
    supplier: optionalBoolean,
    entityTypeCode: optionalString,
    deadlineDays: optionalNumber,
  })
  .passthrough();

const deleteCustomerSchema = z.object({
  customerId: positiveInt,
});

export function createCustomerTools(client: ErplyBooksClient) {
  return {
    erply_list_customers: {
      description:
        "List customers (and optionally suppliers/employees) from Erply Books via GET /customers. Note: GET /customers/v2 returns 405 on current API tokens — this tool uses /customers. Returns { totalCount, items }.",
      inputSchema: {
        type: "object" as const,
        properties: {
          keyword: { type: "string", description: "Free-text search" },
          code: { type: "string", description: "Customer/supplier code" },
          id: { type: "number", description: "Single customer id" },
          noSuppliers: { type: "boolean", description: "Exclude suppliers" },
          noCustomers: { type: "boolean", description: "Exclude customers (suppliers only)" },
          includeEmployees: { type: "boolean", description: "Include employees" },
          changedSinceDate: {
            type: "string",
            description: "Only rows changed on/after this date (YYYY-MM-DD)",
          },
          sort: { type: "string", description: "Sort expression as supported by the API" },
          start: { type: "number", description: "Offset (default 0)" },
          limit: { type: "number", description: "Page size" },
        },
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(listCustomersSchema, params);
        const response = await client.get("/customers", args);
        return jsonToolResult(unwrapListEnvelope<Customer>(response));
      },
    },

    erply_create_customer: {
      description:
        "Create a customer/supplier in Erply Books (POST /customers). Requires name. Sends id: 0 as required by the API. Additional APICustomerInfo fields may be passed through. Returns the created customer JSON.",
      inputSchema: {
        type: "object" as const,
        properties: {
          name: { type: "string", description: "Customer/supplier name (required)" },
          code: { type: "string", description: "Customer code" },
          registrationCode: { type: "string", description: "Company registration code" },
          email: { type: "string" },
          phone1: { type: "string" },
          legalAddress: { type: "string" },
          vatNumber: { type: "string" },
          customer: { type: "boolean", description: "Mark as customer" },
          supplier: { type: "boolean", description: "Mark as supplier" },
          entityTypeCode: {
            type: "string",
            description: "ENTITY_TYPE dictionary code (e.g. ENTITY_TYPE_LEGAL)",
          },
        },
        required: ["name"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(createCustomerSchema, params);
        const created = await client.post<Customer>("/customers", { ...args, id: 0 });
        return mutationToolResult(created);
      },
    },

    erply_update_customer: {
      description:
        "Update a customer/supplier (PUT /customers/{customerId}). Requires customerId. Path id wins over any body id. Extra APICustomerInfo fields may be passed through.",
      inputSchema: {
        type: "object" as const,
        properties: {
          customerId: { type: "number", description: "Customer id (required)" },
          name: { type: "string" },
          code: { type: "string" },
          registrationCode: { type: "string" },
          email: { type: "string" },
          phone1: { type: "string" },
          legalAddress: { type: "string" },
          vatNumber: { type: "string" },
          customer: { type: "boolean" },
          supplier: { type: "boolean" },
          entityTypeCode: { type: "string" },
          deadlineDays: { type: "number" },
        },
        required: ["customerId"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(updateCustomerSchema, params);
        const { customerId, ...body } = args;
        const updated = await client.put<Customer>(`/customers/${customerId}`, {
          ...body,
          id: customerId,
        });
        return mutationToolResult(updated);
      },
    },

    erply_delete_customer: {
      description:
        "Delete a customer/supplier by id (DELETE /customers/{customerId}). Destructive — requires an explicit customerId.",
      inputSchema: {
        type: "object" as const,
        properties: {
          customerId: { type: "number", description: "Customer id to delete (required)" },
        },
        required: ["customerId"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(deleteCustomerSchema, params);
        const result = await client.delete(`/customers/${args.customerId}`);
        return mutationToolResult(result);
      },
    },
  };
}
