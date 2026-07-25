# Erply Books MCP Server

Open-source [Model Context Protocol](https://modelcontextprotocol.io) server for the
[Erply Books accounting API](https://www.erplybooks.com/api/).

> **Status: scaffold.** The stdio server boots with an empty tool catalog.
> Auth + HTTP client, read/write tools, and full on-site install documentation
> are landing incrementally.

## Quick start

Requires Node.js 20+.

```bash
git clone https://github.com/werkstatt-jasper/erply-books-mcp.git
cd erply-books-mcp
npm install
cp .env.example .env   # fill in ERPLY_BOOKS_API_TOKEN
npm run build
npm start              # MCP server on stdio
```

MCP client config example (Cursor / Claude Desktop):

```json
{
  "mcpServers": {
    "erply-books": {
      "command": "node",
      "args": ["/path/to/erply-books-mcp/dist/index.js"],
      "env": {
        "ERPLY_BOOKS_API_TOKEN": "your_api_token"
      }
    }
  }
}
```

Erply Books API tokens may be IP-allowlisted — the machine running the server
must be on the token's allowlist.

## Development

| Command | What it does |
|---------|--------------|
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run lint` | Biome check |
| `npm test` | Unit tests (Vitest) |
| `npm run test:coverage` | Unit tests with 100% coverage thresholds |

## License

[MIT](LICENSE)
