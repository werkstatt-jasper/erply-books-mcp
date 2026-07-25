import { z } from "zod";

import type { ErplyBooksClient } from "../client.js";
import type { Organisation } from "../types/organisation.js";
import { parseToolArgs } from "../validation/tool-args.js";
import { jsonToolResult } from "./list-response.js";

const emptyToolArgs = z.object({});

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
  };
}
