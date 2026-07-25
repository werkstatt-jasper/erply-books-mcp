import { beforeEach, describe, expect, it, vi } from "vitest";
import accountsFixture from "../__fixtures__/accounts.json" with { type: "json" };
import type { ErplyBooksClient } from "../client.js";
import { createAccountTools } from "./accounts.js";
import { createMockClient } from "./test-helpers.js";

describe("erply_list_accounts", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createAccountTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createAccountTools(client);
  });

  it("passes filters and unwraps the list envelope", async () => {
    vi.mocked(client.get).mockResolvedValue(accountsFixture.list_page);
    const result = await tools.erply_list_accounts.handler({
      start: 0,
      limit: 10,
      getEverything: true,
    });
    expect(client.get).toHaveBeenCalledWith(
      "/accounts",
      expect.objectContaining({ start: 0, limit: 10, getEverything: true }),
    );
    const body = JSON.parse(result.content[0].text);
    expect(body).toEqual({ totalCount: 1, items: accountsFixture.list_page.items });
    expect(body).not.toHaveProperty("organisation");
  });

  it("normalizes null items to []", async () => {
    vi.mocked(client.get).mockResolvedValue(accountsFixture.list_empty);
    const result = await tools.erply_list_accounts.handler({});
    expect(JSON.parse(result.content[0].text)).toEqual({ totalCount: 0, items: [] });
  });

  it("rejects invalid dates", async () => {
    await expect(tools.erply_list_accounts.handler({ date: "nope" })).rejects.toThrow(/date/);
  });
});
