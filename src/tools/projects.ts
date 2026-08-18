import { z } from "zod";

import type { ErplyBooksClient } from "../client.js";
import type { Project, ProjectGroup } from "../types/projects.js";
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

const listProjectGroupsSchema = z.object({
  start: optionalNonNegativeInt,
  limit: optionalPositiveInt,
});

const createProjectGroupSchema = z
  .object({
    name: z.string().min(1),
    organisationId: optionalPositiveInt,
  })
  .passthrough();

const updateProjectGroupSchema = z
  .object({
    projectId: positiveInt,
    name: optionalString,
    organisationId: optionalPositiveInt,
  })
  .passthrough();

const deleteProjectGroupSchema = z.object({
  projectId: positiveInt,
});

const deleteProjectViaPostSchema = z.object({
  id: positiveInt,
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
        "Create a project (POST /projects). Requires name. Sends id: 0. Optional affirmed (API body field), projectGroupId, description, validFromDatetime/validToDatetime, mainProjectId, syncErplyUsers. Extra APIProjectInfo fields may be passed through.",
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

    erply_list_project_groups: {
      description:
        "List project groups (GET /projects/groups). Optional start, limit. Returns { totalCount, items } when available.",
      inputSchema: {
        type: "object" as const,
        properties: {
          start: { type: "number", description: "Offset (default 0)" },
          limit: { type: "number", description: "Page size" },
        },
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(listProjectGroupsSchema, params);
        const response = await client.get("/projects/groups", args);
        return jsonToolResult(unwrapListEnvelope<ProjectGroup>(response));
      },
    },

    erply_create_project_group: {
      description:
        "Create a project group (POST /projects/groups). Requires name. Sends id: 0. Optional organisationId. Extra APIProjectGroupInfo fields may be passed through.",
      inputSchema: {
        type: "object" as const,
        properties: {
          name: { type: "string", description: "Project group name (required)" },
          organisationId: { type: "number" },
        },
        required: ["name"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(createProjectGroupSchema, params);
        const created = await client.post<ProjectGroup>("/projects/groups", { ...args, id: 0 });
        return mutationToolResult(created);
      },
    },

    erply_update_project_group: {
      description:
        "Update a project group (PUT /projects/groups/{projectId}). Requires projectId (the group id — the spec names the path param projectId). Path id wins over any body id. Extra APIProjectGroupInfo fields may be passed through.",
      inputSchema: {
        type: "object" as const,
        properties: {
          projectId: { type: "number", description: "Project group id (required)" },
          name: { type: "string" },
          organisationId: { type: "number" },
        },
        required: ["projectId"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(updateProjectGroupSchema, params);
        const { projectId, ...body } = args;
        const updated = await client.put<ProjectGroup>(`/projects/groups/${projectId}`, {
          ...body,
          id: projectId,
        });
        return mutationToolResult(updated);
      },
    },

    erply_delete_project_group: {
      description:
        "Delete a project group (DELETE /projects/groups/{projectId}). Requires projectId (the group id). Destructive.",
      inputSchema: {
        type: "object" as const,
        properties: {
          projectId: { type: "number", description: "Project group id to delete (required)" },
        },
        required: ["projectId"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(deleteProjectGroupSchema, params);
        const result = await client.delete(`/projects/groups/${args.projectId}`);
        return mutationToolResult(result);
      },
    },

    erply_delete_project_via_post: {
      description:
        "Delete a project via POST /projects/delete (GoERP alias of erply_delete_project). Requires id as a query param. Destructive.",
      inputSchema: {
        type: "object" as const,
        properties: {
          id: { type: "number", description: "Project id to delete (required)" },
        },
        required: ["id"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(deleteProjectViaPostSchema, params);
        const result = await client.post("/projects/delete", undefined, { id: args.id });
        return mutationToolResult(result);
      },
    },
  };
}
