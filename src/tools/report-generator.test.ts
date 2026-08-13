import { beforeEach, describe, expect, it, vi } from "vitest";
import fixture from "../__fixtures__/report-generator.json" with { type: "json" };
import type { ErplyBooksClient } from "../client.js";
import { bytesToolResult } from "./list-response.js";
import { createReportGeneratorTools } from "./report-generator.js";
import { createMockClient } from "./test-helpers.js";

function ab(data: string | number[]): ArrayBuffer {
  const buf = typeof data === "string" ? Buffer.from(data) : Buffer.from(data);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

function textOf(result: { content: Array<{ text: string }> }): unknown {
  return JSON.parse(result.content[0].text);
}

describe("bytesToolResult", () => {
  it("returns empty encoding for zero-length buffers", () => {
    expect(textOf(bytesToolResult(new ArrayBuffer(0)))).toEqual({
      encoding: "empty",
      byteLength: 0,
    });
  });

  it("parses JSON objects and arrays", () => {
    expect(textOf(bytesToolResult(ab('{"a":1}')))).toEqual({ a: 1 });
    expect(textOf(bytesToolResult(ab("[1,2]")))).toEqual([1, 2]);
  });

  it("falls back to utf8 when JSON-looking text is invalid", () => {
    const payload = textOf(bytesToolResult(ab("{not-json"))) as {
      encoding: string;
      text: string;
    };
    expect(payload.encoding).toBe("utf8");
    expect(payload.text).toBe("{not-json");
  });

  it("returns utf8 for printable CSV/XML", () => {
    const csv = textOf(bytesToolResult(ab("a,b\n1,2\n"))) as { encoding: string };
    expect(csv.encoding).toBe("utf8");
    const xml = textOf(bytesToolResult(ab("<rows/>"))) as { text: string };
    expect(xml.text).toBe("<rows/>");
  });

  it("returns base64 for binary payloads", () => {
    const buf = Buffer.from([0, 1, 2, 255, 0, 0, 0, 0]);
    const payload = textOf(bytesToolResult(ab([0, 1, 2, 255, 0, 0, 0, 0]))) as {
      encoding: string;
      data: string;
      byteLength: number;
    };
    expect(payload.encoding).toBe("base64");
    expect(payload.byteLength).toBe(8);
    expect(Buffer.from(payload.data, "base64").equals(buf)).toBe(true);
  });
});

describe("report generator tools", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createReportGeneratorTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createReportGeneratorTools(client);
  });

  it("erply_run_custom_report POSTs body + query", async () => {
    vi.mocked(client.post).mockResolvedValue(fixture.run);
    const result = await tools.erply_run_custom_report.handler({
      tables: "Invoice",
      dateFrom: "2025-01-01",
      dateTo: "2025-12-31",
      getAllProjects: true,
      projectId: 3,
      type: "JSON",
      extra: "passthrough",
      parameters: [{ index: 0, rules: null }],
      additionalParams: null,
      emailInfo: null,
      updateInfo: null,
      callback: null,
      chart: null,
    });
    expect(client.post).toHaveBeenCalledWith(
      "/report_generator",
      expect.objectContaining({
        tables: "Invoice",
        extra: "passthrough",
        parameters: [{ index: 0, rules: undefined }],
      }),
      expect.objectContaining({
        dateFrom: "2025-01-01",
        dateTo: "2025-12-31",
        getAllProjects: true,
        projectId: 3,
        type: "JSON",
      }),
    );
    expect(textOf(result)).toEqual(fixture.run);
  });

  it("erply_run_custom_report_csv POSTs bytes", async () => {
    vi.mocked(client.postBytes).mockResolvedValue(ab("a,b\n1,2\n"));
    const result = await tools.erply_run_custom_report_csv.handler({
      type: "csv",
      dateFrom: "2025-01-01",
    });
    expect(client.postBytes).toHaveBeenCalledWith(
      "/report_generator/csv",
      expect.objectContaining({ type: "csv", dateFrom: "2025-01-01" }),
    );
    expect(textOf(result)).toMatchObject({ encoding: "utf8" });
  });

  it("erply_run_custom_report_xlsx POSTs bytes", async () => {
    vi.mocked(client.postBytes).mockResolvedValue(ab([0x50, 0x4b, 0, 0, 0, 0, 0, 0]));
    const result = await tools.erply_run_custom_report_xlsx.handler({ fileName: "out.xlsx" });
    expect(client.postBytes).toHaveBeenCalledWith(
      "/report_generator/xlsx",
      expect.objectContaining({ fileName: "out.xlsx" }),
    );
    expect(textOf(result)).toMatchObject({ encoding: "base64" });
  });

  it("erply_run_custom_report_excel posts undefined body when empty", async () => {
    vi.mocked(client.postBytes).mockResolvedValue(new ArrayBuffer(0));
    const result = await tools.erply_run_custom_report_excel.handler({});
    expect(client.postBytes).toHaveBeenCalledWith("/report_generator/custom_excel", undefined);
    expect(textOf(result)).toEqual({ encoding: "empty", byteLength: 0 });
  });

  it("erply_run_custom_report_excel posts body when fields are set", async () => {
    vi.mocked(client.postBytes).mockResolvedValue(ab("{}"));
    await tools.erply_run_custom_report_excel.handler({ type: "xlsx" });
    expect(client.postBytes).toHaveBeenCalledWith(
      "/report_generator/custom_excel",
      expect.objectContaining({ type: "xlsx" }),
    );
  });

  it("erply_send_custom_report_email POSTs emailInfo", async () => {
    vi.mocked(client.post).mockResolvedValue(fixture.send);
    const result = await tools.erply_send_custom_report_email.handler({
      tables: "Invoice",
      emailInfo: { receiver: "a@b.c", subject: "Report" },
      type: "PDF",
    });
    expect(client.post).toHaveBeenCalledWith(
      "/report_generator/email",
      expect.objectContaining({
        tables: "Invoice",
        emailInfo: expect.objectContaining({ receiver: "a@b.c" }),
      }),
      expect.objectContaining({ type: "PDF" }),
    );
    expect(textOf(result)).toEqual(fixture.send);
  });

  it("erply_send_custom_report includes activityId query", async () => {
    vi.mocked(client.post).mockResolvedValue(fixture.send);
    await tools.erply_send_custom_report.handler({
      tables: "Invoice",
      activityId: 9,
      dateFrom: "2025-01-01",
    });
    expect(client.post).toHaveBeenCalledWith(
      "/report_generator/send_report",
      expect.objectContaining({ tables: "Invoice" }),
      expect.objectContaining({ activityId: 9, dateFrom: "2025-01-01" }),
    );
  });

  it("erply_run_custom_reports_multiple requires items", async () => {
    await expect(tools.erply_run_custom_reports_multiple.handler({})).rejects.toThrow(/items/);
    vi.mocked(client.post).mockResolvedValue({ ok: true });
    await tools.erply_run_custom_reports_multiple.handler({
      items: [{ tables: "Invoice" }],
      dateFrom: "2025-01-01",
      getAllProjects: false,
    });
    expect(client.post).toHaveBeenCalledWith(
      "/report_generator/multiple",
      expect.objectContaining({ items: [{ tables: "Invoice" }] }),
      expect.objectContaining({ dateFrom: "2025-01-01", getAllProjects: false }),
    );
  });

  it("erply_run_custom_report_file POSTs bytes", async () => {
    vi.mocked(client.postBytes).mockResolvedValue(ab('{"ok":true}'));
    const result = await tools.erply_run_custom_report_file.handler({ type: "pdf" });
    expect(client.postBytes).toHaveBeenCalledWith(
      "/report_generator/file",
      expect.objectContaining({ type: "pdf" }),
    );
    expect(textOf(result)).toEqual({ ok: true });
  });

  it("erply_run_custom_report_file_json requires type", async () => {
    await expect(tools.erply_run_custom_report_file_json.handler({})).rejects.toThrow(/type/);
    vi.mocked(client.post).mockResolvedValue(fixture.run);
    await tools.erply_run_custom_report_file_json.handler({
      type: "pdf",
      tables: "Invoice",
      fileName: "out.pdf",
      encoding: "UTF-8",
      activityId: 1,
      projectId: 2,
      dateFrom: "2025-01-01",
      dateTo: "2025-12-31",
    });
    expect(client.post).toHaveBeenCalledWith(
      "/report_generator/file/pdf/json_format",
      expect.objectContaining({ tables: "Invoice" }),
      expect.objectContaining({
        fileName: "out.pdf",
        encoding: "UTF-8",
        activityId: 1,
        projectId: 2,
        dateFrom: "2025-01-01",
        dateTo: "2025-12-31",
      }),
    );
  });

  it("erply_list_custom_report_columns GETs columns", async () => {
    vi.mocked(client.get).mockResolvedValue(fixture.columns);
    const result = await tools.erply_list_custom_report_columns.handler({
      lang: "LANGUAGE_ET",
      tables: "Invoice",
    });
    expect(client.get).toHaveBeenCalledWith("/report_generator/columns", {
      lang: "LANGUAGE_ET",
      tables: "Invoice",
    });
    expect(textOf(result)).toEqual(fixture.columns);
  });

  it("erply_contact_invoice_result_report GETs with filters", async () => {
    vi.mocked(client.get).mockResolvedValue(fixture.contact_invoice);
    await tools.erply_contact_invoice_result_report.handler({
      contactId: 10,
      month: 4,
      year: 2026,
      showSales: true,
    });
    expect(client.get).toHaveBeenCalledWith("/report_generator/contact_invoice_result_report", {
      contactId: 10,
      month: 4,
      year: 2026,
      showSales: true,
    });
  });

  it("erply_list_user_defined_reports GETs with filters", async () => {
    vi.mocked(client.get).mockResolvedValue(fixture.user_defined);
    const result = await tools.erply_list_user_defined_reports.handler({
      dateFrom: "2025-01-01",
      dateTo: "2025-12-31",
      cashFlowReport: true,
      attribute1: "a",
    });
    expect(client.get).toHaveBeenCalledWith("/report_generator/user_defined", {
      dateFrom: "2025-01-01",
      dateTo: "2025-12-31",
      cashFlowReport: true,
      attribute1: "a",
    });
    expect(textOf(result)).toEqual(fixture.user_defined);
  });

  it("erply_get_custom_report_xml uses getText", async () => {
    vi.mocked(client.getText).mockResolvedValue("<report/>");
    const result = await tools.erply_get_custom_report_xml.handler({ type: "xml", id: 5 });
    expect(client.getText).toHaveBeenCalledWith("/report_generator/xml", { type: "xml", id: 5 });
    expect(textOf(result)).toEqual({ encoding: "utf8", text: "<report/>" });
  });

  it("erply_get_custom_report_file requires type and uses getArrayBuffer", async () => {
    await expect(tools.erply_get_custom_report_file.handler({})).rejects.toThrow(/type/);
    vi.mocked(client.getArrayBuffer).mockResolvedValue(ab("col\n1"));
    const result = await tools.erply_get_custom_report_file.handler({
      type: "csv",
      fileName: "out.csv",
    });
    expect(client.getArrayBuffer).toHaveBeenCalledWith("/report_generator/file/csv", {
      fileName: "out.csv",
    });
    expect(textOf(result)).toMatchObject({ encoding: "utf8" });
  });

  it("erply_edit_custom_report_callback POSTs callback body", async () => {
    vi.mocked(client.post).mockResolvedValue(fixture.edit);
    const result = await tools.erply_edit_custom_report_callback.handler({
      id: 1,
      editConfirmed: true,
      extra: true,
    });
    expect(client.post).toHaveBeenCalledWith(
      "/report_generator/edit",
      expect.objectContaining({ id: 1, editConfirmed: true, extra: true }),
    );
    expect(textOf(result)).toEqual(fixture.edit);
  });

  it("erply_update_custom_report_values POSTs updateInfo", async () => {
    vi.mocked(client.post).mockResolvedValue(fixture.update);
    await tools.erply_update_custom_report_values.handler({
      tables: "Invoice",
      updateInfo: { tableAndColumn: "Invoice.note", value: "x" },
    });
    expect(client.post).toHaveBeenCalledWith(
      "/report_generator/update_values",
      expect.objectContaining({
        tables: "Invoice",
        updateInfo: expect.objectContaining({ tableAndColumn: "Invoice.note" }),
      }),
    );
  });
});
