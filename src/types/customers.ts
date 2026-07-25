/** Customer/supplier row from `GET /customers`. */
export interface Customer {
  id?: number;
  name?: string;
  code?: string;
  email?: string;
  [key: string]: unknown;
}
