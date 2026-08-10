/** Attachment row from Erply Books `/attachments` (`APIAttachmentInfo`). */
export interface Attachment {
  id?: number;
  attachmentId?: number;
  documentId?: number;
  partnerDocumentId?: string;
  attributeId?: number;
  folder?: string;
  typeCode?: string;
  filename?: string;
  base64?: string;
  number?: string;
  contactName?: string;
  expenseType?: string;
  netTotal?: number;
  taxSum?: number;
  taxRateId?: number;
  total?: number;
  date?: string;
  description?: string;
  organisationId?: number;
  exceptionInfo?: string;
  [key: string]: unknown;
}

/** Bank import v2 body (`APIBankImportInfo`). */
export interface BankImportInfo {
  id?: number;
  apiAttachmentInfo?: Attachment;
  encoding?: string;
  calculateCurrency?: boolean;
  dateFormatCode?: string;
  type?: string;
  everything?: boolean;
  accountId?: number;
  missing?: boolean;
  separator?: string;
  detectDateFormatAutomatically?: boolean;
  includeHeader?: boolean;
  [key: string]: unknown;
}
