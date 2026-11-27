import { beforeEach, describe, expect, it, vi } from "vitest";
import settingsFixture from "../__fixtures__/settings.json" with { type: "json" };
import type { ErplyBooksClient } from "../client.js";
import { createSettingsTools } from "./settings.js";
import { createMockClient } from "./test-helpers.js";

const noArgTools: Array<{
  name: keyof ReturnType<typeof createSettingsTools>;
  path: string;
  fixture: keyof typeof settingsFixture;
}> = [
  {
    name: "erply_list_all_subscription_invoices",
    path: "/settings/all_subscription_invoices",
    fixture: "all_subscription_invoices",
  },
  {
    name: "erply_list_api_whitelist",
    path: "/settings/api_whitelist",
    fixture: "api_whitelist",
  },
  {
    name: "erply_list_api_whitelist_v2",
    path: "/settings/api_whitelistV2",
    fixture: "api_whitelist_v2",
  },
  {
    name: "erply_list_auth_permissions",
    path: "/settings/auth_permissions",
    fixture: "auth_permissions",
  },
  {
    name: "erply_list_auth_permission_users",
    path: "/settings/auth_permissions/users",
    fixture: "auth_permission_users",
  },
  {
    name: "erply_list_default_priceplans",
    path: "/settings/default_priceplans",
    fixture: "default_priceplans",
  },
  {
    name: "erply_list_valid_payer_organisations",
    path: "/settings/find_valid_payer_organisations",
    fixture: "valid_payer_organisations",
  },
  {
    name: "erply_get_payer_organisation_documents",
    path: "/settings/get_payer_organisation_documents",
    fixture: "payer_organisation_documents",
  },
  {
    name: "erply_get_my_user_info",
    path: "/settings/me",
    fixture: "me",
  },
  {
    name: "erply_list_system_articles",
    path: "/settings/system_article",
    fixture: "system_articles",
  },
  {
    name: "erply_list_unpaid_subscription_invoices",
    path: "/settings/unpaid_subscription_invoices",
    fixture: "unpaid_subscription_invoices",
  },
];

describe("settings read tools", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createSettingsTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createSettingsTools(client);
  });

  it.each(noArgTools)("$name calls $path and returns the API body", async ({
    name,
    path,
    fixture,
  }) => {
    const payload = settingsFixture[fixture];
    vi.mocked(client.get).mockResolvedValue(payload);
    const result = await tools[name].handler({});
    expect(client.get).toHaveBeenCalledWith(path);
    expect(JSON.parse(result.content[0].text)).toEqual(payload);
  });

  it("no-arg tools propagate API errors", async () => {
    vi.mocked(client.get).mockRejectedValue(new Error("API Error 401: Unauthorized"));
    await expect(tools.erply_get_my_user_info.handler({})).rejects.toThrow("401");
  });

  it("erply_add_attributes_to_erply_invoices forwards ids and attribute fields", async () => {
    vi.mocked(client.get).mockResolvedValue(settingsFixture.add_attributes);
    const result = await tools.erply_add_attributes_to_erply_invoices.handler({
      ids: "101,102",
      attributeName: "fixtureName",
      attributeValue: "fixtureValue",
    });
    expect(client.get).toHaveBeenCalledWith("/settings/add_attributes_to_erply_invoices", {
      ids: "101,102",
      attributeName: "fixtureName",
      attributeValue: "fixtureValue",
    });
    expect(JSON.parse(result.content[0].text)).toEqual(settingsFixture.add_attributes);
  });

  it("erply_add_attributes_to_erply_invoices omits unset optional fields", async () => {
    vi.mocked(client.get).mockResolvedValue(settingsFixture.add_attributes);
    await tools.erply_add_attributes_to_erply_invoices.handler({});
    expect(client.get).toHaveBeenCalledWith("/settings/add_attributes_to_erply_invoices", {
      ids: undefined,
      attributeName: undefined,
      attributeValue: undefined,
    });
  });

  it("erply_approve_sending_reminders forwards id", async () => {
    vi.mocked(client.get).mockResolvedValue(settingsFixture.approve_reminders);
    const result = await tools.erply_approve_sending_reminders.handler({ id: "55" });
    expect(client.get).toHaveBeenCalledWith("/settings/approve_sending_reminders", { id: "55" });
    expect(JSON.parse(result.content[0].text)).toEqual(settingsFixture.approve_reminders);
  });

  it("erply_list_countries forwards languageCode", async () => {
    vi.mocked(client.get).mockResolvedValue(settingsFixture.countries);
    const result = await tools.erply_list_countries.handler({ languageCode: "LANGUAGE_ET" });
    expect(client.get).toHaveBeenCalledWith("/settings/countries", { languageCode: "LANGUAGE_ET" });
    expect(JSON.parse(result.content[0].text)).toEqual(settingsFixture.countries);
  });

  it("erply_get_currency_rates forwards currency pair and date", async () => {
    vi.mocked(client.get).mockResolvedValue(settingsFixture.currency_rates);
    const result = await tools.erply_get_currency_rates.handler({
      firstCurrency: "EUR",
      secondCurrency: "USD",
      opDate: "2026-01-15",
    });
    expect(client.get).toHaveBeenCalledWith("/settings/currency_rates", {
      firstCurrency: "EUR",
      secondCurrency: "USD",
      opDate: "2026-01-15",
    });
    expect(JSON.parse(result.content[0].text)).toEqual(settingsFixture.currency_rates);
  });

  it("erply_list_ee_partner_codes forwards filters and paging", async () => {
    vi.mocked(client.get).mockResolvedValue(settingsFixture.ee_partner_codes);
    const result = await tools.erply_list_ee_partner_codes.handler({
      isLegalEntity: true,
      name: "Fixture Partner OÜ",
      country: "EE",
      regCode: "12345678",
      start: 0,
      limit: 20,
    });
    expect(client.get).toHaveBeenCalledWith("/settings/ee/get_partner_code", {
      isLegalEntity: true,
      name: "Fixture Partner OÜ",
      country: "EE",
      regCode: "12345678",
      start: 0,
      limit: 20,
    });
    expect(JSON.parse(result.content[0].text)).toEqual(settingsFixture.ee_partner_codes);
  });

  it("erply_list_ee_partner_codes rejects a negative start offset", async () => {
    await expect(tools.erply_list_ee_partner_codes.handler({ start: -1 })).rejects.toThrow(/start/);
  });

  it("erply_list_ee_partner_codes rejects a non-positive limit", async () => {
    await expect(tools.erply_list_ee_partner_codes.handler({ limit: 0 })).rejects.toThrow(/limit/);
  });

  it("erply_get_parameters forwards typeCode", async () => {
    vi.mocked(client.get).mockResolvedValue(settingsFixture.parameters);
    const result = await tools.erply_get_parameters.handler({ typeCode: "FIXTURE_PARAM" });
    expect(client.get).toHaveBeenCalledWith("/settings/parameters", { typeCode: "FIXTURE_PARAM" });
    expect(JSON.parse(result.content[0].text)).toEqual(settingsFixture.parameters);
  });

  it("erply_get_parameters_encrypted forwards typeCode", async () => {
    vi.mocked(client.get).mockResolvedValue(settingsFixture.parameters_encrypted);
    const result = await tools.erply_get_parameters_encrypted.handler({
      typeCode: "FIXTURE_SECRET",
    });
    expect(client.get).toHaveBeenCalledWith("/settings/parameters_encrypted", {
      typeCode: "FIXTURE_SECRET",
    });
    expect(JSON.parse(result.content[0].text)).toEqual(settingsFixture.parameters_encrypted);
  });

  it("erply_get_translations forwards lang", async () => {
    vi.mocked(client.get).mockResolvedValue(settingsFixture.translations);
    const result = await tools.erply_get_translations.handler({ lang: "LANGUAGE_ET" });
    expect(client.get).toHaveBeenCalledWith("/settings/translations", { lang: "LANGUAGE_ET" });
    expect(JSON.parse(result.content[0].text)).toEqual(settingsFixture.translations);
  });

  it("parameter and translation tools omit unset optional fields", async () => {
    vi.mocked(client.get).mockResolvedValue(settingsFixture.parameters);
    await tools.erply_get_parameters.handler({});
    expect(client.get).toHaveBeenCalledWith("/settings/parameters", { typeCode: undefined });
    await tools.erply_get_parameters_encrypted.handler({});
    expect(client.get).toHaveBeenCalledWith("/settings/parameters_encrypted", {
      typeCode: undefined,
    });
    await tools.erply_get_translations.handler({});
    expect(client.get).toHaveBeenCalledWith("/settings/translations", { lang: undefined });
  });
});
