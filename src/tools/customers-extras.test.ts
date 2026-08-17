import { beforeEach, describe, expect, it, vi } from "vitest";
import customersFixture from "../__fixtures__/customers.json" with { type: "json" };
import { ErplyBooksApiError } from "../api-error.js";
import type { ErplyBooksClient } from "../client.js";
import { __test__, createCustomerExtraTools } from "./customers-extras.js";
import { createMockClient } from "./test-helpers.js";

describe("toIdsString", () => {
  it("joins number arrays and passes strings through", () => {
    expect(__test__.toIdsString([10, 11])).toBe("10,11");
    expect(__test__.toIdsString("10,11")).toBe("10,11");
  });
});

describe("erply_list_customer_bank_accounts", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createCustomerExtraTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createCustomerExtraTools(client);
  });

  it("requires customerId", async () => {
    await expect(tools.erply_list_customer_bank_accounts.handler({})).rejects.toThrow(/customerId/);
  });

  it("GETs /customers/bank_accounts/{customerId} and unwraps the envelope", async () => {
    vi.mocked(client.get).mockResolvedValue(customersFixture.bank_account_list);
    const result = await tools.erply_list_customer_bank_accounts.handler({
      customerId: 10,
      limit: 5,
    });
    expect(client.get).toHaveBeenCalledWith("/customers/bank_accounts/10", {
      start: undefined,
      limit: 5,
    });
    expect(JSON.parse(result.content[0].text)).toEqual({
      totalCount: 1,
      items: customersFixture.bank_account_list.items,
    });
  });
});

describe("erply_get_customer_bank_account", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createCustomerExtraTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createCustomerExtraTools(client);
  });

  it("requires bankAccountId and customerId", async () => {
    await expect(tools.erply_get_customer_bank_account.handler({})).rejects.toThrow(
      /bankAccountId|customerId/,
    );
  });

  it("GETs the single-account path", async () => {
    vi.mocked(client.get).mockResolvedValue(customersFixture.bank_account_single);
    const result = await tools.erply_get_customer_bank_account.handler({
      bankAccountId: 21,
      customerId: 10,
    });
    expect(client.get).toHaveBeenCalledWith("/customers/bank_accounts/21/customerId/10");
    expect(JSON.parse(result.content[0].text).iban).toBe("EE382200221020145685");
  });
});

describe("erply_create_customer_bank_account", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createCustomerExtraTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createCustomerExtraTools(client);
  });

  it("requires customerId", async () => {
    await expect(tools.erply_create_customer_bank_account.handler({})).rejects.toThrow(
      /customerId/,
    );
  });

  it("POSTs with id: 0", async () => {
    vi.mocked(client.post).mockResolvedValue(customersFixture.bank_account_create);
    const result = await tools.erply_create_customer_bank_account.handler({
      customerId: 10,
      iban: "EE382200221020145685",
      bankName: "Swedbank",
    });
    expect(client.post).toHaveBeenCalledWith(
      "/customers/bank_accounts/10",
      expect.objectContaining({
        id: 0,
        entityId: 10,
        iban: "EE382200221020145685",
        bankName: "Swedbank",
      }),
    );
    expect(JSON.parse(result.content[0].text).id).toBe(21);
  });
});

describe("erply_update_customer_bank_account", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createCustomerExtraTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createCustomerExtraTools(client);
  });

  it("requires customerId and bankAccountId", async () => {
    await expect(
      tools.erply_update_customer_bank_account.handler({ customerId: 10 }),
    ).rejects.toThrow(/bankAccountId/);
  });

  it("PUTs with body id equal to bankAccountId", async () => {
    vi.mocked(client.put).mockResolvedValue(customersFixture.bank_account_single);
    await tools.erply_update_customer_bank_account.handler({
      customerId: 10,
      bankAccountId: 21,
      ifMainAccount: false,
    });
    expect(client.put).toHaveBeenCalledWith(
      "/customers/bank_accounts/10",
      expect.objectContaining({ id: 21, entityId: 10, ifMainAccount: false }),
    );
  });
});

describe("erply_delete_customer_bank_account", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createCustomerExtraTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createCustomerExtraTools(client);
  });

  it("requires both ids", async () => {
    await expect(tools.erply_delete_customer_bank_account.handler({})).rejects.toThrow(
      /bankAccountId|customerId/,
    );
  });

  it("DELETEs and maps 204 to { ok: true }", async () => {
    vi.mocked(client.delete).mockResolvedValue(undefined);
    const result = await tools.erply_delete_customer_bank_account.handler({
      bankAccountId: 21,
      customerId: 10,
    });
    expect(client.delete).toHaveBeenCalledWith("/customers/bank_accounts/21/customerId/10");
    expect(JSON.parse(result.content[0].text)).toEqual({ ok: true });
  });
});

describe("erply_get_entity_balance", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createCustomerExtraTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createCustomerExtraTools(client);
  });

  it("requires entityIds", async () => {
    await expect(tools.erply_get_entity_balance.handler({})).rejects.toThrow(/entityIds/);
  });

  it("joins number arrays into the query string", async () => {
    vi.mocked(client.get).mockResolvedValue(customersFixture.entity_balance);
    const result = await tools.erply_get_entity_balance.handler({
      entityIds: [10, 11],
      sales: true,
    });
    expect(client.get).toHaveBeenCalledWith("/customers/entity_balance", {
      entityIds: "10,11",
      sales: true,
    });
    expect(JSON.parse(result.content[0].text).balance).toBe(1250.5);
  });

  it("passes a comma-separated string through", async () => {
    vi.mocked(client.get).mockResolvedValue(customersFixture.entity_balance);
    await tools.erply_get_entity_balance.handler({ entityIds: "10,11" });
    expect(client.get).toHaveBeenCalledWith("/customers/entity_balance", {
      entityIds: "10,11",
      sales: undefined,
    });
  });
});

describe("erply_get_project_balance", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createCustomerExtraTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createCustomerExtraTools(client);
  });

  it("requires projectIds", async () => {
    await expect(tools.erply_get_project_balance.handler({})).rejects.toThrow(/projectIds/);
  });

  it("GETs /customers/project_balance", async () => {
    vi.mocked(client.get).mockResolvedValue(customersFixture.project_balance);
    const result = await tools.erply_get_project_balance.handler({
      projectIds: [3],
      sales: false,
    });
    expect(client.get).toHaveBeenCalledWith("/customers/project_balance", {
      projectIds: "3",
      sales: false,
    });
    expect(JSON.parse(result.content[0].text).balance).toBe(80);
  });
});

describe("erply_get_customer_report", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createCustomerExtraTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createCustomerExtraTools(client);
  });

  it("requires customerId", async () => {
    await expect(tools.erply_get_customer_report.handler({})).rejects.toThrow(/customerId/);
  });

  it("GETs /customers/report/{customerId} with optional filters", async () => {
    vi.mocked(client.get).mockResolvedValue(customersFixture.customer_report);
    const result = await tools.erply_get_customer_report.handler({
      customerId: 10,
      ids: [55, 56],
      dateFrom: "2026-01-01",
      dateTo: "2026-12-31",
      getOnlyOpenValues: true,
    });
    expect(client.get).toHaveBeenCalledWith(
      "/customers/report/10",
      expect.objectContaining({
        ids: "55,56",
        dateFrom: "2026-01-01",
        dateTo: "2026-12-31",
        getOnlyOpenValues: true,
      }),
    );
    expect(JSON.parse(result.content[0].text).openAmount).toBe(199.99);
  });

  it("omits ids when not provided", async () => {
    vi.mocked(client.get).mockResolvedValue(customersFixture.customer_report);
    await tools.erply_get_customer_report.handler({ customerId: 10 });
    expect(client.get).toHaveBeenCalledWith(
      "/customers/report/10",
      expect.objectContaining({ ids: undefined }),
    );
  });
});

describe("erply_delete_customers", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createCustomerExtraTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createCustomerExtraTools(client);
  });

  it("requires customerId", async () => {
    await expect(tools.erply_delete_customers.handler({})).rejects.toThrow(/customerId/);
  });

  it("POSTs /customers/delete with id query", async () => {
    vi.mocked(client.post).mockResolvedValue(undefined);
    const result = await tools.erply_delete_customers.handler({ customerId: 10 });
    expect(client.post).toHaveBeenCalledWith("/customers/delete", undefined, { id: 10 });
    expect(JSON.parse(result.content[0].text)).toEqual({ ok: true });
  });
});

describe("erply_update_all_customer_tax_rates", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createCustomerExtraTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createCustomerExtraTools(client);
  });

  it("requires both tax rate ids", async () => {
    await expect(tools.erply_update_all_customer_tax_rates.handler({})).rejects.toThrow(
      /wrongTaxRateId|correctTaxRateId/,
    );
  });

  it("POSTs query params", async () => {
    vi.mocked(client.post).mockResolvedValue(customersFixture.update_all_tax_rate);
    const result = await tools.erply_update_all_customer_tax_rates.handler({
      wrongTaxRateId: 1,
      correctTaxRateId: 2,
    });
    expect(client.post).toHaveBeenCalledWith("/customers/update_all_tax_rate", undefined, {
      wrongTaxRateId: 1,
      correctTaxRateId: 2,
    });
    expect(JSON.parse(result.content[0].text).ok).toBe(true);
  });
});

describe("erply_create_customer_v2", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createCustomerExtraTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createCustomerExtraTools(client);
  });

  it("requires name", async () => {
    await expect(tools.erply_create_customer_v2.handler({})).rejects.toThrow(/name/);
  });

  it("POSTs /customers/v2 with id: 0 and extra fields", async () => {
    vi.mocked(client.post).mockResolvedValue(customersFixture.customer_v2);
    const result = await tools.erply_create_customer_v2.handler({
      name: "Acme OÜ",
      email: "a@example.com",
      taxRateId: 1,
    });
    expect(client.post).toHaveBeenCalledWith(
      "/customers/v2",
      expect.objectContaining({ id: 0, name: "Acme OÜ", email: "a@example.com", taxRateId: 1 }),
    );
    expect(JSON.parse(result.content[0].text).id).toBe(10);
  });

  it("propagates ErplyBooksApiError", async () => {
    vi.mocked(client.post).mockRejectedValue(
      new ErplyBooksApiError({
        kind: "http",
        message: "method not allowed",
        httpStatus: 405,
        method: "POST",
        url: "https://api.erplybooks.com/api/customers/v2",
      }),
    );
    await expect(tools.erply_create_customer_v2.handler({ name: "X" })).rejects.toMatchObject({
      httpStatus: 405,
    });
  });
});

describe("erply_update_customer_v2", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createCustomerExtraTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createCustomerExtraTools(client);
  });

  it("requires customerId", async () => {
    await expect(tools.erply_update_customer_v2.handler({ name: "X" })).rejects.toThrow(
      /customerId/,
    );
  });

  it("PUTs with path id winning", async () => {
    vi.mocked(client.put).mockResolvedValue(customersFixture.customer_v2);
    await tools.erply_update_customer_v2.handler({
      customerId: 10,
      name: "Acme OÜ",
      taxRateId: 1,
    });
    expect(client.put).toHaveBeenCalledWith(
      "/customers/v2/10",
      expect.objectContaining({ id: 10, name: "Acme OÜ", taxRateId: 1 }),
    );
  });
});

describe("erply_mark_customer_anonymous", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createCustomerExtraTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createCustomerExtraTools(client);
  });

  it("requires customerId", async () => {
    await expect(tools.erply_mark_customer_anonymous.handler({})).rejects.toThrow(/customerId/);
  });

  it("PUTs /customers/mark_as_anonymous/{customerId}", async () => {
    vi.mocked(client.put).mockResolvedValue(customersFixture.anonymous_response);
    const result = await tools.erply_mark_customer_anonymous.handler({ customerId: 10 });
    expect(client.put).toHaveBeenCalledWith("/customers/mark_as_anonymous/10", { id: 10 });
    expect(JSON.parse(result.content[0].text).name).toBe("Anonymous");
  });
});
