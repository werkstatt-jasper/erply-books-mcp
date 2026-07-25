/** Account entry / ledger line from `GET /account_entries`. */
export interface AccountEntry {
  id?: number;
  accountId?: number;
  date?: string;
  sum?: number;
  customerId?: number;
  projectId?: number;
  [key: string]: unknown;
}
