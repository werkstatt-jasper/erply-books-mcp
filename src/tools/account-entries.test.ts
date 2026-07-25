import { beforeEach, describe, expect, it, vi } from "vitest";
import accountEntriesFixture from "../__fixtures__/account-entries.json" with { type: "json" };
import type { ErplyBooksClient } from "../client.js";
import { createAccountEntryTools } from "./account-entries.js";
import { createMockClient } from "./test-helpers.js";

describe("erply_list_account_entries", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createAccountEntryTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createAccountEntryTools(client);
  });

  it("requires dateFrom and dateTo", async () => {
    await expect(tools.erply_list_account_entries.handler({})).rejects.toThrow(/dateFrom|dateTo/);
  });

  it("passes validated args to GET /account_entries", async () => {
    vi.mocked(client.get).mockResolvedValue(accountEntriesFixture.list_page);
    const result = await tools.erply_list_account_entries.handler({
      dateFrom: "2025-01-01",
      dateTo: "2025-12-31",
      accountId: 1,
      customerId: 10,
    });
    expect(client.get).toHaveBeenCalledWith(
      "/account_entries",
      expect.objectContaining({
        dateFrom: "2025-01-01",
        dateTo: "2025-12-31",
        accountId: 1,
        customerId: 10,
      }),
    );
    expect(JSON.parse(result.content[0].text).totalCount).toBe(1);
  });
});
