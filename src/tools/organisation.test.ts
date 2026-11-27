import { beforeEach, describe, expect, it, vi } from "vitest";
import organisationFixture from "../__fixtures__/organisation.json" with { type: "json" };
import type { ErplyBooksClient } from "../client.js";
import { createOrganisationTools } from "./organisation.js";
import { createMockClient } from "./test-helpers.js";

describe("organisation read tools", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createOrganisationTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createOrganisationTools(client);
  });

  it("erply_get_organisation returns the organisation JSON", async () => {
    vi.mocked(client.get).mockResolvedValue(organisationFixture.sample);
    const result = await tools.erply_get_organisation.handler({});
    expect(client.get).toHaveBeenCalledWith("/organisation");
    expect(JSON.parse(result.content[0].text)).toEqual(organisationFixture.sample);
  });

  it("erply_get_organisation propagates API errors", async () => {
    vi.mocked(client.get).mockRejectedValue(new Error("API Error 401: Unauthorized"));
    await expect(tools.erply_get_organisation.handler({})).rejects.toThrow("401");
  });

  it("erply_list_organisations forwards privilege and returns the API body", async () => {
    vi.mocked(client.get).mockResolvedValue(organisationFixture.all);
    const result = await tools.erply_list_organisations.handler({ privilege: "ADMIN" });
    expect(client.get).toHaveBeenCalledWith("/organisation/all", { privilege: "ADMIN" });
    expect(JSON.parse(result.content[0].text)).toEqual(organisationFixture.all);
  });

  it("erply_list_organisations omits privilege when unset", async () => {
    vi.mocked(client.get).mockResolvedValue(organisationFixture.all);
    await tools.erply_list_organisations.handler({});
    expect(client.get).toHaveBeenCalledWith("/organisation/all", { privilege: undefined });
  });

  it("erply_get_goerp_token forwards type", async () => {
    vi.mocked(client.get).mockResolvedValue(organisationFixture.goerp_token);
    const result = await tools.erply_get_goerp_token.handler({ type: "POS" });
    expect(client.get).toHaveBeenCalledWith("/organisation/get_goerp_token", { type: "POS" });
    expect(JSON.parse(result.content[0].text)).toEqual(organisationFixture.goerp_token);
  });

  it("erply_is_key_valid calls the key-health endpoint", async () => {
    vi.mocked(client.get).mockResolvedValue(organisationFixture.is_key_valid);
    const result = await tools.erply_is_key_valid.handler({});
    expect(client.get).toHaveBeenCalledWith("/organisation/is_key_valid");
    expect(JSON.parse(result.content[0].text)).toEqual(organisationFixture.is_key_valid);
  });

  it("erply_is_token_valid calls the token-health endpoint", async () => {
    vi.mocked(client.get).mockResolvedValue(organisationFixture.is_token_valid);
    const result = await tools.erply_is_token_valid.handler({});
    expect(client.get).toHaveBeenCalledWith("/organisation/is_token_valid");
    expect(JSON.parse(result.content[0].text)).toEqual(organisationFixture.is_token_valid);
  });

  it("erply_list_last_history_actions forwards userId", async () => {
    vi.mocked(client.get).mockResolvedValue(organisationFixture.last_history_action);
    const result = await tools.erply_list_last_history_actions.handler({ userId: 42 });
    expect(client.get).toHaveBeenCalledWith("/organisation/last_history_action", { userId: 42 });
    expect(JSON.parse(result.content[0].text)).toEqual(organisationFixture.last_history_action);
  });

  it("erply_list_last_history_actions rejects a non-integer userId", async () => {
    await expect(tools.erply_list_last_history_actions.handler({ userId: 1.5 })).rejects.toThrow(
      /userId/,
    );
  });

  it("erply_list_organisation_terms returns the API body", async () => {
    vi.mocked(client.get).mockResolvedValue(organisationFixture.terms);
    const result = await tools.erply_list_organisation_terms.handler({});
    expect(client.get).toHaveBeenCalledWith("/organisation/terms");
    expect(JSON.parse(result.content[0].text)).toEqual(organisationFixture.terms);
  });

  it("erply_list_organisation_terms propagates API errors", async () => {
    vi.mocked(client.get).mockRejectedValue(new Error("API Error 403: Forbidden"));
    await expect(tools.erply_list_organisation_terms.handler({})).rejects.toThrow("403");
  });
});
