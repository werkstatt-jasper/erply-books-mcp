/** Activity item / custom attribute from `GET /attributes` and `POST /attributes`. */
export interface ActivityItem {
  id?: number;
  typeCode?: string;
  name?: string;
  value?: string;
  description?: string;
  entityId?: number;
  [key: string]: unknown;
}

/** Activity item from the v2 attributes endpoints. */
export interface ActivityItemV2 {
  id?: number;
  typeCode?: string;
  name?: string;
  value?: string;
  description?: string;
  entityId?: number;
  [key: string]: unknown;
}
