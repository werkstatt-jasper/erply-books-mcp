/** Project row from `GET /projects`. */
export interface Project {
  id?: number;
  name?: string;
  isAffirmed?: boolean;
  projectGroupId?: number;
  [key: string]: unknown;
}
