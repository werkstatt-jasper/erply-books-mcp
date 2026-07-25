import { createRequire } from "node:module";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";

import { loadAuthConfig } from "./auth.js";
import { ErplyBooksClient } from "./client.js";
import { buildAllTools, registerMcpToolHandlers, startStdioServer } from "./server-setup.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };

export async function startApp(): Promise<void> {
  const apiClient = new ErplyBooksClient(loadAuthConfig);
  const allTools = buildAllTools(apiClient);
  const server = new Server({ name: "erply-books", version }, { capabilities: { tools: {} } });
  registerMcpToolHandlers(server, allTools);
  await startStdioServer(server);
}
