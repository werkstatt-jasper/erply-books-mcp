import { beforeEach, describe, expect, it, vi } from "vitest";
import articlesFixture from "../__fixtures__/articles.json" with { type: "json" };
import type { ErplyBooksClient } from "../client.js";
import { createArticleTools } from "./articles.js";
import { createMockClient } from "./test-helpers.js";

describe("erply_list_articles", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createArticleTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createArticleTools(client);
  });

  it("passes validated args to GET /articles", async () => {
    vi.mocked(client.get).mockResolvedValue(articlesFixture.list_page);
    const result = await tools.erply_list_articles.handler({
      keyword: "cons",
      type: "ARTICLE_SERVICE",
      includePrices: true,
      start: 0,
      limit: 10,
    });
    expect(client.get).toHaveBeenCalledWith(
      "/articles",
      expect.objectContaining({
        keyword: "cons",
        type: "ARTICLE_SERVICE",
        includePrices: true,
        start: 0,
        limit: 10,
      }),
    );
    const body = JSON.parse(result.content[0].text);
    expect(body.totalCount).toBe(1);
    expect(body.items[0].code).toBe("CONS");
    expect(body).not.toHaveProperty("organisation");
  });

  it("allows empty params", async () => {
    vi.mocked(client.get).mockResolvedValue(articlesFixture.list_page);
    await tools.erply_list_articles.handler({});
    expect(client.get).toHaveBeenCalledWith("/articles", {});
  });
});
