/** Payment row from `GET /payments`. */
export interface Payment {
  id?: number;
  date?: string;
  sum?: number;
  customerId?: number;
  accountId?: number;
  documentId?: number;
  paymentType?: string;
  description?: string;
  [key: string]: unknown;
}

/** Linked document on an `APIPaymentImportInfo` (`APILinkedPaymentImportInfo`). */
export interface LinkedPaymentImportInfo {
  id?: number;
  invoiceId?: number;
  customerId?: number;
  number?: string;
  sumPaid?: number;
  sumWithVat?: number;
  sumLeftToPay?: number;
  typeCode?: string;
  description?: string;
  accountId?: number;
  projects?: number[];
  [key: string]: unknown;
}

/** Payment import / bank-match row from `POST /payments/import` and related endpoints. */
export interface PaymentImport {
  id?: number;
  paymentId?: number;
  pendingPaymentId?: number;
  date?: string;
  amount?: number;
  typeCode?: string;
  debit?: string;
  customerId?: number;
  invoiceId?: number;
  invoiceNumber?: string;
  debitAccountId?: number;
  creditAccountId?: number;
  referenceNumber?: string;
  description?: string;
  currencyCode?: string;
  reconciled?: boolean;
  importValidated?: boolean;
  linkedInvoiceInfo?: LinkedPaymentImportInfo[] | null;
  [key: string]: unknown;
}

/** Request body for `POST /payments/connect_payment_with_documents`. */
export interface ConnectPaymentWithDocumentsRequest {
  /** Pending import row id (`/payments/pending_payments` → `id`). */
  id?: number;
  /** Payment id (same value as `pendingPaymentId` on pending rows). */
  paymentId?: number;
  /** Pending payment id. */
  pendingPaymentId?: number;
  /** Invoice or document id to link (mapped into `linkedInvoiceInfo` by the tool). */
  invoiceId?: number;
  /** Invoice or document number to link (mapped into `linkedInvoiceInfo.number`). */
  invoiceNumber?: string;
  /** Documents to link; this is the list the endpoint actually reads. */
  linkedInvoiceInfo?: LinkedPaymentImportInfo[];
  customerId?: number;
  amount?: number;
  date?: string;
  typeCode?: string;
  referenceNumber?: string;
  description?: string;
  [key: string]: unknown;
}

/** SEPA / payment-file request body (`APIPaymentImportFileInfo`). */
export interface SepaPaymentRequest {
  organisationId?: number;
  id?: number;
  type?: string;
  invoiceIds?: string;
  invoiceNumbers?: string;
  invoiceSums?: string;
  dateValues?: string;
  referenceNumbers?: string;
  bankAccountId?: number;
  ibans?: string;
  [key: string]: unknown;
}
