import { beforeEach, describe, expect, it, vi } from "vitest";
import projectsFixture from "../__fixtures__/projects.json" with { type: "json" };
import { ErplyBooksApiError } from "../api-error.js";
import type { ErplyBooksClient } from "../client.js";
import { createProjectTools } from "./projects.js";
import { createMockClient } from "./test-helpers.js";

describe("erply_list_projects", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createProjectTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createProjectTools(client);
  });

  it("passes validated args to GET /projects", async () => {
    vi.mocked(client.get).mockResolvedValue(projectsFixture.list_page);
    const result = await tools.erply_list_projects.handler({
      keyword: "web",
      isAffirmed: true,
      projectGroupId: 2,
      limit: 5,
    });
    expect(client.get).toHaveBeenCalledWith(
      "/projects",
      expect.objectContaining({
        keyword: "web",
        isAffirmed: true,
        projectGroupId: 2,
        limit: 5,
      }),
    );
    expect(JSON.parse(result.content[0].text).items[0].name).toBe("Website rebuild");
  });

  it("unwraps null items as empty list", async () => {
    vi.mocked(client.get).mockResolvedValue(projectsFixture.list_empty);
    const result = await tools.erply_list_projects.handler({});
    const body = JSON.parse(result.content[0].text);
    expect(body.items).toEqual([]);
    expect(body.totalCount).toBe(0);
  });
});

describe("erply_create_project", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createProjectTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createProjectTools(client);
  });

  it("requires name", async () => {
    await expect(tools.erply_create_project.handler({})).rejects.toThrow(/name/);
  });

  it("POSTs with id: 0", async () => {
    vi.mocked(client.post).mockResolvedValue(projectsFixture.create_response);
    const result = await tools.erply_create_project.handler({
      name: "Website rebuild",
      affirmed: true,
      description: "Fixture project",
    });
    expect(client.post).toHaveBeenCalledWith(
      "/projects",
      expect.objectContaining({
        id: 0,
        name: "Website rebuild",
        affirmed: true,
        description: "Fixture project",
      }),
    );
    expect(JSON.parse(result.content[0].text).id).toBe(3);
  });

  it("propagates API errors", async () => {
    vi.mocked(client.post).mockRejectedValue(
      new ErplyBooksApiError({
        kind: "http",
        message: "forbidden",
        httpStatus: 409,
        method: "POST",
        url: "https://api.erplybooks.com/api/projects",
      }),
    );
    await expect(tools.erply_create_project.handler({ name: "X" })).rejects.toMatchObject({
      httpStatus: 409,
    });
  });
});

describe("erply_update_project", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createProjectTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createProjectTools(client);
  });

  it("requires projectId", async () => {
    await expect(tools.erply_update_project.handler({ name: "X" })).rejects.toThrow(/projectId/);
  });

  it("PUTs with path id", async () => {
    vi.mocked(client.put).mockResolvedValue(projectsFixture.update_response);
    await tools.erply_update_project.handler({
      projectId: 3,
      name: "Website rebuild updated",
    });
    expect(client.put).toHaveBeenCalledWith(
      "/projects/3",
      expect.objectContaining({ id: 3, name: "Website rebuild updated" }),
    );
  });
});

describe("erply_delete_project", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createProjectTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createProjectTools(client);
  });

  it("requires projectId", async () => {
    await expect(tools.erply_delete_project.handler({})).rejects.toThrow(/projectId/);
  });

  it("DELETEs by id", async () => {
    vi.mocked(client.delete).mockResolvedValue(undefined);
    const result = await tools.erply_delete_project.handler({ projectId: 3 });
    expect(client.delete).toHaveBeenCalledWith("/projects/3");
    expect(JSON.parse(result.content[0].text)).toEqual({ ok: true });
  });
});
