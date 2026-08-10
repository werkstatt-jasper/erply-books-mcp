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

/** Payment import / bank-match row from `POST /payments/import` and related endpoints. */
export interface PaymentImport {
  id?: number;
  paymentId?: number;
  date?: string;
  amount?: number;
  typeCode?: string;
  debit?: string;
  customerId?: number;
  invoiceId?: number;
  debitAccountId?: number;
  creditAccountId?: number;
  referenceNumber?: string;
  description?: string;
  currencyCode?: string;
  reconciled?: boolean;
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
