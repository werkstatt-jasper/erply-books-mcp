/**
 * Erply Books document type codes (API Dictionary).
 * Required for `GET /invoices` via `documentType`.
 */
export const ERPLY_DOCUMENT_TYPES = [
  "DOCUMENT_SELL",
  "DOCUMENT_BUY",
  "DOCUMENT_POS_BUY",
  "DOCUMENT_POS_SELL",
  "DOCUMENT_PRE_BUY",
  "DOCUMENT_PRE_SELL",
  "DOCUMENT_BID",
  "DOCUMENT_SALES_ORDER",
  "DOCUMENT_WAYBILL",
  "DOCUMENT_PURCHASE_WAYBILL",
] as const;

export type ErplyDocumentType = (typeof ERPLY_DOCUMENT_TYPES)[number];

/** Invoice / document row from `GET /invoices`. */
export interface Invoice {
  id?: number;
  number?: string;
  documentType?: string;
  date?: string;
  customerId?: number;
  [key: string]: unknown;
}
