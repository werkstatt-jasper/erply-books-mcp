/**
 * Common TRANSACTION_TYPE dictionary codes (API Dictionary).
 * Optional filter for `GET /transaction_entries` via `typeCode`.
 */
export const ERPLY_TRANSACTION_TYPES = [
  "INVOICE_TRANSACTION",
  "PURCHASE_INVOICE_TRANSACTION",
  "PAYMENT_TRANSACTION",
  "DIRECT_TRANSACTION",
  "SALARY_TRANSACTION",
  "VACATION_TRANSACTION",
  "AUTOMATIC_TRANSACTION",
  "MONEY_OUT_TRANSACTION",
  "MONEY_IN_TRANSACTION",
  "REVENUE_TAXES_TRANSACTION",
  "DEPRECIATION_TRANSACTION",
  "SALARY_TAXES_TRANSACTION",
] as const;

export type ErplyTransactionType = (typeof ERPLY_TRANSACTION_TYPES)[number];

/** Ledger line on a transaction entry (`APIAccountEntryFullInfoV2`). */
export interface TransactionAccountEntry {
  id?: number;
  accountId?: number;
  accountNumber?: string;
  description?: string;
  debitSum?: number;
  creditSum?: number;
  projectId?: number;
  taxRateId?: number;
  [key: string]: unknown;
}

/** Journal / transaction entry from `/transaction_entries`. */
export interface TransactionEntry {
  id?: number;
  opDate?: string;
  date?: string;
  typeCode?: string;
  description?: string;
  sum?: number;
  projectId?: number;
  documentId?: number;
  taxRateId?: number;
  percent?: number;
  code?: string;
  documentStatusTypeCode?: string;
  accountEntries?: TransactionAccountEntry[];
  [key: string]: unknown;
}
