# Erply Books MCP Server

Open-source [Model Context Protocol](https://modelcontextprotocol.io) server for the
[Erply Books accounting API](https://www.erplybooks.com/api/).

> **Status: read-tools MVP.** Auth, HTTP client, and `erply_`-prefixed read tools
> for organisation, master data, invoices/payments, ledger/transactions, and core
> reports are available. Write tools and fuller on-site docs land in later milestones.

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
| `erply_list_articles` | `GET /articles` | Optional keyword/type/prices |
| `erply_list_projects` | `GET /projects` | Optional keyword/group filters |
| `erply_list_account_entries` | `GET /account_entries` | Requires dates; may 409 `MODULE_LEDGER` |
| `erply_list_transaction_entries` | `GET /transaction_entries` | Requires dates; optional `typeCode`; may 409 |
| `erply_get_transaction_entry` | `GET /transaction_entries/{id}` | Optional `lang` |
| `erply_balance_sheet` | `GET /reports/balance_sheet` | Requires dates; some orgs 500 |
| `erply_income_sheet` | `GET /reports/income_sheet` | Requires dates; some orgs 500 |
| `erply_aged_receivables` | `GET /reports/aged` | Requires dates; may 409 plan module |
| `erply_general_ledger` | `GET /reports/general_ledger` | Requires dates; some orgs 500 |

List tools return `{ totalCount, items }` (the repeated `organisation` blob is stripped).
Report tools return the API JSON as-is. Document/transaction type codes come from the
[API Dictionary](https://www.erplybooks.com/api-dictionary/)
(e.g. `DOCUMENT_SELL`, `DOCUMENT_POS_SELL`, `INVOICE_TRANSACTION`).

Out of scope for this MVP: daybook, report-generator POST flows, and supplier-only
report modules.

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
