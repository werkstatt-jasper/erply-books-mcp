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

/** Invoice text/template row (`APIDocumentTextsInfo`). */
export interface InvoiceTemplate {
  id?: number;
  documentName?: string | null;
  languageCode?: string;
  templateId?: string;
  [key: string]: unknown;
}

/** Next-number / existence check row (`APIInvoiceInitialData`). */
export interface InvoiceInitialData {
  id?: number;
  number?: string;
  customerId?: number;
  exists?: boolean;
  typeCode?: string | null;
  date?: string | null;
  existingDocumentId?: number;
  [key: string]: unknown;
}

/** Document history row from `GET /invoices/history`. */
export interface InvoiceHistoryEntry {
  id?: number;
  typeCode?: string;
  origin?: string;
  identifier?: number;
  userId?: number;
  date?: string;
  edit?: string;
  username?: string;
  queueId?: number;
  [key: string]: unknown;
}
