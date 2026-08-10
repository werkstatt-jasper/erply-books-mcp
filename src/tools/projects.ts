import { z } from "zod";

import type { ErplyBooksClient } from "../client.js";
import type { Project } from "../types/projects.js";
import {
  optionalBoolean,
  optionalNonNegativeInt,
  optionalPositiveInt,
  optionalString,
  parseToolArgs,
  positiveInt,
} from "../validation/tool-args.js";
import { jsonToolResult, mutationToolResult, unwrapListEnvelope } from "./list-response.js";

const listProjectsSchema = z.object({
  keyword: optionalString,
  isAffirmed: optionalBoolean,
  projectGroupId: optionalPositiveInt,
  start: optionalNonNegativeInt,
  limit: optionalPositiveInt,
});

const createProjectSchema = z
  .object({
    name: z.string().min(1),
    description: optionalString,
    affirmed: optionalBoolean,
    projectGroupId: optionalPositiveInt,
    validFromDatetime: optionalString,
    validToDatetime: optionalString,
    mainProjectId: optionalPositiveInt,
    partnerProjectId: optionalPositiveInt,
    syncErplyUsers: optionalBoolean,
  })
  .passthrough();

const updateProjectSchema = z
  .object({
    projectId: positiveInt,
    name: optionalString,
    description: optionalString,
    affirmed: optionalBoolean,
    projectGroupId: optionalPositiveInt,
    validFromDatetime: optionalString,
    validToDatetime: optionalString,
    mainProjectId: optionalPositiveInt,
    partnerProjectId: optionalPositiveInt,
    syncErplyUsers: optionalBoolean,
  })
  .passthrough();

const deleteProjectSchema = z.object({
  projectId: positiveInt,
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

    erply_create_project: {
      description:
        "Create a project (POST /projects). Requires name. Sends id: 0. Optional affirmed (API body field), projectGroupId, description, validFromDatetime/validToDatetime, mainProjectId, syncErplyUsers. Extra APIProjectInfo fields may be passed through. Project groups CRUD is not shipped yet.",
      inputSchema: {
        type: "object" as const,
        properties: {
          name: { type: "string", description: "Project name (required)" },
          description: { type: "string" },
          affirmed: { type: "boolean", description: "Whether the project is affirmed" },
          projectGroupId: { type: "number" },
          validFromDatetime: { type: "string" },
          validToDatetime: { type: "string" },
          mainProjectId: { type: "number" },
          partnerProjectId: { type: "number" },
          syncErplyUsers: { type: "boolean" },
        },
        required: ["name"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(createProjectSchema, params);
        const created = await client.post<Project>("/projects", { ...args, id: 0 });
        return mutationToolResult(created);
      },
    },

    erply_update_project: {
      description:
        "Update a project (PUT /projects/{projectId}). Requires projectId. Path id wins over body id. Use affirmed (not isAffirmed) for the body flag.",
      inputSchema: {
        type: "object" as const,
        properties: {
          projectId: { type: "number", description: "Project id (required)" },
          name: { type: "string" },
          description: { type: "string" },
          affirmed: { type: "boolean" },
          projectGroupId: { type: "number" },
          validFromDatetime: { type: "string" },
          validToDatetime: { type: "string" },
          mainProjectId: { type: "number" },
          partnerProjectId: { type: "number" },
          syncErplyUsers: { type: "boolean" },
        },
        required: ["projectId"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(updateProjectSchema, params);
        const { projectId, ...body } = args;
        const updated = await client.put<Project>(`/projects/${projectId}`, {
          ...body,
          id: projectId,
        });
        return mutationToolResult(updated);
      },
    },

    erply_delete_project: {
      description:
        "Delete a project by id (DELETE /projects/{projectId}). Destructive — requires an explicit projectId.",
      inputSchema: {
        type: "object" as const,
        properties: {
          projectId: { type: "number", description: "Project id to delete (required)" },
        },
        required: ["projectId"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(deleteProjectSchema, params);
        const result = await client.delete(`/projects/${args.projectId}`);
        return mutationToolResult(result);
      },
    },
  };
}
