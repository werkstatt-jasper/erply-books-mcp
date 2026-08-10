/** Tax rate row from `GET /tax_rates`. */
export interface TaxRate {
  id?: number;
  organisationId?: number;
  name?: string;
  description?: string;
  percent?: number;
  typeCode?: string;
  sales?: boolean;
  purchase?: boolean;
  partnerTaxRateId?: string | number;
  debitAccountId?: number;
  creditAccountId?: number;
  coefficient?: number;
  validToDate?: string;
  code?: string;
  [key: string]: unknown;
}
