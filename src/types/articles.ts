/** Article / product row from `GET /articles`. */
export interface Article {
  id?: number;
  name?: string;
  code?: string;
  type?: string;
  [key: string]: unknown;
}
