import { z } from "zod";

import type { ErplyBooksClient } from "../client.js";
import type { Article } from "../types/articles.js";
import {
  optionalBoolean,
  optionalNonNegativeInt,
  optionalNumber,
  optionalPositiveInt,
  optionalString,
  parseToolArgs,
  positiveInt,
} from "../validation/tool-args.js";
import { jsonToolResult, mutationToolResult, unwrapListEnvelope } from "./list-response.js";

const listArticlesSchema = z.object({
  keyword: optionalString,
  type: optionalString,
  includePrices: optionalBoolean,
  lang: optionalString,
  layout: optionalString,
  start: optionalNonNegativeInt,
  limit: optionalPositiveInt,
});

const createArticleSchema = z
  .object({
    name: z.string().min(1),
    code: optionalString,
    typeCode: optionalString,
    unitCode: optionalString,
    basePrice: optionalNumber,
    extraCharge: optionalNumber,
    vatPercent: optionalNumber,
    taxRateId: optionalPositiveInt,
    expenseAccountId: optionalPositiveInt,
    assetAccountId: optionalPositiveInt,
    revenueAccountId: optionalPositiveInt,
    info: optionalString,
    partnerArticleId: optionalString,
    lifespanValue: optionalNumber,
  })
  .passthrough();

const updateArticleSchema = z
  .object({
    articleId: positiveInt,
    name: optionalString,
    code: optionalString,
    typeCode: optionalString,
    unitCode: optionalString,
    basePrice: optionalNumber,
    extraCharge: optionalNumber,
    vatPercent: optionalNumber,
    taxRateId: optionalPositiveInt,
    expenseAccountId: optionalPositiveInt,
    assetAccountId: optionalPositiveInt,
    revenueAccountId: optionalPositiveInt,
    info: optionalString,
    partnerArticleId: optionalString,
    lifespanValue: optionalNumber,
  })
  .passthrough();

const deleteArticleSchema = z.object({
  articleId: positiveInt,
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

    erply_create_article: {
      description:
        "Create an article/product/service (POST /articles). Requires name. Sends id: 0. Optional typeCode (e.g. ARTICLE_SERVICE, ARTICLE_PRODUCT), code, prices, taxRateId, account ids. Extra APIArticleInfo fields may be passed through.",
      inputSchema: {
        type: "object" as const,
        properties: {
          name: { type: "string", description: "Article name (required)" },
          code: { type: "string", description: "Article code" },
          typeCode: {
            type: "string",
            description: "ARTICLE_TYPE dictionary code (e.g. ARTICLE_SERVICE)",
          },
          unitCode: { type: "string" },
          basePrice: { type: "number" },
          extraCharge: { type: "number" },
          vatPercent: { type: "number" },
          taxRateId: { type: "number" },
          expenseAccountId: { type: "number" },
          assetAccountId: { type: "number" },
          revenueAccountId: { type: "number" },
          info: { type: "string" },
          partnerArticleId: { type: "string" },
          lifespanValue: { type: "number" },
        },
        required: ["name"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(createArticleSchema, params);
        const created = await client.post<Article>("/articles", { ...args, id: 0 });
        return mutationToolResult(created);
      },
    },

    erply_update_article: {
      description:
        "Update an article (PUT /articles/{articleId}). Requires articleId. Path id wins over body id.",
      inputSchema: {
        type: "object" as const,
        properties: {
          articleId: { type: "number", description: "Article id (required)" },
          name: { type: "string" },
          code: { type: "string" },
          typeCode: { type: "string" },
          unitCode: { type: "string" },
          basePrice: { type: "number" },
          extraCharge: { type: "number" },
          vatPercent: { type: "number" },
          taxRateId: { type: "number" },
          expenseAccountId: { type: "number" },
          assetAccountId: { type: "number" },
          revenueAccountId: { type: "number" },
          info: { type: "string" },
          partnerArticleId: { type: "string" },
          lifespanValue: { type: "number" },
        },
        required: ["articleId"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(updateArticleSchema, params);
        const { articleId, ...body } = args;
        const updated = await client.put<Article>(`/articles/${articleId}`, {
          ...body,
          id: articleId,
        });
        return mutationToolResult(updated);
      },
    },

    erply_delete_article: {
      description:
        "Delete an article by id (DELETE /articles/{articleId}). Destructive — requires an explicit articleId.",
      inputSchema: {
        type: "object" as const,
        properties: {
          articleId: { type: "number", description: "Article id to delete (required)" },
        },
        required: ["articleId"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(deleteArticleSchema, params);
        const result = await client.delete(`/articles/${args.articleId}`);
        return mutationToolResult(result);
      },
    },
  };
}
