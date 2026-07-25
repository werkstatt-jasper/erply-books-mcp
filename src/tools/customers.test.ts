import { beforeEach, describe, expect, it, vi } from "vitest";
import customersFixture from "../__fixtures__/customers.json" with { type: "json" };
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
