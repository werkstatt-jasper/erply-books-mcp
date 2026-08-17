/** Customer/supplier row from `GET /customers`. */
export interface Customer {
  id?: number;
  name?: string;
  code?: string;
  email?: string;
  [key: string]: unknown;
}

/** Bank account row from `GET /customers/bank_accounts/{customerId}`. */
export interface CustomerBankAccount {
  id?: number;
  organisationId?: number;
  entityId?: number;
  swift?: string;
  bankIdentifier?: string;
  bankName?: string;
  accountId?: number;
  iban?: string;
  accountNumber?: string;
  ifMainAccount?: boolean;
  [key: string]: unknown;
}

/** Customer/supplier row from `POST /customers/v2` / `PUT /customers/v2/{customerId}`. */
export interface CustomerV2 {
  id?: number;
  name?: string;
  code?: string;
  email?: string;
  taxRateId?: number;
  attributes?: unknown[];
  [key: string]: unknown;
}
