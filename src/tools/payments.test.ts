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
    expect(tools.erply_list_payments.description).toMatch(/paymentType is required/);
    expect(tools.erply_list_payments.description).toMatch(/date-only call is rejected/);
    expect(tools.erply_list_payments.description).toMatch(/incomplete default subset/);
    expect(tools.erply_list_payments.description).toMatch(
      /getEverything is not documented as a complete multi-type list/,
    );
    expect(tools.erply_list_payments.description).toMatch(/items\.length below totalCount/);
    expect(tools.erply_list_payments.inputSchema.required).toEqual([
      "dateFrom",
      "dateTo",
      "paymentType",
    ]);
  });

  it("requires dateFrom and dateTo", async () => {
    await expect(tools.erply_list_payments.handler({})).rejects.toThrow(/dateFrom|dateTo/);
    expect(client.get).not.toHaveBeenCalled();
  });

  it("rejects a date-only call instead of returning a list that looks complete", async () => {
    vi.mocked(client.get).mockResolvedValue(paymentsFixture.date_only_looking_complete);
    await expect(
      tools.erply_list_payments.handler({
        dateFrom: "2025-01-01",
        dateTo: "2025-12-31",
      }),
    ).rejects.toThrow(/paymentType is required/);
    await expect(
      tools.erply_list_payments.handler({
        dateFrom: "2025-01-01",
        dateTo: "2025-12-31",
      }),
    ).rejects.toThrow(/incomplete default subset/);
    expect(client.get).not.toHaveBeenCalled();
    expect(client.getAllPages).not.toHaveBeenCalled();
  });

  it("rejects a date-only page request and an undocumented getEverything bypass", async () => {
    vi.mocked(client.get).mockResolvedValue(paymentsFixture.date_only_looking_complete);
    await expect(
      tools.erply_list_payments.handler({
        dateFrom: "2025-01-01",
        dateTo: "2025-12-31",
        start: 0,
        limit: 1,
      }),
    ).rejects.toThrow(/paymentType/);
    await expect(
      tools.erply_list_payments.handler({
        dateFrom: "2025-01-01",
        dateTo: "2025-12-31",
        getEverything: true,
      }),
    ).rejects.toThrow(/paymentType/);
    expect(client.get).not.toHaveBeenCalled();
  });

  it("rejects blank, whitespace, null, and non-string paymentType", async () => {
    const dates = { dateFrom: "2025-01-01", dateTo: "2025-12-31" };
    await expect(tools.erply_list_payments.handler({ ...dates, paymentType: "" })).rejects.toThrow(
      /paymentType is required/,
    );
    await expect(
      tools.erply_list_payments.handler({ ...dates, paymentType: "   " }),
    ).rejects.toThrow(/erply_get_dictionary/);
    await expect(
      tools.erply_list_payments.handler({ ...dates, paymentType: null }),
    ).rejects.toThrow(/PAYMENT_TYPE/);
    await expect(tools.erply_list_payments.handler({ ...dates, paymentType: 1 })).rejects.toThrow(
      /incomplete default subset/,
    );
    expect(client.get).not.toHaveBeenCalled();
  });

  it("passes an explicit paymentType and does not invent getEverything or a page", async () => {
    vi.mocked(client.get).mockResolvedValue(paymentsFixture.list_page);
    const result = await tools.erply_list_payments.handler({
      dateFrom: "2025-01-01",
      dateTo: "2025-12-31",
      paymentType: "  INVOICE_PAYMENT  ",
      isIncome: true,
      getEverything: true,
    });
    expect(client.get).toHaveBeenCalledTimes(1);
    expect(client.getAllPages).not.toHaveBeenCalled();
    const query = vi.mocked(client.get).mock.calls[0]?.[1] as Record<string, unknown>;
    expect(client.get).toHaveBeenCalledWith("/payments", query);
    expect(query).toMatchObject({
      dateFrom: "2025-01-01",
      dateTo: "2025-12-31",
      paymentType: "INVOICE_PAYMENT",
      isIncome: true,
    });
    expect(query.getEverything).toBeUndefined();
    expect(query.start).toBeUndefined();
    expect(query.limit).toBeUndefined();
    expect(JSON.parse(result.content[0].text).totalCount).toBe(1);
  });

  it("forwards start and limit as one page of the requested type", async () => {
    vi.mocked(client.get).mockResolvedValue(paymentsFixture.typed_page);
    const result = await tools.erply_list_payments.handler({
      dateFrom: "2025-01-01",
      dateTo: "2025-01-31",
      paymentType: "PURCHASE_INVOICE_PAYMENT",
      start: 2,
      limit: 1,
    });
    expect(client.get).toHaveBeenCalledTimes(1);
    expect(client.getAllPages).not.toHaveBeenCalled();
    expect(client.get).toHaveBeenCalledWith(
      "/payments",
      expect.objectContaining({
        paymentType: "PURCHASE_INVOICE_PAYMENT",
        start: 2,
        limit: 1,
      }),
    );
    const body = JSON.parse(result.content[0].text) as { totalCount: number; items: unknown[] };
    expect(body.items).toHaveLength(1);
    expect(body.totalCount).toBe(3);
    expect(body.items.length).toBeLessThan(body.totalCount);
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

  it("warns that pendingPaymentId is not a payment id", () => {
    expect(tools.erply_update_payment.description).toMatch(/pendingPaymentId is not a payment id/);
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
