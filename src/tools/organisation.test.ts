import { beforeEach, describe, expect, it, vi } from "vitest";
import organisationFixture from "../__fixtures__/organisation.json" with { type: "json" };
import type { ErplyBooksClient } from "../client.js";
import { createOrganisationTools } from "./organisation.js";
import { createMockClient } from "./test-helpers.js";

describe("erply_get_organisation", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createOrganisationTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createOrganisationTools(client);
  });

  it("returns the organisation JSON", async () => {
    vi.mocked(client.get).mockResolvedValue(organisationFixture.sample);
    const result = await tools.erply_get_organisation.handler({});
    expect(client.get).toHaveBeenCalledWith("/organisation");
    expect(JSON.parse(result.content[0].text)).toEqual(organisationFixture.sample);
  });

  it("propagates API errors", async () => {
    vi.mocked(client.get).mockRejectedValue(new Error("API Error 401: Unauthorized"));
    await expect(tools.erply_get_organisation.handler({})).rejects.toThrow("401");
  });
});
