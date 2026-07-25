/** Chart-of-accounts row from `GET /accounts`. */
export interface Account {
  id?: number;
  organisationId?: number;
  number?: string;
  name?: string;
  notActive?: boolean;
  typeCode?: string;
  description?: string;
  currencyCode?: string;
  displayName?: string;
  [key: string]: unknown;
}
