import { z } from "zod";

import type { ErplyBooksClient } from "../client.js";
import type { Article } from "../types/articles.js";
import {
  optionalBoolean,
  optionalNonNegativeInt,
  optionalPositiveInt,
  optionalString,
  parseToolArgs,
} from "../validation/tool-args.js";
import { jsonToolResult, unwrapListEnvelope } from "./list-response.js";

const listArticlesSchema = z.object({
  keyword: optionalString,
  type: optionalString,
  includePrices: optionalBoolean,
  lang: optionalString,
  layout: optionalString,
  start: optionalNonNegativeInt,
  limit: optionalPositiveInt,
});

export function createArticleTools(client: ErplyBooksClient) {
  return {
    erply_list_articles: {
      description:
        "List articles/products/services from Erply Books (GET /articles). Returns { totalCount, items }.",
      inputSchema: {
        type: "object" as const,
        properties: {
          keyword: { type: "string", description: "Free-text search" },
          type: {
            type: "string",
            description: "ARTICLE_TYPE dictionary code (e.g. ARTICLE_SERVICE, ARTICLE_PRODUCT)",
          },
          includePrices: { type: "boolean", description: "Include price fields when supported" },
          lang: { type: "string", description: "Optional language code" },
          layout: { type: "string", description: "Optional layout code" },
          start: { type: "number", description: "Offset (default 0)" },
          limit: { type: "number", description: "Page size" },
        },
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(listArticlesSchema, params);
        const response = await client.get("/articles", args);
        return jsonToolResult(unwrapListEnvelope<Article>(response));
      },
    },
  };
}
