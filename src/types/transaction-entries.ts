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

/** Journal / transaction entry from `GET /transaction_entries`. */
export interface TransactionEntry {
  id?: number;
  typeCode?: string;
  date?: string;
  description?: string;
  projectId?: number;
  documentId?: number;
  [key: string]: unknown;
}
