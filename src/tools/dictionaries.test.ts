import { beforeEach, describe, expect, it, vi } from "vitest";
import dictionariesFixture from "../__fixtures__/dictionaries.json" with { type: "json" };
import type { ErplyBooksClient } from "../client.js";
import { createDictionaryTools } from "./dictionaries.js";
import { createMockClient } from "./test-helpers.js";

describe("erply_get_dictionary", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createDictionaryTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createDictionaryTools(client);
  });

  it("returns the dictionary JSON", async () => {
    vi.mocked(client.get).mockResolvedValue(dictionariesFixture.sample);
    const result = await tools.erply_get_dictionary.handler({ dictionaryCode: "DOCUMENT_TYPE" });
    expect(client.get).toHaveBeenCalledWith("/settings/dictionaries/DOCUMENT_TYPE", {
      languageCode: undefined,
    });
    expect(JSON.parse(result.content[0].text)).toEqual(dictionariesFixture.sample);
  });

  it("passes languageCode through when provided", async () => {
    vi.mocked(client.get).mockResolvedValue(dictionariesFixture.sample);
    await tools.erply_get_dictionary.handler({
      dictionaryCode: "PAYMENT_TYPE",
      languageCode: "LANGUAGE_ET",
    });
    expect(client.get).toHaveBeenCalledWith("/settings/dictionaries/PAYMENT_TYPE", {
      languageCode: "LANGUAGE_ET",
    });
  });

  it("rejects invalid dictionaryCode", async () => {
    await expect(
      tools.erply_get_dictionary.handler({ dictionaryCode: "NOT_A_REAL_DICT" }),
    ).rejects.toThrow(/dictionaryCode/);
  });

  it("rejects empty dictionaryCode", async () => {
    await expect(tools.erply_get_dictionary.handler({ dictionaryCode: "" })).rejects.toThrow(
      /dictionaryCode/,
    );
  });

  it("propagates API errors", async () => {
    vi.mocked(client.get).mockRejectedValue(new Error("API Error 401: Unauthorized"));
    await expect(
      tools.erply_get_dictionary.handler({ dictionaryCode: "DOCUMENT_TYPE" }),
    ).rejects.toThrow("401");
  });
});
