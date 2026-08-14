import { beforeEach, describe, expect, it, vi } from "vitest";
import paymentsFixture from "../__fixtures__/payments.json" with { type: "json" };
import { ErplyBooksApiError } from "../api-error.js";
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

  it("points unmatched bank-import rows at erply_list_pending_payments", () => {
    expect(tools.erply_list_payments.description).toMatch(/Does not include unmatched bank-import/);
    expect(tools.erply_list_payments.description).toMatch(/erply_list_pending_payments/);
    expect(tools.erply_list_payments.description).toMatch(/paymentType/);
    expect(tools.erply_list_payments.description).toMatch(/small default set/);
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

describe("erply_create_payment", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createPaymentTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createPaymentTools(client);
  });

  it("requires opDate and sumPaid", async () => {
    await expect(tools.erply_create_payment.handler({})).rejects.toThrow(/opDate|sumPaid/);
  });

  it("POSTs with id: 0", async () => {
    vi.mocked(client.post).mockResolvedValue(paymentsFixture.create_response);
    const result = await tools.erply_create_payment.handler({
      opDate: "2025-06-02",
      sumPaid: 12.5,
      customerId: 10,
    });
    expect(client.post).toHaveBeenCalledWith(
      "/payments",
      expect.objectContaining({ id: 0, opDate: "2025-06-02", sumPaid: 12.5, customerId: 10 }),
    );
    expect(JSON.parse(result.content[0].text).id).toBe(77);
  });

  it("propagates API errors", async () => {
    vi.mocked(client.post).mockRejectedValue(
      new ErplyBooksApiError({
        kind: "http",
        message: "plan",
        httpStatus: 409,
        method: "POST",
        url: "https://api.erplybooks.com/api/payments",
      }),
    );
    await expect(
      tools.erply_create_payment.handler({ opDate: "2025-06-02", sumPaid: 1 }),
    ).rejects.toMatchObject({ httpStatus: 409 });
  });
});

describe("erply_update_payment", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createPaymentTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createPaymentTools(client);
  });

  it("requires paymentId", async () => {
    await expect(tools.erply_update_payment.handler({})).rejects.toThrow(/paymentId/);
  });

  it("PUTs with path id", async () => {
    vi.mocked(client.put).mockResolvedValue(paymentsFixture.update_response);
    await tools.erply_update_payment.handler({ paymentId: 77, sumPaid: 15 });
    expect(client.put).toHaveBeenCalledWith(
      "/payments/77",
      expect.objectContaining({ id: 77, sumPaid: 15 }),
    );
  });
});

describe("erply_delete_payment", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createPaymentTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createPaymentTools(client);
  });

  it("requires paymentId", async () => {
    await expect(tools.erply_delete_payment.handler({})).rejects.toThrow(/paymentId/);
  });

  it("DELETEs by id", async () => {
    vi.mocked(client.delete).mockResolvedValue(undefined);
    const result = await tools.erply_delete_payment.handler({ paymentId: 77 });
    expect(client.delete).toHaveBeenCalledWith("/payments/77");
    expect(JSON.parse(result.content[0].text)).toEqual({ ok: true });
  });
});
