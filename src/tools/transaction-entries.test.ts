import { beforeEach, describe, expect, it, vi } from "vitest";
import transactionEntriesFixture from "../__fixtures__/transaction-entries.json" with {
  type: "json",
};
import type { ErplyBooksClient } from "../client.js";
import { createMockClient } from "./test-helpers.js";
import { createTransactionEntryTools } from "./transaction-entries.js";

describe("erply_list_transaction_entries", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createTransactionEntryTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createTransactionEntryTools(client);
  });

  it("requires dateFrom and dateTo", async () => {
    await expect(tools.erply_list_transaction_entries.handler({})).rejects.toThrow(
      /dateFrom|dateTo/,
    );
  });

  it("passes validated args to GET /transaction_entries", async () => {
    vi.mocked(client.get).mockResolvedValue(transactionEntriesFixture.list_page);
    const result = await tools.erply_list_transaction_entries.handler({
      dateFrom: "2025-01-01",
      dateTo: "2025-12-31",
      typeCode: "INVOICE_TRANSACTION",
      projectId: 3,
    });
    expect(client.get).toHaveBeenCalledWith(
      "/transaction_entries",
      expect.objectContaining({
        dateFrom: "2025-01-01",
        dateTo: "2025-12-31",
        typeCode: "INVOICE_TRANSACTION",
        projectId: 3,
      }),
    );
    expect(JSON.parse(result.content[0].text).items).toHaveLength(1);
  });
});

describe("erply_get_transaction_entry", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createTransactionEntryTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createTransactionEntryTools(client);
  });

  it("requires transactionEntryId", async () => {
    await expect(tools.erply_get_transaction_entry.handler({})).rejects.toThrow(
      /transactionEntryId/,
    );
  });

  it("GETs /transaction_entries/{id}", async () => {
    vi.mocked(client.get).mockResolvedValue(transactionEntriesFixture.single);
    const result = await tools.erply_get_transaction_entry.handler({
      transactionEntryId: 200,
      lang: "en",
    });
    expect(client.get).toHaveBeenCalledWith("/transaction_entries/200", { lang: "en" });
    expect(JSON.parse(result.content[0].text).id).toBe(200);
  });
});
