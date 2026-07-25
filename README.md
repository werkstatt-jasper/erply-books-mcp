# Erply Books MCP Server

Open-source [Model Context Protocol](https://modelcontextprotocol.io) server for the
[Erply Books accounting API](https://www.erplybooks.com/api/).

> **Status: read-tools MVP.** Auth, HTTP client, and `erply_`-prefixed read tools
> for organisation / accounts / customers / invoices / payments are available.
> Write tools and fuller on-site docs land in later milestones.

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

## Tools (MVP)

| Tool | API | Notes |
|------|-----|-------|
| `erply_get_organisation` | `GET /organisation` | Org bound to the token |
| `erply_list_accounts` | `GET /accounts` | Optional `start`/`limit`/filters |
| `erply_list_customers` | `GET /customers` | `/customers/v2` returns 405 |
| `erply_list_invoices` | `GET /invoices` | Requires `dateFrom`, `dateTo`, `documentType` |
| `erply_get_invoice` | `GET /invoices/{id}` | Requires `documentId` |
| `erply_list_payments` | `GET /payments` | Requires `dateFrom`/`dateTo`; some price plans return 409 |

List tools return `{ totalCount, items }` (the repeated `organisation` blob is stripped).
Document type codes come from the [API Dictionary](https://www.erplybooks.com/api-dictionary/)
(e.g. `DOCUMENT_SELL`, `DOCUMENT_BUY`, `DOCUMENT_POS_SELL`).

## Development

| Command | What it does |
|---------|--------------|
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run lint` | Biome check |
| `npm test` | Unit tests (Vitest) |
| `npm run test:coverage` | Unit tests with 100% coverage thresholds |
| `npm run test:integration` | Live API tests (requires `.env` token; not run in CI) |

## License

[MIT](LICENSE)
