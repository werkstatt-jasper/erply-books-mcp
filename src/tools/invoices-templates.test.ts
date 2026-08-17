import { beforeEach, describe, expect, it, vi } from "vitest";
import invoicesTemplatesFixture from "../__fixtures__/invoices-templates.json" with {
  type: "json",
};
import { ErplyBooksApiError } from "../api-error.js";
import type { ErplyBooksClient } from "../client.js";
import { __test__, createInvoiceTemplateTools } from "./invoices-templates.js";
import { createMockClient } from "./test-helpers.js";

describe("normalizeNewNumberDate", () => {
  it("appends T00:00:00 to YYYY-MM-DD and strips a trailing Z", () => {
    expect(__test__.normalizeNewNumberDate("2026-08-17")).toBe("2026-08-17T00:00:00");
    expect(__test__.normalizeNewNumberDate("2026-08-17T14:30:00")).toBe("2026-08-17T14:30:00");
    expect(__test__.normalizeNewNumberDate("2026-08-17T14:30:00Z")).toBe("2026-08-17T14:30:00");
  });
});

describe("erply_list_invoice_templates", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createInvoiceTemplateTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createInvoiceTemplateTools(client);
  });

  it("GETs /invoices/templates and unwraps the envelope", async () => {
    vi.mocked(client.get).mockResolvedValue(invoicesTemplatesFixture.template_list);
    const result = await tools.erply_list_invoice_templates.handler({
      languageCode: "LANGUAGE_EN",
      limit: 5,
    });
    expect(client.get).toHaveBeenCalledWith("/invoices/templates", {
      languageCode: "LANGUAGE_EN",
      deprecated: undefined,
      start: undefined,
      limit: 5,
    });
    expect(JSON.parse(result.content[0].text)).toEqual({
      totalCount: 1,
      items: invoicesTemplatesFixture.template_list.items,
    });
  });
});

describe("erply_get_invoice_template", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createInvoiceTemplateTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createInvoiceTemplateTools(client);
  });

  it("requires documentInfoId", async () => {
    await expect(tools.erply_get_invoice_template.handler({})).rejects.toThrow(/documentInfoId/);
  });

  it("GETs /invoices/templates/{documentInfoId}", async () => {
    vi.mocked(client.get).mockResolvedValue(invoicesTemplatesFixture.template_single);
    const result = await tools.erply_get_invoice_template.handler({ documentInfoId: 35386 });
    expect(client.get).toHaveBeenCalledWith("/invoices/templates/35386");
    expect(JSON.parse(result.content[0].text).documentName).toBe("MAIN|Invoice");
  });
});

describe("erply_create_invoice_template", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createInvoiceTemplateTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createInvoiceTemplateTools(client);
  });

  it("requires documentName and languageCode", async () => {
    await expect(tools.erply_create_invoice_template.handler({})).rejects.toThrow(
      /documentName|languageCode/,
    );
  });

  it("POSTs with id: 0", async () => {
    vi.mocked(client.post).mockResolvedValue(invoicesTemplatesFixture.template_create);
    const result = await tools.erply_create_invoice_template.handler({
      documentName: "MCP E30 probe",
      languageCode: "LANGUAGE_EN",
      templateId: "18098",
    });
    expect(client.post).toHaveBeenCalledWith(
      "/invoices/templates",
      expect.objectContaining({
        id: 0,
        documentName: "MCP E30 probe",
        languageCode: "LANGUAGE_EN",
        templateId: "18098",
      }),
    );
    expect(JSON.parse(result.content[0].text).id).toBe(426715);
  });
});

describe("erply_update_invoice_template", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createInvoiceTemplateTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createInvoiceTemplateTools(client);
  });

  it("requires documentInfoId", async () => {
    await expect(
      tools.erply_update_invoice_template.handler({ documentName: "X" }),
    ).rejects.toThrow(/documentInfoId/);
  });

  it("PUTs with path id winning", async () => {
    vi.mocked(client.put).mockResolvedValue(invoicesTemplatesFixture.template_update);
    const result = await tools.erply_update_invoice_template.handler({
      documentInfoId: 426715,
      documentName: "MCP E30 probe updated",
      languageCode: "LANGUAGE_EN",
    });
    expect(client.put).toHaveBeenCalledWith(
      "/invoices/templates/426715",
      expect.objectContaining({
        id: 426715,
        documentName: "MCP E30 probe updated",
        languageCode: "LANGUAGE_EN",
      }),
    );
    expect(JSON.parse(result.content[0].text).documentName).toBe("MCP E30 probe updated");
  });
});

describe("erply_delete_invoice_template", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createInvoiceTemplateTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createInvoiceTemplateTools(client);
  });

  it("requires documentInfoId", async () => {
    await expect(tools.erply_delete_invoice_template.handler({})).rejects.toThrow(/documentInfoId/);
  });

  it("DELETEs /invoices/templates/{documentInfoId}", async () => {
    vi.mocked(client.delete).mockResolvedValue(undefined);
    const result = await tools.erply_delete_invoice_template.handler({ documentInfoId: 426715 });
    expect(client.delete).toHaveBeenCalledWith("/invoices/templates/426715");
    expect(JSON.parse(result.content[0].text)).toEqual({ ok: true });
  });
});

describe("erply_get_invoice_history", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createInvoiceTemplateTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createInvoiceTemplateTools(client);
  });

  it("requires documentId", async () => {
    await expect(tools.erply_get_invoice_history.handler({})).rejects.toThrow(/documentId/);
  });

  it("GETs /invoices/history and returns the array", async () => {
    vi.mocked(client.get).mockResolvedValue(invoicesTemplatesFixture.history);
    const result = await tools.erply_get_invoice_history.handler({ documentId: 83896285 });
    expect(client.get).toHaveBeenCalledWith("/invoices/history", { documentId: 83896285 });
    expect(JSON.parse(result.content[0].text)).toEqual(invoicesTemplatesFixture.history);
  });
});

describe("erply_get_next_invoice_number", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createInvoiceTemplateTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createInvoiceTemplateTools(client);
  });

  it("requires typeCode", async () => {
    await expect(tools.erply_get_next_invoice_number.handler({})).rejects.toThrow(/typeCode/);
  });

  it("normalizes YYYY-MM-DD and stringifies projectId", async () => {
    vi.mocked(client.get).mockResolvedValue(invoicesTemplatesFixture.new_number);
    const result = await tools.erply_get_next_invoice_number.handler({
      typeCode: "DOCUMENT_SELL",
      date: "2026-08-17",
      projectId: 12,
      articleRowType: "ARTICLE_ROW_SELL",
    });
    expect(client.get).toHaveBeenCalledWith("/invoices/new_number", {
      typeCode: "DOCUMENT_SELL",
      date: "2026-08-17T00:00:00",
      projectId: "12",
      articleRowType: "ARTICLE_ROW_SELL",
    });
    expect(JSON.parse(result.content[0].text).number).toBe("24-15000");
  });

  it("omits date when unset", async () => {
    vi.mocked(client.get).mockResolvedValue(invoicesTemplatesFixture.new_number);
    await tools.erply_get_next_invoice_number.handler({ typeCode: "DOCUMENT_SELL" });
    expect(client.get).toHaveBeenCalledWith("/invoices/new_number", {
      typeCode: "DOCUMENT_SELL",
      date: undefined,
      projectId: undefined,
      articleRowType: undefined,
    });
  });
});

describe("erply_check_invoice_number", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createInvoiceTemplateTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createInvoiceTemplateTools(client);
  });

  it("requires number", async () => {
    await expect(tools.erply_check_invoice_number.handler({})).rejects.toThrow(/number/);
  });

  it("POSTs /invoices/new_number with id: 0", async () => {
    vi.mocked(client.post).mockResolvedValue(invoicesTemplatesFixture.check_number_exists);
    const result = await tools.erply_check_invoice_number.handler({
      number: "MCP-REC-1786460302855",
      typeCode: "DOCUMENT_SELL",
      date: "2026-08-11",
      customerId: 15709245,
    });
    expect(client.post).toHaveBeenCalledWith(
      "/invoices/new_number",
      expect.objectContaining({
        id: 0,
        number: "MCP-REC-1786460302855",
        typeCode: "DOCUMENT_SELL",
        date: "2026-08-11",
        customerId: 15709245,
      }),
    );
    expect(JSON.parse(result.content[0].text)).toMatchObject({
      exists: true,
      existingDocumentId: 83896285,
    });
  });

  it("propagates ErplyBooksApiError", async () => {
    vi.mocked(client.post).mockRejectedValue(
      new ErplyBooksApiError({
        kind: "http",
        message: "conflict",
        httpStatus: 409,
        method: "POST",
        url: "https://api.erplybooks.com/api/invoices/new_number",
      }),
    );
    await expect(tools.erply_check_invoice_number.handler({ number: "X" })).rejects.toMatchObject({
      httpStatus: 409,
    });
  });
});

describe("erply_list_parsed_invoice_validations", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createInvoiceTemplateTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createInvoiceTemplateTools(client);
  });

  it("requires documentType, year, and month", async () => {
    await expect(tools.erply_list_parsed_invoice_validations.handler({})).rejects.toThrow(
      /documentType|year|month/,
    );
  });

  it("rejects month outside 1-12", async () => {
    await expect(
      tools.erply_list_parsed_invoice_validations.handler({
        documentType: "DOCUMENT_SELL",
        year: 2026,
        month: 13,
      }),
    ).rejects.toThrow(/month/);
  });

  it("GETs with required filters", async () => {
    vi.mocked(client.get).mockResolvedValue(invoicesTemplatesFixture.parsed_validations);
    const result = await tools.erply_list_parsed_invoice_validations.handler({
      documentType: "DOCUMENT_SELL",
      year: 2026,
      month: 8,
      start: 0,
      limit: 5,
    });
    expect(client.get).toHaveBeenCalledWith("/invoices/parsed_invoice_info_validation", {
      documentType: "DOCUMENT_SELL",
      year: 2026,
      month: 8,
      start: 0,
      limit: 5,
    });
    expect(JSON.parse(result.content[0].text)).toEqual(invoicesTemplatesFixture.parsed_validations);
  });
});
