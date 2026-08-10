import { beforeEach, describe, expect, it, vi } from "vitest";
import taxRatesFixture from "../__fixtures__/tax-rates.json" with { type: "json" };
import { ErplyBooksApiError } from "../api-error.js";
import type { ErplyBooksClient } from "../client.js";
import { createTaxRateTools } from "./tax-rates.js";
import { createMockClient } from "./test-helpers.js";

describe("erply_list_tax_rates", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createTaxRateTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createTaxRateTools(client);
  });

  it("passes filters and unwraps the list envelope", async () => {
    vi.mocked(client.get).mockResolvedValue(taxRatesFixture.list_page);
    const result = await tools.erply_list_tax_rates.handler({
      start: 0,
      limit: 10,
      lang: "en",
    });
    expect(client.get).toHaveBeenCalledWith(
      "/tax_rates",
      expect.objectContaining({ start: 0, limit: 10, lang: "en" }),
    );
    const body = JSON.parse(result.content[0].text);
    expect(body).toEqual({ totalCount: 1, items: taxRatesFixture.list_page.items });
    expect(body).not.toHaveProperty("organisation");
  });

  it("normalizes null items to []", async () => {
    vi.mocked(client.get).mockResolvedValue(taxRatesFixture.list_empty);
    const result = await tools.erply_list_tax_rates.handler({});
    expect(JSON.parse(result.content[0].text)).toEqual({ totalCount: 0, items: [] });
  });
});

describe("erply_create_tax_rate", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createTaxRateTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createTaxRateTools(client);
  });

  it("requires name and percent", async () => {
    await expect(tools.erply_create_tax_rate.handler({})).rejects.toThrow(/name|percent/);
    await expect(tools.erply_create_tax_rate.handler({ name: "VAT" })).rejects.toThrow(/percent/);
  });

  it("POSTs with id: 0", async () => {
    vi.mocked(client.post).mockResolvedValue(taxRatesFixture.create_response);
    const result = await tools.erply_create_tax_rate.handler({
      name: "VAT 22%",
      percent: 22,
      typeCode: "TAX_RATE_VAT",
      sales: true,
    });
    expect(client.post).toHaveBeenCalledWith(
      "/tax_rates",
      expect.objectContaining({
        id: 0,
        name: "VAT 22%",
        percent: 22,
        typeCode: "TAX_RATE_VAT",
        sales: true,
      }),
    );
    expect(JSON.parse(result.content[0].text).id).toBe(10);
  });

  it("propagates API errors", async () => {
    vi.mocked(client.post).mockRejectedValue(
      new ErplyBooksApiError({
        kind: "http",
        message: "forbidden",
        httpStatus: 409,
        method: "POST",
        url: "https://api.erplybooks.com/api/tax_rates",
      }),
    );
    await expect(
      tools.erply_create_tax_rate.handler({ name: "VAT", percent: 22 }),
    ).rejects.toMatchObject({ httpStatus: 409 });
  });
});

describe("erply_update_tax_rate", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createTaxRateTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createTaxRateTools(client);
  });

  it("requires taxRateId", async () => {
    await expect(tools.erply_update_tax_rate.handler({ name: "X" })).rejects.toThrow(/taxRateId/);
  });

  it("PUTs with path id", async () => {
    vi.mocked(client.put).mockResolvedValue(taxRatesFixture.update_response);
    await tools.erply_update_tax_rate.handler({ taxRateId: 10, name: "VAT 22% updated" });
    expect(client.put).toHaveBeenCalledWith(
      "/tax_rates/10",
      expect.objectContaining({ id: 10, name: "VAT 22% updated" }),
    );
  });
});

describe("erply_delete_tax_rate", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createTaxRateTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createTaxRateTools(client);
  });

  it("requires taxRateId", async () => {
    await expect(tools.erply_delete_tax_rate.handler({})).rejects.toThrow(/taxRateId/);
  });

  it("DELETEs by id", async () => {
    vi.mocked(client.delete).mockResolvedValue(undefined);
    const result = await tools.erply_delete_tax_rate.handler({ taxRateId: 10 });
    expect(client.delete).toHaveBeenCalledWith("/tax_rates/10");
    expect(JSON.parse(result.content[0].text)).toEqual({ ok: true });
  });
});
