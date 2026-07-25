import { z } from "zod";

import type { ErplyBooksClient } from "../client.js";
import type { Project } from "../types/projects.js";
import {
  optionalBoolean,
  optionalNonNegativeInt,
  optionalPositiveInt,
  optionalString,
  parseToolArgs,
} from "../validation/tool-args.js";
import { jsonToolResult, unwrapListEnvelope } from "./list-response.js";

const listProjectsSchema = z.object({
  keyword: optionalString,
  isAffirmed: optionalBoolean,
  projectGroupId: optionalPositiveInt,
  start: optionalNonNegativeInt,
  limit: optionalPositiveInt,
});

export function createProjectTools(client: ErplyBooksClient) {
  return {
    erply_list_projects: {
      description: "List projects from Erply Books (GET /projects). Returns { totalCount, items }.",
      inputSchema: {
        type: "object" as const,
        properties: {
          keyword: { type: "string", description: "Free-text search" },
          isAffirmed: { type: "boolean", description: "Filter by affirmed status when supported" },
          projectGroupId: { type: "number", description: "Filter by project group id" },
          start: { type: "number", description: "Offset (default 0)" },
          limit: { type: "number", description: "Page size" },
        },
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(listProjectsSchema, params);
        const response = await client.get("/projects", args);
        return jsonToolResult(unwrapListEnvelope<Project>(response));
      },
    },
  };
}
