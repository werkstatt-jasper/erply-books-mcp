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
