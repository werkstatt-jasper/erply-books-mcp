import { beforeEach, describe, expect, it, vi } from "vitest";
import paymentsFixture from "../__fixtures__/payments.json" with { type: "json" };
import type { ErplyBooksClient } from "../client.js";
import { createPaymentTools } from "./payments.js";
import { createMockClient } from "./test-helpers.js";

describe("erply_list_payments", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createPaymentTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createPaymentTools(client);
  });

  it("requires dateFrom and dateTo", async () => {
    await expect(tools.erply_list_payments.handler({})).rejects.toThrow(/dateFrom|dateTo/);
  });

  it("passes validated args to GET /payments", async () => {
    vi.mocked(client.get).mockResolvedValue(paymentsFixture.list_page);
    const result = await tools.erply_list_payments.handler({
      dateFrom: "2025-01-01",
      dateTo: "2025-12-31",
      isIncome: true,
    });
    expect(client.get).toHaveBeenCalledWith(
      "/payments",
      expect.objectContaining({
        dateFrom: "2025-01-01",
        dateTo: "2025-12-31",
        isIncome: true,
      }),
    );
    expect(JSON.parse(result.content[0].text).totalCount).toBe(1);
  });
});
