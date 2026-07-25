import { beforeEach, describe, expect, it, vi } from "vitest";
import projectsFixture from "../__fixtures__/projects.json" with { type: "json" };
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
