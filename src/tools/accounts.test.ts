import { beforeEach, describe, expect, it, vi } from "vitest";
import accountsFixture from "../__fixtures__/accounts.json" with { type: "json" };
import { ErplyBooksApiError } from "../api-error.js";
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

describe("erply_create_account", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createAccountTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createAccountTools(client);
  });

  it("requires number and name", async () => {
    await expect(tools.erply_create_account.handler({})).rejects.toThrow(/number|name/);
    await expect(tools.erply_create_account.handler({ number: "1000" })).rejects.toThrow(/name/);
  });

  it("POSTs with id: 0", async () => {
    vi.mocked(client.post).mockResolvedValue(accountsFixture.create_response);
    const result = await tools.erply_create_account.handler({
      number: "1000",
      name: "Cash",
      typeCode: "ACCOUNT_TYPE_ASSETS",
    });
    expect(client.post).toHaveBeenCalledWith(
      "/accounts",
      expect.objectContaining({ id: 0, number: "1000", name: "Cash" }),
    );
    expect(JSON.parse(result.content[0].text).id).toBe(1);
  });

  it("propagates API errors", async () => {
    vi.mocked(client.post).mockRejectedValue(
      new ErplyBooksApiError({
        kind: "http",
        message: "forbidden",
        httpStatus: 409,
        method: "POST",
        url: "https://api.erplybooks.com/api/accounts",
      }),
    );
    await expect(
      tools.erply_create_account.handler({ number: "1000", name: "Cash" }),
    ).rejects.toMatchObject({ httpStatus: 409 });
  });
});

describe("erply_update_account", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createAccountTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createAccountTools(client);
  });

  it("requires accountId", async () => {
    await expect(tools.erply_update_account.handler({ name: "X" })).rejects.toThrow(/accountId/);
  });

  it("PUTs with path id", async () => {
    vi.mocked(client.put).mockResolvedValue(accountsFixture.update_response);
    await tools.erply_update_account.handler({ accountId: 1, name: "Cash updated" });
    expect(client.put).toHaveBeenCalledWith(
      "/accounts/1",
      expect.objectContaining({ id: 1, name: "Cash updated" }),
    );
  });
});

describe("erply_delete_account", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createAccountTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createAccountTools(client);
  });

  it("requires accountId", async () => {
    await expect(tools.erply_delete_account.handler({})).rejects.toThrow(/accountId/);
  });

  it("DELETEs by id", async () => {
    vi.mocked(client.delete).mockResolvedValue(undefined);
    const result = await tools.erply_delete_account.handler({ accountId: 1 });
    expect(client.delete).toHaveBeenCalledWith("/accounts/1");
    expect(JSON.parse(result.content[0].text)).toEqual({ ok: true });
  });
});
