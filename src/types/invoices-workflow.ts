/** Nested invoice blob on `APIInvoiceWithComponentsInfo`. */
export interface InvoiceWithComponentsInvoice {
  id?: number;
  typeCode?: string;
  date?: string;
  customerId?: number;
  [key: string]: unknown;
}

/**
 * Opposite-document payload (`APIInvoiceWithComponentsInfo`) for
 * `POST /invoices/add_opposite`.
 */
export interface InvoiceWithComponents {
  id?: number;
  invoice?: InvoiceWithComponentsInvoice;
  rows?: Record<string, unknown>[];
  payments?: Record<string, unknown>[];
  customer?: Record<string, unknown>;
  payer?: Record<string, unknown>;
  shipToCustomer?: Record<string, unknown>;
  attachment?: Record<string, unknown>;
  invoiceVerified?: boolean;
  parseSuccessful?: boolean;
  checkBatches?: boolean;
  apimetaDataInfo?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Row-split payload (`APIInvoiceRowSplittingInfo`) for
 * `POST /invoices/split_rows` and `PUT /invoices/split_rows/{documentId}`.
 */
export interface InvoiceRowSplitting {
  invoiceId?: number;
  documentStatusTypeCode?: string;
  oldRows?: Record<string, unknown>[];
  newRows?: Record<string, unknown>[];
  [key: string]: unknown;
}

/**
 * Partner invoice update/delete payload (`APIPartnerInvoiceInfo`).
 * Create uses the same shape via `erply_create_partner_invoice`.
 */
export interface PartnerInvoiceWorkflow {
  id?: number;
  typeCode?: string;
  date?: string;
  customerId?: number;
  partnerDocumentId?: string;
  rows?: Record<string, unknown>[];
  [key: string]: unknown;
}

/** Swagger body for `POST /invoices/delete_multiple_and_payments`. */
export interface DictionaryValueInfo {
  code?: string;
  name?: string;
  [key: string]: unknown;
}
