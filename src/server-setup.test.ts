import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ErplyBooksClient } from "./client.js";
import type { ToolRecord } from "./server-setup.js";
import { buildAllTools, registerMcpToolHandlers, startStdioServer } from "./server-setup.js";

const mockLoggerInfo = vi.hoisted(() => vi.fn());
const mockLoggerWarn = vi.hoisted(() => vi.fn());

vi.mock("./logger.js", () => ({
  logger: {
    info: mockLoggerInfo,
    warn: mockLoggerWarn,
    fatal: vi.fn(),
  },
}));

vi.mock("@modelcontextprotocol/sdk/server/stdio.js", () => ({
  StdioServerTransport: vi.fn(function MockTransport(this: { x?: number }) {
    this.x = 1;
  }),
}));

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

describe("buildAllTools", () => {
  it("merges read + write tools with erply_ prefixes", () => {
    const client = {} as ErplyBooksClient;
    const tools = buildAllTools(client);
    expect(tools.erply_get_organisation).toBeDefined();
    expect(tools.erply_list_accounts).toBeDefined();
    expect(tools.erply_create_account).toBeDefined();
    expect(tools.erply_update_account).toBeDefined();
    expect(tools.erply_delete_account).toBeDefined();
    expect(tools.erply_list_tax_rates).toBeDefined();
    expect(tools.erply_create_tax_rate).toBeDefined();
    expect(tools.erply_update_tax_rate).toBeDefined();
    expect(tools.erply_delete_tax_rate).toBeDefined();
    expect(tools.erply_list_customers).toBeDefined();
    expect(tools.erply_create_customer).toBeDefined();
    expect(tools.erply_update_customer).toBeDefined();
    expect(tools.erply_delete_customer).toBeDefined();
    expect(tools.erply_list_customer_bank_accounts).toBeDefined();
    expect(tools.erply_get_customer_bank_account).toBeDefined();
    expect(tools.erply_create_customer_bank_account).toBeDefined();
    expect(tools.erply_update_customer_bank_account).toBeDefined();
    expect(tools.erply_delete_customer_bank_account).toBeDefined();
    expect(tools.erply_get_entity_balance).toBeDefined();
    expect(tools.erply_get_project_balance).toBeDefined();
    expect(tools.erply_get_customer_report).toBeDefined();
    expect(tools.erply_delete_customers).toBeDefined();
    expect(tools.erply_update_all_customer_tax_rates).toBeDefined();
    expect(tools.erply_create_customer_v2).toBeDefined();
    expect(tools.erply_update_customer_v2).toBeDefined();
    expect(tools.erply_mark_customer_anonymous).toBeDefined();
    expect(tools.erply_list_invoices).toBeDefined();
    expect(tools.erply_get_invoice).toBeDefined();
    expect(tools.erply_create_invoice).toBeDefined();
    expect(tools.erply_update_invoice).toBeDefined();
    expect(tools.erply_delete_invoice).toBeDefined();
    expect(tools.erply_get_invoice_pdf).toBeDefined();
    expect(tools.erply_send_invoice_email).toBeDefined();
    expect(tools.erply_get_einvoice).toBeDefined();
    expect(tools.erply_send_einvoices).toBeDefined();
    expect(tools.erply_confirm_invoices).toBeDefined();
    expect(tools.erply_list_partner_invoices).toBeDefined();
    expect(tools.erply_create_partner_invoice).toBeDefined();
    expect(tools.erply_create_recurring_invoice).toBeDefined();
    expect(tools.erply_update_recurring_invoice).toBeDefined();
    expect(tools.erply_add_invoice_attribute).toBeDefined();
    expect(tools.erply_add_invoice_dimension).toBeDefined();
    expect(tools.erply_add_invoice_document_connection).toBeDefined();
    expect(tools.erply_add_invoice_opposite).toBeDefined();
    expect(tools.erply_add_invoice_to_queue).toBeDefined();
    expect(tools.erply_delete_invoice_via_post).toBeDefined();
    expect(tools.erply_delete_invoices_multiple_and_payments).toBeDefined();
    expect(tools.erply_forward_invoice_to_user).toBeDefined();
    expect(tools.erply_override_invoice_fields).toBeDefined();
    expect(tools.erply_prepare_invoice_rows).toBeDefined();
    expect(tools.erply_split_invoice_rows).toBeDefined();
    expect(tools.erply_update_invoice_split_rows).toBeDefined();
    expect(tools.erply_use_invoice_prepayment).toBeDefined();
    expect(tools.erply_delete_partner_invoice).toBeDefined();
    expect(tools.erply_update_partner_invoice).toBeDefined();
    expect(tools.erply_delete_invoice_row).toBeDefined();
    expect(tools.erply_list_invoice_templates).toBeDefined();
    expect(tools.erply_get_invoice_template).toBeDefined();
    expect(tools.erply_create_invoice_template).toBeDefined();
    expect(tools.erply_update_invoice_template).toBeDefined();
    expect(tools.erply_delete_invoice_template).toBeDefined();
    expect(tools.erply_get_invoice_history).toBeDefined();
    expect(tools.erply_get_next_invoice_number).toBeDefined();
    expect(tools.erply_check_invoice_number).toBeDefined();
    expect(tools.erply_list_parsed_invoice_validations).toBeDefined();
    expect(tools.erply_list_payments).toBeDefined();
    expect(tools.erply_create_payment).toBeDefined();
    expect(tools.erply_update_payment).toBeDefined();
    expect(tools.erply_delete_payment).toBeDefined();
    expect(tools.erply_import_payment).toBeDefined();
    expect(tools.erply_save_all_payment_imports).toBeDefined();
    expect(tools.erply_connect_payment_with_documents).toBeDefined();
    expect(tools.erply_list_pending_payments).toBeDefined();
    expect(tools.erply_settle_prepayments).toBeDefined();
    expect(tools.erply_sepa_payments).toBeDefined();
    expect(tools.erply_bank_import).toBeDefined();
    expect(tools.erply_bank_import_v2).toBeDefined();
    expect(tools.erply_list_attachments).toBeDefined();
    expect(tools.erply_get_attachment).toBeDefined();
    expect(tools.erply_create_attachment).toBeDefined();
    expect(tools.erply_delete_attachment).toBeDefined();
    expect(tools.erply_digitize_attachment).toBeDefined();
    expect(tools.erply_parse_attachment).toBeDefined();
    expect(tools.erply_confirm_attachment).toBeDefined();
    expect(tools.erply_attach_inbox_item_to_document).toBeDefined();
    expect(tools.erply_mark_attachment_opened).toBeDefined();
    expect(tools.erply_mark_attachment_not_digitizable).toBeDefined();
    expect(tools.erply_create_purchase_order_from_attachment).toBeDefined();
    expect(tools.erply_link_attachment_to_erply_invoice).toBeDefined();
    expect(tools.erply_get_attachment_preview).toBeDefined();
    expect(tools.erply_get_attachment_html_template).toBeDefined();
    expect(tools.erply_get_attachments_zip).toBeDefined();
    expect(tools.erply_get_summary_invoice).toBeDefined();
    expect(tools.erply_get_attachment_child).toBeDefined();
    expect(tools.erply_create_attachments_multiple).toBeDefined();
    expect(tools.erply_create_attachment_simple).toBeDefined();
    expect(tools.erply_get_digi_attachment).toBeDefined();
    expect(tools.erply_create_digi_base64).toBeDefined();
    expect(tools.erply_create_digi_form).toBeDefined();
    expect(tools.erply_get_digi_country_from_parser).toBeDefined();
    expect(tools.erply_submit_kyc).toBeDefined();
    expect(tools.erply_submit_kyc_json).toBeDefined();
    expect(tools.erply_delete_attachment_via_post).toBeDefined();
    expect(tools.erply_delete_activity_attachment).toBeDefined();
    expect(tools.erply_list_articles).toBeDefined();
    expect(tools.erply_create_article).toBeDefined();
    expect(tools.erply_update_article).toBeDefined();
    expect(tools.erply_delete_article).toBeDefined();
    expect(tools.erply_list_projects).toBeDefined();
    expect(tools.erply_create_project).toBeDefined();
    expect(tools.erply_update_project).toBeDefined();
    expect(tools.erply_delete_project).toBeDefined();
    expect(tools.erply_list_account_entries).toBeDefined();
    expect(tools.erply_list_transaction_entries).toBeDefined();
    expect(tools.erply_get_transaction_entry).toBeDefined();
    expect(tools.erply_create_transaction_entry).toBeDefined();
    expect(tools.erply_update_transaction_entry).toBeDefined();
    expect(tools.erply_delete_transaction_entry).toBeDefined();
    expect(tools.erply_balance_sheet).toBeDefined();
    expect(tools.erply_income_sheet).toBeDefined();
    expect(tools.erply_aged_receivables).toBeDefined();
    expect(tools.erply_general_ledger).toBeDefined();
    expect(tools.erply_daybook).toBeDefined();
    expect(tools.erply_trial_balance).toBeDefined();
    expect(tools.erply_vat_ee).toBeDefined();
    expect(tools.erply_contact_balance).toBeDefined();
    expect(tools.erply_fixed_assets).toBeDefined();
    expect(tools.erply_run_custom_report).toBeDefined();
    expect(tools.erply_run_custom_report_csv).toBeDefined();
    expect(tools.erply_run_custom_report_xlsx).toBeDefined();
    expect(tools.erply_run_custom_report_excel).toBeDefined();
    expect(tools.erply_send_custom_report_email).toBeDefined();
    expect(tools.erply_send_custom_report).toBeDefined();
    expect(tools.erply_run_custom_reports_multiple).toBeDefined();
    expect(tools.erply_run_custom_report_file).toBeDefined();
    expect(tools.erply_run_custom_report_file_json).toBeDefined();
    expect(tools.erply_list_custom_report_columns).toBeDefined();
    expect(tools.erply_contact_invoice_result_report).toBeDefined();
    expect(tools.erply_list_user_defined_reports).toBeDefined();
    expect(tools.erply_get_custom_report_xml).toBeDefined();
    expect(tools.erply_get_custom_report_file).toBeDefined();
    expect(tools.erply_edit_custom_report_callback).toBeDefined();
    expect(tools.erply_update_custom_report_values).toBeDefined();
    expect(tools.erply_get_dictionary).toBeDefined();
  });
});

describe("registerMcpToolHandlers", () => {
  const setRequestHandler = vi.fn();

  beforeEach(() => {
    setRequestHandler.mockReset();
    mockLoggerInfo.mockReset();
    mockLoggerWarn.mockReset();
  });

  function registerWith(tools: ToolRecord) {
    registerMcpToolHandlers({ setRequestHandler }, tools);
    const listFn = setRequestHandler.mock.calls[0][1] as () => Promise<{
      tools: { name: string; description: string; inputSchema: object }[];
    }>;
    const callFn = setRequestHandler.mock.calls[1][1] as (req: {
      params: { name: string; arguments?: Record<string, unknown> };
    }) => Promise<{ content: { type: string; text: string }[]; isError?: boolean }>;
    return { listFn, callFn };
  }

  it("lists an empty catalog", async () => {
    const { listFn } = registerWith({});
    expect(setRequestHandler).toHaveBeenCalledTimes(2);
    await expect(listFn()).resolves.toEqual({ tools: [] });
  });

  it("lists registered tools with metadata", async () => {
    const { listFn } = registerWith({
      erply_ping: {
        description: "Ping",
        inputSchema: { type: "object" },
        handler: async () => ({ content: [{ type: "text", text: "pong" }] }),
      },
    });
    const result = await listFn();
    expect(result.tools).toEqual([
      { name: "erply_ping", description: "Ping", inputSchema: { type: "object" } },
    ]);
  });

  it("throws and warns on unknown tool", async () => {
    const { callFn } = registerWith({});
    await expect(callFn({ params: { name: "nope" } })).rejects.toThrow("Unknown tool: nope");
    expect(mockLoggerWarn).toHaveBeenCalledWith(
      expect.objectContaining({ component: "tool", tool: "nope", outcome: "unknown_tool" }),
      "mcp tool call",
    );
  });

  it("invokes the handler and logs ok outcome", async () => {
    const handler = vi.fn(async () => ({ content: [{ type: "text", text: "pong" }] }));
    const { callFn } = registerWith({
      erply_ping: { description: "Ping", inputSchema: {}, handler },
    });

    const result = await callFn({ params: { name: "erply_ping", arguments: { a: 1 } } });
    expect(handler).toHaveBeenCalledWith({ a: 1 });
    expect(result.content[0].text).toBe("pong");
    expect(mockLoggerInfo).toHaveBeenCalledWith(
      expect.objectContaining({ component: "tool", tool: "erply_ping", outcome: "ok" }),
      "mcp tool call",
    );
  });

  it("logs error outcome when the handler flags isError", async () => {
    const { callFn } = registerWith({
      erply_fail: {
        description: "Fail",
        inputSchema: {},
        handler: async () => ({
          content: [{ type: "text", text: "bad" }],
          isError: true,
        }),
      },
    });

    const result = await callFn({ params: { name: "erply_fail" } });
    expect(result.isError).toBe(true);
    expect(mockLoggerInfo).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "error" }),
      "mcp tool call",
    );
  });

  it("wraps handler throws (Error) into an isError result", async () => {
    const { callFn } = registerWith({
      erply_throw: {
        description: "Throw",
        inputSchema: {},
        handler: async () => {
          throw new Error("boom");
        },
      },
    });

    const result = await callFn({ params: { name: "erply_throw" } });
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text)).toEqual({ error: "boom" });
    expect(mockLoggerInfo).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "handler_throw" }),
      "mcp tool call",
    );
  });

  it("stringifies non-Error throws", async () => {
    const { callFn } = registerWith({
      erply_throw_raw: {
        description: "Throw raw",
        inputSchema: {},
        handler: async () => {
          throw "raw failure";
        },
      },
    });

    const result = await callFn({ params: { name: "erply_throw_raw" } });
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text)).toEqual({ error: "raw failure" });
  });
});

describe("startStdioServer", () => {
  beforeEach(() => {
    vi.mocked(StdioServerTransport).mockClear();
    mockLoggerInfo.mockClear();
  });

  it("connects server to stdio transport and logs", async () => {
    const connect = vi.fn().mockResolvedValue(undefined);

    await startStdioServer({ connect });

    expect(StdioServerTransport).toHaveBeenCalledTimes(1);
    expect(connect).toHaveBeenCalled();
    expect(mockLoggerInfo).toHaveBeenCalledWith("Erply Books MCP server running on stdio");
  });
});
