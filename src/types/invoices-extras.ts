/** Email body for invoice send (`APIEmailInfo`). */
export interface EmailInfo {
  sender?: string;
  senderName?: string;
  receiver?: string;
  subject?: string;
  body?: string;
  additionalTypes?: string;
  [key: string]: unknown;
}

/** Partner invoice / document (`APIPartnerInvoiceInfo`). */
export interface PartnerInvoice {
  id?: number;
  typeCode?: string;
  date?: string;
  customerId?: number;
  partnerDocumentId?: string;
  number?: string;
  [key: string]: unknown;
}

/** Recurring invoice schedule (`APIRecurringInvoiceInfo`). */
export interface RecurringInvoice {
  id?: number;
  entityId?: number;
  copyFromDocumentId?: number;
  activeFromDate?: string;
  dayOfMonth?: number;
  invoiceDayOfMonth?: number;
  sendInvoiceByEmail?: boolean;
  emailAddress?: string;
  enabled?: boolean;
  sendInvoice?: boolean;
  [key: string]: unknown;
}
