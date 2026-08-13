import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

import type { ErplyBooksClient } from "./client.js";
import { logger } from "./logger.js";
import { createAccountEntryTools } from "./tools/account-entries.js";
import { createAccountTools } from "./tools/accounts.js";
import { createArticleTools } from "./tools/articles.js";
import { createAttachmentTools } from "./tools/attachments.js";
import { createAttachmentExtraTools } from "./tools/attachments-extras.js";
import { createAttachmentInboxTools } from "./tools/attachments-inbox.js";
import { createCustomerTools } from "./tools/customers.js";
import { createDictionaryTools } from "./tools/dictionaries.js";
import { createInvoiceTools } from "./tools/invoices.js";
import { createInvoiceExtraTools } from "./tools/invoices-extras.js";
import { createOrganisationTools } from "./tools/organisation.js";
import { createPaymentTools } from "./tools/payments.js";
import { createPaymentBankTools } from "./tools/payments-bank.js";
import { createProjectTools } from "./tools/projects.js";
import { createReportGeneratorTools } from "./tools/report-generator.js";
import { createReportTools } from "./tools/reports.js";
import { createTaxRateTools } from "./tools/tax-rates.js";
import { createTransactionEntryTools } from "./tools/transaction-entries.js";

// biome-ignore lint/suspicious/noExplicitAny: tool handlers use per-tool param shapes
export type ToolHandler = (params: any) => Promise<{
  content: Array<{ type: string; text: string }>;
}>;

export type ToolRecord = Record<
  string,
  {
    description: string;
    inputSchema: object;
    handler: ToolHandler;
  }
>;

/** Registers all Erply Books MCP tools (read + write MVP). */
export function buildAllTools(client: ErplyBooksClient): ToolRecord {
  return {
    ...createOrganisationTools(client),
    ...createAccountTools(client),
    ...createTaxRateTools(client),
    ...createCustomerTools(client),
    ...createInvoiceTools(client),
    ...createInvoiceExtraTools(client),
    ...createPaymentTools(client),
    ...createPaymentBankTools(client),
    ...createAttachmentTools(client),
    ...createAttachmentInboxTools(client),
    ...createAttachmentExtraTools(client),
    ...createArticleTools(client),
    ...createProjectTools(client),
    ...createAccountEntryTools(client),
    ...createTransactionEntryTools(client),
    ...createReportTools(client),
    ...createReportGeneratorTools(client),
    ...createDictionaryTools(client),
  };
}

export function registerMcpToolHandlers(
  server: Pick<Server, "setRequestHandler">,
  allTools: ToolRecord,
): void {
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: Object.entries(allTools).map(([name, tool]) => ({
        name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const toolCallStart = performance.now();
    const tool = allTools[name];
    if (!tool) {
      const durationMs = Math.round(performance.now() - toolCallStart);
      logger.warn(
        {
          component: "tool",
          tool: name,
          durationMs,
          outcome: "unknown_tool",
        },
        "mcp tool call",
      );
      throw new Error(`Unknown tool: ${name}`);
    }

    try {
      const result = await tool.handler(args);
      const durationMs = Math.round(performance.now() - toolCallStart);
      const outcome = "isError" in result && result.isError ? "error" : "ok";
      logger.info(
        {
          component: "tool",
          tool: name,
          durationMs,
          outcome,
        },
        "mcp tool call",
      );
      return result;
    } catch (error) {
      const durationMs = Math.round(performance.now() - toolCallStart);
      logger.info(
        {
          component: "tool",
          tool: name,
          durationMs,
          outcome: "handler_throw",
        },
        "mcp tool call",
      );
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ error: message }, null, 2),
          },
        ],
        isError: true,
      };
    }
  });
}

export async function startStdioServer(server: Pick<Server, "connect">): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info("Erply Books MCP server running on stdio");
}
