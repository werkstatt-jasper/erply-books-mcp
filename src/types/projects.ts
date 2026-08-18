/** Project row from `/projects`. */
export interface Project {
  id?: number;
  organisationId?: number;
  name?: string;
  description?: string;
  isAffirmed?: boolean;
  affirmed?: boolean;
  projectGroupId?: number;
  projectGroupName?: string;
  validFromDatetime?: string;
  validToDatetime?: string;
  mainProjectId?: number;
  syncErplyUsers?: boolean;
  [key: string]: unknown;
}

/** Project group row from `/projects/groups` (`APIProjectGroupInfo`). */
export interface ProjectGroup {
  id?: number;
  organisationId?: number;
  name?: string;
  [key: string]: unknown;
}
