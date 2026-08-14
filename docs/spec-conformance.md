# Spec conformance report

Verification of the implemented MCP tools against the official
[Erply Books OpenAPI spec](https://www.erplybooks.com/api-documentation)
(301 paths / 356 operations, fetched 2026-08-13) and the prose docs under
`https://www.erplybooks.com/api/*`.

**Method:** every tool's advertised `inputSchema` was dumped from `buildAllTools()`
and diffed programmatically against the spec operation it calls (method, path,
query/path params, requiredness, types, request-body `$ref`). Prose pages for
invoices, customers, payments, partner API, report generator, and custom API
access points were cross-checked manually.

**Headline result:** all 89 tools call real spec operations with the correct HTTP
method and path (zero class-A mismatches). The findings below are param/body
coverage gaps, type nits, and docs-vs-reality conflicts — not broken endpoints.

## Finding classes

| Class | Meaning | Count | Disposition |
|-------|---------|-------|-------------|
| A | Method/path not in spec | 0 | — |
| B | Spec query param not exposed by tool | 213 | intentional MVP scoping; high-value subset tracked in [#188 (E49)](https://gitlab.com/werkstatt.ee/e-financials-mcp/-/issues/188) |
| C | Tool param absent from spec | 24 | all explained (see below) |
| D | Tool stricter than spec (tool requires, spec optional) | 56 | deliberate policy (see below) |
| E | Type mismatch | 34 | 1 real issue ([#186 (E47)](https://gitlab.com/werkstatt.ee/e-financials-mcp/-/issues/186)); 33 benign |
| F | Request-body fields not advertised | 30 ops | umbrella issue [#187 (E48)](https://gitlab.com/werkstatt.ee/e-financials-mcp/-/issues/187) |
| G | Prose docs vs swagger vs observed behavior | 9 | live-verification issue [#189 (E50)](https://gitlab.com/werkstatt.ee/e-financials-mcp/-/issues/189); item 8 recorded in #191 (E52); item 9 in #192 (E53) |

## C-class details (tool params absent from spec) — all explained

- `fileBase64` / `fileName` / `files` on upload tools (`erply_create_attachment`,
  `erply_create_attachment_simple`, `erply_create_digi_*`, `erply_submit_kyc*`,
  `erply_create_purchase_order_from_attachment`, `erply_bank_import*`): MCP has no
  file upload, so tools accept base64 and convert to the multipart form the spec
  models. Intentional transport adaptation.
- `erply_bank_import_v2` (`attachmentId`, `getEverything`, `getMissing`,
  `separatorField`): the spec documents **no** params or body for
  `POST /payments/bank_import/v2` at all; the tool maps these to the
  reverse-engineered body fields `apiAttachmentInfo` / `everything` / `missing` /
  `separator`. Spec gap — live verification under #189.
- `erply_link_attachment_to_erply_invoice` (`documentId`): false positive of the
  diff — `documentId` is the path param of the PUT variant; the POST variant's
  query params (`attachmentId`, `baseDocumentIds`) match the spec.

## D-class policy (tool stricter than spec)

The spec marks **every** parameter optional in all 356 operations (no
`required: true` anywhere, no required body fields in any schema). The tools
deliberately require the fields the API actually needs to do something useful
(e.g. `dateFrom`/`dateTo` on lists and reports, `name` on creates, `documentIds`
on e-invoice sends). The prose docs confirm this is correct in at least one case:
`GET /invoices` — "Either id or documentType is always required!", which swagger
does not express. Full list in appendix D.

## E-class details (type mismatches)

- **Real issue:** `reportType` is typed `string` in `erply_list_account_entries`
  and `erply_general_ledger`, but the spec says `integer` →
  [#186 (E47)](https://gitlab.com/werkstatt.ee/e-financials-mcp/-/issues/186).
- **Benign (33):** spec types many ID query params (`customerId`, `projectId`,
  `accountId`, `articleId`, `documentId`, …) as `string`; the tools use `number`.
  Both serialize identically in query strings. No action.
- `customer` body field typed `object` in tools vs `$ref` in spec — equivalent
  after dereferencing. No action.

## G-class details (docs vs reality) — verification list for #189

1. `GET /payments`: prose says "PaymentType is required!"; the tool requires
   `dateFrom`/`dateTo` instead; swagger requires nothing.
2. `sort` vs `sortBy`: prose uses `sortBy` (`/customers`, `/payments`); swagger
   uses `sort`; tools follow swagger.
3. `GET /customers/v2`: documented ("customers have two API versions") but
   returns 405 with the current sandbox token; tool uses v1 `/customers`.
4. `POST /payments/connect_payment_with_documents`: documents must be in
   `linkedInvoiceInfo` (not top-level `invoiceId`); otherwise 409 "The list of
   documents is empty". Sparse bodies can 500 — send pending-row fields. Connect
   sets `importValidated` but does not change invoice `sumPaid`/`sumLeftToPay`
   on the demo org; use `erply_update_payment` to apply balances (#190 / E51,
   related #189 / E50).
5. `POST /payments/save_all_payments`: does not link payments to invoices (only
   updates import rows) — see README.
6. `POST /payments/bank_import/v2`: undocumented in swagger (see C-class).
7. PUT full-replace semantics: prose for `/invoices` says "All previous data is
   deleted and replaced" — update-tool descriptions should warn that `rows` must
   be resent if this holds on the live API.
8. `GET /payments/import`: not in swagger; live **405** on Demo testbaas
   (2026-08-14) with or without `dateFrom`/`dateTo`/`reconciled`/`accountId`.
   Unmatched bank-import rows are `GET /payments/pending_payments`
   (`erply_list_pending_payments`). `GET /payments` (even with
   `getEverything=true`) returns confirmed `APIPaymentInfo` records, not import
   rows. See #191 (E52).
9. `GET /attachments/all`: without `getEverything=true` the live API returns
   `totalCount: 0` even when Purchase Inbox items exist. `erply_list_attachments`
   therefore defaults `getEverything` to `true` on unfiltered calls. `documentId`
   is ignored (alone: empty; with `getEverything`: full inbox). `attachmentId`
   works only with `getEverything`. `documentStatusTypeCode` was
   `STATUS_CONFIRMED` across those inbox probes and can look request-derived.
   See #192 (E53).

## Cosmetic notes (no action)

- `erply_delete_invoice` names its path param `invoiceId`; the spec calls the same
  param `documentId`. Behavior identical.
- Path-param naming elsewhere matches the spec.

## Appendices

The full per-tool tables follow below.

---

## Appendix B — Unexposed spec query params per tool

| Tool | Count | Params |
|------|-------|--------|
| `erply_list_account_entries` | 15 | articleType (string), getByContact (boolean), taxRateId (integer), typeCode (string), detailed (boolean), description (string), idMoreThan (integer), deletedIdMoreThan (integer), showChanges (boolean), otherSideAccountIds (string), exclude (string), exclude2 (string), changedSince (integer), reportGeneratorInput (string), isCsv (boolean) |
| `erply_list_accounts` | 6 | getConsolidated (boolean), getWithSharedValue (boolean), dateForProfit (string), showOnlyIncome (boolean), layout (string), removeAutomaticTransactions (boolean) |
| `erply_list_articles` | 1 | reportGeneratorInput (string) |
| `erply_list_customers` | 2 | reportGeneratorInput (string), partnerCustomerId (string) |
| `erply_list_partner_invoices` | 25 | transactionDateFrom (string), transactionDateTo (string), documentIds (string), userId (integer), description (string), certainDocumentType (string), projectId (string), number (string), documentNumberOnly (string), sort (string), isPaidInvolved (boolean), getUnpaid (boolean), isOverdueInvolved (boolean), preventWaybills (boolean), searchUnpaidWithCertainDate (boolean), dontCalculateToLocalCurrency (boolean), showOnlyPrepayments (boolean), documentStatusType (string), showOnlyNotConfirmedPayments (boolean), changedSinceDate (string), partnerCustomerId (string), partnerDocumentId (string), detailed (boolean), getRows (boolean), reportGeneratorInput (string) |
| `erply_list_invoices` | 20 | transactionDateFrom (string), transactionDateTo (string), documentNumberOnly (string), userId (integer), description (string), certainDocumentType (string), isPaidInvolved (boolean), isOverdueInvolved (boolean), preventWaybills (boolean), searchUnpaidWithCertainDate (boolean), dontCalculateToLocalCurrency (boolean), showOnlyPrepayments (boolean), documentStatusType (string), showOnlyNotConfirmedPayments (boolean), changedSinceDate (string), partnerCustomerId (string), partnerDocumentId (string), detailed (boolean), getRows (boolean), reportGeneratorInput (string) |
| `erply_list_payments` | 10 | keyword (string), getEverything (boolean), partnerDocumentId (string), documentType (string), showOnlyPrepayments (boolean), documentStatusType (string), projectId (string), getOnlyThoseWithContact (string), reportGeneratorInput (string), changedSince (string) |
| `erply_list_projects` | 1 | reportGeneratorInput (string) |
| `erply_balance_sheet` | 17 | profitAccountsOnly (boolean), comparativeDateFrom (string), comparativeDateTo (string), getUserSpecificAccounts (boolean), getWithSharedValue (boolean), currencyCode (string), getSimpleConsolidation (boolean), projectGroupId (integer), cashFlowReport (boolean), budgetName (string), contributionMarginType (string), showBalanceSheetComponents (boolean), lang (string), layout (string), isCsv (boolean), reportType (string), addSummaries (boolean) |
| `erply_income_sheet` | 17 | profitAccountsOnly (boolean), comparativeDateFrom (string), comparativeDateTo (string), getUserSpecificAccounts (boolean), getWithSharedValue (boolean), currencyCode (string), getSimpleConsolidation (boolean), projectGroupId (integer), cashFlowReport (boolean), budgetName (string), contributionMarginType (string), showBalanceSheetComponents (boolean), lang (string), layout (string), isCsv (boolean), reportType (string), addSummaries (boolean) |
| `erply_aged_receivables` | 14 | getByContact (boolean), getEverything (boolean), typeOfPrintout (string), getOnlyPrepayments (boolean), getByTransactionDate (boolean), partnerCustomerId (string), changedSinceSeconds (integer), reportGeneratorInput (string), projectName (string), projectDescription (string), groupByProjectGroupId (integer), layout (string), start (integer), limit (integer) |
| `erply_general_ledger` | 19 | excludeAccountIds (string), getByContact (boolean), articleType (string), typeCode (string), taxRateId (integer), description (string), exclude (string), exclude2 (string), keyword (string), currencyCode (string), documentStatusType (string), mutualAccountIds (string), doNotShowTotalCount (boolean), reportGeneratorInput (string), sort (string), isCsv (boolean), layout (string), start (integer), limit (integer) |
| `erply_daybook` | 12 | transactionDateFrom (string), transactionDateTo (string), description (string), includeWithPercentValues (boolean), exclude (string), aggregate (boolean), getEverything (boolean), isAccountant (boolean), sort (string), lang (string), layout (string), isGroupByParent (boolean) |
| `erply_trial_balance` | 14 | getWithSharedValue (boolean), articleId (integer), articleType (string), typeCode (string), contactIds (string), keyword (string), taxRateId (integer), incomeType (string), description (string), exclude (string), exclude2 (string), isCsv (boolean), reportGeneratorInput (string), layout (string) |
| `erply_vat_ee` | 3 | getEverything (boolean), organisationIds (string), ignoreErrors (string) |
| `erply_contact_balance` | 20 | showOverdue (boolean), getByContact (boolean), getEverything (boolean), typeOfPrintout (string), getOnlyPrepayments (boolean), getByTransactionDate (boolean), changedSinceSeconds (integer), reportGeneratorInput (string), partnerCustomerId (string), projectName (string), projectDescription (string), groupByProjectGroupId (integer), layout (string), addBalanceAtEndOfLastPeriod (boolean), addPaymentsThisPeriodForLastPeriod (boolean), addLastPeriodInvoicesBalanceAtEndOfLastPeriod (boolean), addInvoicesFromLastPeriod (boolean), addLastPeriodPayments (boolean), addThisPeriodPayments (boolean), addLastPeriodPaymentsForLastPeriodInvoices (boolean) |
| `erply_fixed_assets` | 8 | userId (integer), description (string), documentType (string), articleRowId (string), rowType (string), articleType (string), getReimbursement (boolean), sort (string) |
| `erply_list_transaction_entries` | 9 | transactionDateFrom (string), transactionDateTo (string), transactionIds (string), getActivityInformation (boolean), includeWithPercentValues (boolean), exclude (string), activityModule (string), sort (string), lang (string) |

## Appendix D — Tool stricter than spec (tool-required, spec-optional)

| Tool | Required by tool only |
|------|---------------------|
| `erply_list_account_entries` | dateFrom, dateTo |
| `erply_create_account` | number, name |
| `erply_create_article` | name |
| `erply_delete_attachment_via_post` | id |
| `erply_create_customer` | name |
| `erply_send_invoice_email` | documentId, receiver |
| `erply_get_einvoice` | documentIds |
| `erply_send_einvoices` | documentIds |
| `erply_confirm_invoices` | ids |
| `erply_list_partner_invoices` | dateFrom, dateTo |
| `erply_create_partner_invoice` | typeCode, date |
| `erply_create_recurring_invoice` | copyFromDocumentId |
| `erply_list_invoices` | dateFrom, dateTo, documentType |
| `erply_create_invoice` | typeCode, date |
| `erply_import_payment` | date, amount, typeCode |
| `erply_save_all_payment_imports` | items |
| `erply_list_payments` | dateFrom, dateTo |
| `erply_create_payment` | opDate, sumPaid |
| `erply_create_project` | name |
| `erply_balance_sheet` | dateFrom, dateTo |
| `erply_income_sheet` | dateFrom, dateTo |
| `erply_aged_receivables` | dateFrom, dateTo |
| `erply_general_ledger` | dateFrom, dateTo |
| `erply_daybook` | dateFrom, dateTo |
| `erply_trial_balance` | dateFrom, dateTo |
| `erply_vat_ee` | dateFrom, dateTo |
| `erply_contact_balance` | dateFrom, dateTo |
| `erply_fixed_assets` | dateFrom, dateTo |
| `erply_create_tax_rate` | name, percent |
| `erply_list_transaction_entries` | dateFrom, dateTo |
| `erply_create_transaction_entry` | opDate, typeCode, accountEntries |

## Appendix F — Request-body field coverage

| Tool | Body schema | Advertised | Unexposed fields (accepted via passthrough) |
|------|-------------|-----------|----------------------------------------------|
| `erply_create_account` | `APIAccountInfo` | 9/15 | id, organisationId, partnerAccountId, lockingDatetime, closingBalance, displayName |
| `erply_update_account` | `APIAccountInfo` | 9/15 | id, organisationId, partnerAccountId, lockingDatetime, closingBalance, displayName |
| `erply_create_article` | `APIArticleInfo` | 14/18 | id, debitTurnover, creditTurnover, costOfGoodsSold |
| `erply_update_article` | `APIArticleInfo` | 14/18 | id, debitTurnover, creditTurnover, costOfGoodsSold |
| `erply_create_digi_base64` | `APIAttachmentInfo` | 0/21 | id, documentId, attachmentId, partnerDocumentId, attributeId, folder, typeCode, filename, base64, number, contactName, expenseType, netTotal, taxSum, taxRateId, total, date, description, organisationId, exceptionInfo, attribute |
| `erply_get_digi_country_from_parser` | `APIDictionaryValueInfo` | 2/2 | — |
| `erply_submit_kyc_json` | `APIAttachmentInfo` | 2/21 | id, attachmentId, partnerDocumentId, attributeId, folder, typeCode, filename, base64, number, contactName, expenseType, netTotal, taxSum, taxRateId, total, date, organisationId, exceptionInfo, attribute |
| `erply_confirm_attachment` | `APIDocumentConfirmationInfo` | 12/12 | — |
| `erply_create_attachment` | `APIAttachmentInfo` | 12/21 | id, attachmentId, attributeId, filename, base64, number, organisationId, exceptionInfo, attribute |
| `erply_create_customer` | `APICustomerInfo` | 10/37 | id, legalCountryCode, legalPostcode, deadlineDays, discount, penalty, referenceNumber, supplierReferenceNumber, actualAddress, actualPostcode, actualCountryCode, phone2, fax, website, contactPersonId, contactPersonName, contactPersonEmail, contactPersonPhone, info, partnerCustomerId, partnerSupplierId, bankName, bankAccountNumber, bankIban, bankSwift, bankIdentificator, attributes |
| `erply_update_customer` | `APICustomerInfo` | 11/37 | id, legalCountryCode, legalPostcode, discount, penalty, referenceNumber, supplierReferenceNumber, actualAddress, actualPostcode, actualCountryCode, phone2, fax, website, contactPersonId, contactPersonName, contactPersonEmail, contactPersonPhone, info, partnerCustomerId, partnerSupplierId, bankName, bankAccountNumber, bankIban, bankSwift, bankIdentificator, attributes |
| `erply_send_invoice_email` | `APIEmailInfo` | 6/7 | id |
| `erply_create_partner_invoice` | `APIPartnerInvoiceInfo` | 9/50 | id, customerName, discountPercent, languageCode, vatPercent, referenceNumber, deadlineDate, creatorName, modifierName, sumNoVat, taxSum, sumWithVat, sumPaid, sumLeftToPay, invoiceTextsInfoId, penaltyPercent, roundedSum, vatTotalRoundedSum, currencyRate, hash, code, transactionDate, note, printedInfo, referringIdentifier, actionId, activityId, documentStatusTypeCode, vatTotalsByTaxRate, discountSum, projects, projectNames, payments, attachments, payer, payerName, payerCustomerId, documentConnections, username, attributes, history |
| `erply_create_recurring_invoice` | `APIRecurringInvoiceInfo` | 9/11 | id, articles |
| `erply_update_recurring_invoice` | `APIRecurringInvoiceInfo` | 9/11 | id, articles |
| `erply_create_invoice` | `APIInvoiceInfo` | 11/42 | id, customerName, discountPercent, languageCode, creatorName, modifierName, sumNoVat, taxSum, sumWithVat, sumPaid, sumLeftToPay, invoiceTextsInfoId, penaltyPercent, roundedSum, vatTotalRoundedSum, currencyRate, hash, code, transactionDate, note, printedInfo, referringIdentifier, actionId, partnerDocumentId, activityId, documentStatusTypeCode, vatTotalsByTaxRate, discountSum, payments, attachments, history |
| `erply_update_invoice` | `APIInvoiceInfo` | 7/42 | id, customerName, discountPercent, languageCode, vatPercent, referenceNumber, deadlineDate, creatorName, modifierName, sumNoVat, taxSum, sumWithVat, sumPaid, sumLeftToPay, invoiceTextsInfoId, penaltyPercent, roundedSum, vatTotalRoundedSum, currencyRate, hash, code, transactionDate, note, printedInfo, referringIdentifier, actionId, partnerDocumentId, activityId, documentStatusTypeCode, vatTotalsByTaxRate, discountSum, payments, attachments, customer, history |
| `erply_import_payment` | `APIPaymentImportInfo` | 16/51 | id, paymentId, archivingId, rawDateValue, beneficiaryRemitterAccount, beneficiaryRemitterName, beneficiaryRemitterBankCode, beneficiaryRemitterId, employeeId, importValidated, category, checkNumber, linkedInvoiceInfo, linkedDescription, invoiceSum, transactionEntryId, pendingChequePaymentId, projects, partnerAccountId, currencyRate, taxRateId, vatPercent, yellow, oldImportDetails, code, parentPaymentId, activityItems, reconciledItems, pendingPaymentId, uiType, partnerPaymentId, attachmentId, initialCurrencyCode, howConnectionWasDone, errorMessage |
| `erply_save_all_payment_imports` | `APIPaymentImportListInfo` | 1/1 | — |
| `erply_connect_payment_with_documents` | `APIPaymentImportInfo` | 12/51 | archivingId, rawDateValue, beneficiaryRemitterAccount, beneficiaryRemitterName, beneficiaryRemitterBankCode, debit, currencyCode, beneficiaryRemitterId, employeeId, debitAccountId, creditAccountId, importValidated, category, checkNumber, linkedDescription, invoiceSum, transactionEntryId, findCustomerMatch, pendingChequePaymentId, projectId, projects, partnerAccountId, currencyRate, calculateCurrencyRate, taxRateId, vatPercent, yellow, oldImportDetails, reconciled, code, parentPaymentId, activityItems, reconciledItems, uiType, partnerPaymentId, attachmentId, initialCurrencyCode, howConnectionWasDone, errorMessage |
| `erply_sepa_payments` | `APIPaymentImportFileInfo` | 11/25 | id, invoiceCustomers, memos, customerNames, addRefNrSeparately, erplyClientCode, erplySessionKey, useBban, paymentUrgency, chargesBearer, invoiceDiscounts, doNotAdd, doNotAddSameContactDocuments, code2fa |
| `erply_bank_import_v2` | `APIBankImportInfo` | 7/12 | id, apiAttachmentInfo, everything, missing, separator |
| `erply_create_payment` | `APIPaymentInfo` | 11/29 | id, transactionIdentifier, transactionEntryId, sumWithVat, customerName, number, archivingId, code, badDebt, partnerPaymentId, partnerDocumentId, imported, documentStatusTypeCode, statusChangeDatetime, currencyRate, projects, entityName, parentPaymentId |
| `erply_update_payment` | `APIPaymentInfo` | 9/29 | id, transactionIdentifier, transactionEntryId, sumWithVat, customerName, number, archivingId, code, badDebt, partnerPaymentId, originalSum, partnerDocumentId, imported, documentStatusTypeCode, statusChangeDatetime, currencyRate, projects, projectId, entityName, parentPaymentId |
| `erply_create_project` | `APIProjectInfo` | 9/12 | id, organisationId, projectGroupName |
| `erply_update_project` | `APIProjectInfo` | 9/12 | id, organisationId, projectGroupName |
| `erply_create_tax_rate` | `APITaxRateInfo` | 18/20 | id, organisationId |
| `erply_update_tax_rate` | `APITaxRateInfo` | 18/20 | id, organisationId |
| `erply_create_transaction_entry` | `APITransactionEntryInfo` | 10/13 | id, projects, history |
| `erply_update_transaction_entry` | `APITransactionEntryInfo` | 10/13 | id, projects, history |

