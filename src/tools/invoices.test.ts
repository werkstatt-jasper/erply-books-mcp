import { beforeEach, describe, expect, it, vi } from "vitest";
import invoicesFixture from "../__fixtures__/invoices.json" with { type: "json" };
import type { ErplyBooksClient } from "../client.js";
import { createInvoiceTools } from "./invoices.js";
import { createMockClient } from "./test-helpers.js";

describe("erply_list_invoices", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createInvoiceTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createInvoiceTools(client);
  });

  it("requires dateFrom, dateTo, and documentType", async () => {
    await expect(tools.erply_list_invoices.handler({})).rejects.toThrow(
      /dateFrom|dateTo|documentType/,
    );
    await expect(
      tools.erply_list_invoices.handler({
        dateFrom: "2025-01-01",
        dateTo: "2025-12-31",
      }),
    ).rejects.toThrow(/documentType/);
  });

  it("rejects unknown documentType values", async () => {
    await expect(
      tools.erply_list_invoices.handler({
        dateFrom: "2025-01-01",
        dateTo: "2025-12-31",
        documentType: "SALES_INVOICE",
      }),
    ).rejects.toThrow(/documentType/);
  });

  it("passes validated args to GET /invoices", async () => {
    vi.mocked(client.get).mockResolvedValue(invoicesFixture.list_page);
    const result = await tools.erply_list_invoices.handler({
      dateFrom: "2025-01-01",
      dateTo: "2025-12-31",
      documentType: "DOCUMENT_POS_SELL",
      limit: 2,
    });
    expect(client.get).toHaveBeenCalledWith(
      "/invoices",
      expect.objectContaining({
        dateFrom: "2025-01-01",
        dateTo: "2025-12-31",
        documentType: "DOCUMENT_POS_SELL",
        limit: 2,
      }),
    );
    expect(JSON.parse(result.content[0].text).items).toHaveLength(1);
  });
});

describe("erply_get_invoice", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createInvoiceTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createInvoiceTools(client);
  });

  it("requires documentId", async () => {
    await expect(tools.erply_get_invoice.handler({})).rejects.toThrow(/documentId/);
  });

  it("GETs /invoices/{id}", async () => {
    vi.mocked(client.get).mockResolvedValue(invoicesFixture.single);
    const result = await tools.erply_get_invoice.handler({ documentId: 55, lang: "en" });
    expect(client.get).toHaveBeenCalledWith("/invoices/55", { lang: "en" });
    expect(JSON.parse(result.content[0].text).id).toBe(55);
  });
});
