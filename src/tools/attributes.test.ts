import { beforeEach, describe, expect, it, vi } from "vitest";
import attributesFixture from "../__fixtures__/attributes.json" with { type: "json" };
import { ErplyBooksApiError } from "../api-error.js";
import type { ErplyBooksClient } from "../client.js";
import { createAttributeTools } from "./attributes.js";
import { createMockClient } from "./test-helpers.js";

function parseText(result: { content: Array<{ text: string }> }) {
  return JSON.parse(result.content[0].text);
}

describe("erply_list_attributes", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createAttributeTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createAttributeTools(client);
  });

  it("forwards query params and returns the raw API body", async () => {
    vi.mocked(client.get).mockResolvedValue(attributesFixture.list_page);
    const result = await tools.erply_list_attributes.handler({
      type: "ATTRIBUTE",
      keyword: "colour",
      value: "blue",
      name: "fixture-colour",
      countryCode: "EE",
      entityId: 2001,
      dateFrom: "2024-01-01",
      dateTo: "2024-12-31",
      projectId: "17",
      parentActivityItemId: 9,
      activityId: 8,
      altValue: "navy",
      altValue2: "a2",
      altValue9: "a9",
      transactionEntryId: "55",
      forceOrganisationSearch: true,
      reportGeneratorInput: "{}",
      start: 0,
      limit: 10,
    });
    expect(client.get).toHaveBeenCalledWith(
      "/attributes",
      expect.objectContaining({
        type: "ATTRIBUTE",
        keyword: "colour",
        entityId: 2001,
        projectId: "17",
        transactionEntryId: "55",
        forceOrganisationSearch: true,
        start: 0,
        limit: 10,
      }),
    );
    expect(parseText(result)).toEqual(attributesFixture.list_page);
    expect(parseText(result)).toHaveProperty("organisation");
  });

  it("returns a raw array body unchanged", async () => {
    vi.mocked(client.get).mockResolvedValue(attributesFixture.list_raw_array);
    const result = await tools.erply_list_attributes.handler({});
    expect(client.get).toHaveBeenCalledWith("/attributes", {});
    expect(parseText(result)).toEqual(attributesFixture.list_raw_array);
  });

  it("rejects a negative start offset", async () => {
    await expect(tools.erply_list_attributes.handler({ start: -1 })).rejects.toThrow(/start/);
  });

  it("rejects a non-positive limit", async () => {
    await expect(tools.erply_list_attributes.handler({ limit: 0 })).rejects.toThrow(/limit/);
  });
});

describe("erply_list_attributes_v2", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createAttributeTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createAttributeTools(client);
  });

  it("forwards the same query params to /attributes/v2", async () => {
    vi.mocked(client.get).mockResolvedValue(attributesFixture.list_page);
    const result = await tools.erply_list_attributes_v2.handler({
      name: "fixture-colour",
      start: 0,
      limit: 5,
    });
    expect(client.get).toHaveBeenCalledWith(
      "/attributes/v2",
      expect.objectContaining({ name: "fixture-colour", start: 0, limit: 5 }),
    );
    expect(parseText(result)).toEqual(attributesFixture.list_page);
  });
});

describe("erply_create_attribute", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createAttributeTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createAttributeTools(client);
  });

  it("POSTs with id: 0 and advertised fields", async () => {
    vi.mocked(client.post).mockResolvedValue(attributesFixture.create_response);
    const result = await tools.erply_create_attribute.handler({
      typeCode: "ATTRIBUTE",
      name: "fixture-colour",
      value: "blue",
      entityId: 2001,
      decimalValue: 1.5,
      alternativeValue: "navy",
    });
    expect(client.post).toHaveBeenCalledWith(
      "/attributes",
      expect.objectContaining({
        id: 0,
        typeCode: "ATTRIBUTE",
        name: "fixture-colour",
        value: "blue",
        entityId: 2001,
        decimalValue: 1.5,
        alternativeValue: "navy",
      }),
    );
    expect(parseText(result).id).toBe(101);
  });

  it("passes extra APIActivityItemInfo fields through and allows an empty body", async () => {
    vi.mocked(client.post).mockResolvedValue(attributesFixture.create_response);
    await tools.erply_create_attribute.handler({ customFlag: true });
    expect(client.post).toHaveBeenCalledWith(
      "/attributes",
      expect.objectContaining({ id: 0, customFlag: true }),
    );
  });

  it("propagates API errors", async () => {
    vi.mocked(client.post).mockRejectedValue(
      new ErplyBooksApiError({
        kind: "http",
        message: "forbidden",
        httpStatus: 409,
        method: "POST",
        url: "https://api.erplybooks.com/api/attributes",
      }),
    );
    await expect(
      tools.erply_create_attribute.handler({ name: "fixture-colour" }),
    ).rejects.toMatchObject({ httpStatus: 409 });
  });
});

describe("erply_update_attribute", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createAttributeTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createAttributeTools(client);
  });

  it("requires activityItemId", async () => {
    await expect(tools.erply_update_attribute.handler({ name: "x" })).rejects.toThrow(
      /activityItemId/,
    );
  });

  it("PUTs with the path id and passes extra fields through", async () => {
    vi.mocked(client.put).mockResolvedValue(attributesFixture.update_response);
    const result = await tools.erply_update_attribute.handler({
      activityItemId: 101,
      value: "green",
      customFlag: true,
    });
    expect(client.put).toHaveBeenCalledWith(
      "/attributes/101",
      expect.objectContaining({ id: 101, value: "green", customFlag: true }),
    );
    expect(parseText(result).value).toBe("green");
  });
});

describe("erply_delete_attribute", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createAttributeTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createAttributeTools(client);
  });

  it("requires activityItemId", async () => {
    await expect(tools.erply_delete_attribute.handler({})).rejects.toThrow(/activityItemId/);
  });

  it("DELETEs by id and normalizes an empty response", async () => {
    vi.mocked(client.delete).mockResolvedValue(undefined);
    const result = await tools.erply_delete_attribute.handler({ activityItemId: 101 });
    expect(client.delete).toHaveBeenCalledWith("/attributes/101");
    expect(parseText(result)).toEqual({ ok: true });
  });
});

describe("erply_create_attribute_v2", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createAttributeTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createAttributeTools(client);
  });

  it("POSTs to /attributes/v2 with id: 0", async () => {
    vi.mocked(client.post).mockResolvedValue(attributesFixture.create_v2_response);
    const result = await tools.erply_create_attribute_v2.handler({
      name: "fixture-size",
      value: "large",
      entityId: 2001,
    });
    expect(client.post).toHaveBeenCalledWith(
      "/attributes/v2",
      expect.objectContaining({ id: 0, name: "fixture-size", value: "large", entityId: 2001 }),
    );
    expect(parseText(result).id).toBe(202);
  });
});

describe("erply_update_attribute_v2", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createAttributeTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createAttributeTools(client);
  });

  it("requires activityItemId", async () => {
    await expect(tools.erply_update_attribute_v2.handler({ value: "medium" })).rejects.toThrow(
      /activityItemId/,
    );
  });

  it("PUTs to /attributes/v2/{activityItemId}", async () => {
    vi.mocked(client.put).mockResolvedValue(attributesFixture.update_v2_response);
    await tools.erply_update_attribute_v2.handler({ activityItemId: 202, value: "medium" });
    expect(client.put).toHaveBeenCalledWith(
      "/attributes/v2/202",
      expect.objectContaining({ id: 202, value: "medium" }),
    );
  });
});

describe("erply_get_attribute_asset_tracker_info", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createAttributeTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createAttributeTools(client);
  });

  it("forwards query params and returns the raw API body", async () => {
    vi.mocked(client.get).mockResolvedValue(attributesFixture.asset_tracker_info);
    const result = await tools.erply_get_attribute_asset_tracker_info.handler({
      urlId: 7,
      organisationId: 99,
      start: "2024-01-01",
      end: "2024-01-31",
    });
    expect(client.get).toHaveBeenCalledWith("/attributes/asset_tracker_info", {
      urlId: 7,
      organisationId: 99,
      start: "2024-01-01",
      end: "2024-01-31",
    });
    expect(parseText(result)).toEqual(attributesFixture.asset_tracker_info);
  });
});

describe("erply_create_attribute_car_in", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createAttributeTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createAttributeTools(client);
  });

  it("sends query fields as query params and attachment fields as the body", async () => {
    vi.mocked(client.post).mockResolvedValue(attributesFixture.car_in_response);
    const result = await tools.erply_create_attribute_car_in.handler({
      ATTRIBUTE_LICENCEPLATE: "FIX-123",
      ATTRIBUTE_GROSS_WEIGHT: "12000",
      ATTRIBUTE_UNLADEN_WEIGHT: "8000",
      customerId: 44,
      articleId: 55,
      currency: "EUR",
      filename: "fixture-weighbridge.txt",
      description: "Fake car-in weighbridge record",
      documentId: 4001,
      attribute: { name: "fixture-colour", value: "blue" },
      customBodyField: "extra",
    });
    expect(client.post).toHaveBeenCalledWith(
      "/attributes/car_in",
      expect.objectContaining({
        filename: "fixture-weighbridge.txt",
        description: "Fake car-in weighbridge record",
        documentId: 4001,
        attribute: { name: "fixture-colour", value: "blue" },
        customBodyField: "extra",
      }),
      expect.objectContaining({
        ATTRIBUTE_LICENCEPLATE: "FIX-123",
        ATTRIBUTE_GROSS_WEIGHT: "12000",
        ATTRIBUTE_UNLADEN_WEIGHT: "8000",
        customerId: 44,
        articleId: 55,
        currency: "EUR",
      }),
    );
    const [, body, query] = vi.mocked(client.post).mock.calls[0];
    expect(body).not.toHaveProperty("ATTRIBUTE_LICENCEPLATE");
    expect(body).not.toHaveProperty("customerId");
    expect(query).not.toHaveProperty("filename");
    expect(query).not.toHaveProperty("customBodyField");
    expect(parseText(result).id).toBe(303);
  });

  it("POSTs an empty body when only query params are provided", async () => {
    vi.mocked(client.post).mockResolvedValue(attributesFixture.car_in_response);
    await tools.erply_create_attribute_car_in.handler({ ATTRIBUTE_LICENCEPLATE: "FIX-123" });
    expect(client.post).toHaveBeenCalledWith(
      "/attributes/car_in",
      {},
      expect.objectContaining({ ATTRIBUTE_LICENCEPLATE: "FIX-123" }),
    );
  });
});

describe("erply_create_attributes_for_all_organisations", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createAttributeTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createAttributeTools(client);
  });

  it("POSTs to /attributes/items_for_all_organisation with id: 0", async () => {
    vi.mocked(client.post).mockResolvedValue(attributesFixture.create_response);
    await tools.erply_create_attributes_for_all_organisations.handler({
      name: "fixture-colour",
      value: "blue",
    });
    expect(client.post).toHaveBeenCalledWith(
      "/attributes/items_for_all_organisation",
      expect.objectContaining({ id: 0, name: "fixture-colour", value: "blue" }),
    );
  });
});

describe("erply_delete_attribute_for_all_organisations", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createAttributeTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createAttributeTools(client);
  });

  it("requires a non-empty name", async () => {
    await expect(tools.erply_delete_attribute_for_all_organisations.handler({})).rejects.toThrow(
      /name/,
    );
    await expect(
      tools.erply_delete_attribute_for_all_organisations.handler({ name: "" }),
    ).rejects.toThrow(/name/);
  });

  it("URL-encodes the name in the path", async () => {
    vi.mocked(client.delete).mockResolvedValue(undefined);
    const result = await tools.erply_delete_attribute_for_all_organisations.handler({
      name: "licence plate / test",
    });
    expect(client.delete).toHaveBeenCalledWith(
      "/attributes/items_for_all_organisation/licence%20plate%20%2F%20test",
    );
    expect(parseText(result)).toEqual({ ok: true });
  });
});
