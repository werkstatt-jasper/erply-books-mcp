/** Article / product row from `/articles`. */
export interface Article {
  id?: number;
  name?: string;
  code?: string;
  type?: string;
  typeCode?: string;
  unitCode?: string;
  basePrice?: number;
  vatPercent?: number;
  taxRateId?: number;
  expenseAccountId?: number;
  assetAccountId?: number;
  revenueAccountId?: number;
  info?: string;
  [key: string]: unknown;
}
