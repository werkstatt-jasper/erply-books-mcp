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

/** Purchase Inbox confirmation body (`APIDocumentConfirmationInfo`). */
export interface DocumentConfirmationInfo {
  id?: number;
  attachmentId?: number;
  documentId?: number;
  activityItemId?: number;
  activityItemAttachmentId?: number;
  documentStatusTypeCode?: string;
  createDatetime?: string;
  creatorUserId?: number;
  waitingForUserId?: number;
  additionalMessage?: string;
  customEmail?: string;
  sendEmail?: boolean;
  [key: string]: unknown;
}

/** Query/body fields for POST /attachments/add_purchase_order. */
export interface PurchaseOrderFromAttachmentInfo {
  customerId?: number;
  articleId?: number;
  projectId?: number;
  documentInfoId?: number;
  lang?: string;
  status?: string;
  additionalPercentage?: string;
  baseDocumentId?: number;
  currency?: string;
  ATTRIBUTE_GROSS_WEIGHT?: string;
  ATTRIBUTE_LICENCEPLATE?: string;
  ATTRIBUTE_UNLADEN_WEIGHT?: string;
  [key: string]: unknown;
}

/** Parsed Purchase Inbox document (`GET /attachments/parse/{attachmentId}`). */
export interface ParsedAttachmentInfo {
  attachmentId?: number;
  documentId?: number;
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
