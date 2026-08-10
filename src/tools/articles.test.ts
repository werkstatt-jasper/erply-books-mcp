import { beforeEach, describe, expect, it, vi } from "vitest";
import articlesFixture from "../__fixtures__/articles.json" with { type: "json" };
import { ErplyBooksApiError } from "../api-error.js";
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

describe("erply_create_article", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createArticleTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createArticleTools(client);
  });

  it("requires name", async () => {
    await expect(tools.erply_create_article.handler({})).rejects.toThrow(/name/);
  });

  it("POSTs with id: 0", async () => {
    vi.mocked(client.post).mockResolvedValue(articlesFixture.create_response);
    const result = await tools.erply_create_article.handler({
      name: "Consulting",
      code: "CONS",
      typeCode: "ARTICLE_SERVICE",
    });
    expect(client.post).toHaveBeenCalledWith(
      "/articles",
      expect.objectContaining({
        id: 0,
        name: "Consulting",
        code: "CONS",
        typeCode: "ARTICLE_SERVICE",
      }),
    );
    expect(JSON.parse(result.content[0].text).id).toBe(1);
  });

  it("propagates API errors", async () => {
    vi.mocked(client.post).mockRejectedValue(
      new ErplyBooksApiError({
        kind: "http",
        message: "forbidden",
        httpStatus: 409,
        method: "POST",
        url: "https://api.erplybooks.com/api/articles",
      }),
    );
    await expect(tools.erply_create_article.handler({ name: "X" })).rejects.toMatchObject({
      httpStatus: 409,
    });
  });
});

describe("erply_update_article", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createArticleTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createArticleTools(client);
  });

  it("requires articleId", async () => {
    await expect(tools.erply_update_article.handler({ name: "X" })).rejects.toThrow(/articleId/);
  });

  it("PUTs with path id", async () => {
    vi.mocked(client.put).mockResolvedValue(articlesFixture.update_response);
    await tools.erply_update_article.handler({ articleId: 1, name: "Consulting updated" });
    expect(client.put).toHaveBeenCalledWith(
      "/articles/1",
      expect.objectContaining({ id: 1, name: "Consulting updated" }),
    );
  });
});

describe("erply_delete_article", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createArticleTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createArticleTools(client);
  });

  it("requires articleId", async () => {
    await expect(tools.erply_delete_article.handler({})).rejects.toThrow(/articleId/);
  });

  it("DELETEs by id", async () => {
    vi.mocked(client.delete).mockResolvedValue(undefined);
    const result = await tools.erply_delete_article.handler({ articleId: 1 });
    expect(client.delete).toHaveBeenCalledWith("/articles/1");
    expect(JSON.parse(result.content[0].text)).toEqual({ ok: true });
  });
});
