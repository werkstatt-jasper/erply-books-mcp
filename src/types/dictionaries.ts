/** Known Erply Books dictionary codes for `GET /settings/dictionaries/{dictionaryCode}`. */
export const ERPLY_DICTIONARY_CODES = [
  "ACCOUNT_TYPE",
  "TRANSACTION_TYPE",
  "INCOME_TYPE",
  "BALANCE_TYPE",
  "ACCOUNT_FEATURE_TYPE",
  "DOCUMENT_TYPE",
  "ENTITY_TYPE",
  "ARTICLE_TYPE",
  "UNIT",
  "PAYMENT_TYPE",
  "ARTICLE_ROW_TYPE",
  "CURRENCY",
  "CASH_FLOW_TYPE",
  "ARTICLE_FEATURE_TYPE",
  "TAX_RATE_TYPE",
  "DOCUMENT_STATUS_TYPE",
  "LANGUAGE",
] as const;

export type ErplyDictionaryCode = (typeof ERPLY_DICTIONARY_CODES)[number];

/** Loose entry from a dictionary lookup response. */
export interface DictionaryEntry {
  code?: string;
  name?: string;
  [key: string]: unknown;
}
