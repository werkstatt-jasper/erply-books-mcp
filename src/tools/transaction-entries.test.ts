import { beforeEach, describe, expect, it, vi } from "vitest";
import transactionEntriesFixture from "../__fixtures__/transaction-entries.json" with {
  type: "json",
};
import { ErplyBooksApiError } from "../api-error.js";
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

describe("erply_create_transaction_entry", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createTransactionEntryTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createTransactionEntryTools(client);
  });

  it("requires opDate, typeCode, and non-empty accountEntries", async () => {
    await expect(tools.erply_create_transaction_entry.handler({})).rejects.toThrow(
      /opDate|typeCode|accountEntries/,
    );
    await expect(
      tools.erply_create_transaction_entry.handler({
        opDate: "2025-06-15",
        typeCode: "DIRECT_TRANSACTION",
        accountEntries: [],
      }),
    ).rejects.toThrow(/accountEntries/);
  });

  it("requires accountId on each account entry row", async () => {
    await expect(
      tools.erply_create_transaction_entry.handler({
        opDate: "2025-06-15",
        typeCode: "DIRECT_TRANSACTION",
        accountEntries: [{ debitSum: 10 }],
      }),
    ).rejects.toThrow(/accountId/);
  });

  it("POSTs with id: 0", async () => {
    vi.mocked(client.post).mockResolvedValue(transactionEntriesFixture.create_response);
    const result = await tools.erply_create_transaction_entry.handler({
      opDate: "2025-06-15",
      typeCode: "DIRECT_TRANSACTION",
      description: "MCP journal",
      accountEntries: [
        { accountId: 1, debitSum: 10 },
        { accountId: 2, creditSum: 10 },
      ],
    });
    expect(client.post).toHaveBeenCalledWith(
      "/transaction_entries",
      expect.objectContaining({
        id: 0,
        opDate: "2025-06-15",
        typeCode: "DIRECT_TRANSACTION",
        description: "MCP journal",
        accountEntries: [
          expect.objectContaining({ accountId: 1, debitSum: 10 }),
          expect.objectContaining({ accountId: 2, creditSum: 10 }),
        ],
      }),
    );
    expect(JSON.parse(result.content[0].text).id).toBe(201);
  });

  it("propagates API errors", async () => {
    vi.mocked(client.post).mockRejectedValue(
      new ErplyBooksApiError({
        kind: "http",
        message: "MODULE_TRANSACTIONS",
        httpStatus: 409,
        method: "POST",
        url: "https://api.erplybooks.com/api/transaction_entries",
      }),
    );
    await expect(
      tools.erply_create_transaction_entry.handler({
        opDate: "2025-06-15",
        typeCode: "DIRECT_TRANSACTION",
        accountEntries: [{ accountId: 1, debitSum: 1 }],
      }),
    ).rejects.toMatchObject({ httpStatus: 409 });
  });
});

describe("erply_update_transaction_entry", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createTransactionEntryTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createTransactionEntryTools(client);
  });

  it("requires transactionEntryId", async () => {
    await expect(tools.erply_update_transaction_entry.handler({})).rejects.toThrow(
      /transactionEntryId/,
    );
  });

  it("PUTs with path id", async () => {
    vi.mocked(client.put).mockResolvedValue(transactionEntriesFixture.update_response);
    await tools.erply_update_transaction_entry.handler({
      transactionEntryId: 201,
      description: "MCP journal updated",
    });
    expect(client.put).toHaveBeenCalledWith(
      "/transaction_entries/201",
      expect.objectContaining({ id: 201, description: "MCP journal updated" }),
    );
  });
});

describe("erply_delete_transaction_entry", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createTransactionEntryTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createTransactionEntryTools(client);
  });

  it("requires transactionEntryId", async () => {
    await expect(tools.erply_delete_transaction_entry.handler({})).rejects.toThrow(
      /transactionEntryId/,
    );
  });

  it("DELETEs by id", async () => {
    vi.mocked(client.delete).mockResolvedValue(undefined);
    const result = await tools.erply_delete_transaction_entry.handler({
      transactionEntryId: 201,
    });
    expect(client.delete).toHaveBeenCalledWith("/transaction_entries/201");
    expect(JSON.parse(result.content[0].text)).toEqual({ ok: true });
  });
});
