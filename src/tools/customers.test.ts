import { beforeEach, describe, expect, it, vi } from "vitest";
import customersFixture from "../__fixtures__/customers.json" with { type: "json" };
import { ErplyBooksApiError } from "../api-error.js";
import type { ErplyBooksClient } from "../client.js";
import { createCustomerTools } from "./customers.js";
import { createMockClient } from "./test-helpers.js";

describe("erply_list_customers", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createCustomerTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createCustomerTools(client);
  });

  it("calls GET /customers and unwraps the envelope", async () => {
    vi.mocked(client.get).mockResolvedValue(customersFixture.list_page);
    const result = await tools.erply_list_customers.handler({ keyword: "Acme", limit: 5 });
    expect(client.get).toHaveBeenCalledWith(
      "/customers",
      expect.objectContaining({ keyword: "Acme", limit: 5 }),
    );
    expect(JSON.parse(result.content[0].text)).toEqual({
      totalCount: 1,
      items: customersFixture.list_page.items,
    });
  });

  it("propagates API errors", async () => {
    vi.mocked(client.get).mockRejectedValue(new Error("network"));
    await expect(tools.erply_list_customers.handler({})).rejects.toThrow("network");
  });
});

describe("erply_create_customer", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createCustomerTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createCustomerTools(client);
  });

  it("requires name", async () => {
    await expect(tools.erply_create_customer.handler({})).rejects.toThrow(/name/);
  });

  it("POSTs with id: 0", async () => {
    vi.mocked(client.post).mockResolvedValue(customersFixture.create_response);
    const result = await tools.erply_create_customer.handler({
      name: "Acme OÜ",
      email: "a@example.com",
    });
    expect(client.post).toHaveBeenCalledWith(
      "/customers",
      expect.objectContaining({ id: 0, name: "Acme OÜ", email: "a@example.com" }),
    );
    expect(JSON.parse(result.content[0].text).id).toBe(10);
  });

  it("propagates ErplyBooksApiError", async () => {
    vi.mocked(client.post).mockRejectedValue(
      new ErplyBooksApiError({
        kind: "http",
        message: "conflict",
        httpStatus: 409,
        method: "POST",
        url: "https://api.erplybooks.com/api/customers",
      }),
    );
    await expect(tools.erply_create_customer.handler({ name: "X" })).rejects.toMatchObject({
      httpStatus: 409,
    });
  });
});

describe("erply_update_customer", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createCustomerTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createCustomerTools(client);
  });

  it("requires customerId", async () => {
    await expect(tools.erply_update_customer.handler({ name: "X" })).rejects.toThrow(/customerId/);
  });

  it("PUTs with path id winning", async () => {
    vi.mocked(client.put).mockResolvedValue(customersFixture.update_response);
    const result = await tools.erply_update_customer.handler({
      customerId: 10,
      name: "Acme Updated",
    });
    expect(client.put).toHaveBeenCalledWith(
      "/customers/10",
      expect.objectContaining({ id: 10, name: "Acme Updated" }),
    );
    expect(JSON.parse(result.content[0].text).name).toBe("Acme Updated");
  });
});

describe("erply_delete_customer", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createCustomerTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createCustomerTools(client);
  });

  it("requires customerId", async () => {
    await expect(tools.erply_delete_customer.handler({})).rejects.toThrow(/customerId/);
  });

  it("DELETEs and maps 204 to { ok: true }", async () => {
    vi.mocked(client.delete).mockResolvedValue(undefined);
    const result = await tools.erply_delete_customer.handler({ customerId: 10 });
    expect(client.delete).toHaveBeenCalledWith("/customers/10");
    expect(JSON.parse(result.content[0].text)).toEqual({ ok: true });
  });
});
