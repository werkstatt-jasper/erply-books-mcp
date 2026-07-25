import { z } from "zod";

import type { ErplyBooksClient } from "../client.js";
import type { Customer } from "../types/customers.js";
import {
  optionalBoolean,
  optionalNonNegativeInt,
  optionalPositiveInt,
  optionalString,
  optionalYmd,
  parseToolArgs,
} from "../validation/tool-args.js";
import { jsonToolResult, unwrapListEnvelope } from "./list-response.js";

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
  };
}
