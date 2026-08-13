/** Report-generator parameter rule (`APIReportGeneratorComponentInfo`). */
export interface CustomReportParameterRule {
  fieldName?: string;
  filterName?: string;
  referenceType?: string;
  tableName?: string;
  value?: string;
  [key: string]: unknown;
}

/** Report-generator parameter (`APIReportGeneratorParameterInfo`). */
export interface CustomReportParameter {
  index?: number;
  rules?: CustomReportParameterRule[];
  [key: string]: unknown;
}

/** Custom report request body (`APIReportGeneratorInfo`). */
export interface CustomReportRequest {
  tables?: string;
  output?: string;
  outputLayout?: string;
  groupBy?: string;
  groupByFinal?: string;
  reportName?: string;
  dateFrom?: string;
  dateTo?: string;
  groupByOnDBLevel?: boolean;
  parameters?: CustomReportParameter[];
  additionalColumns?: string;
  orderBy?: string;
  orderByField?: string;
  summaryRowField?: string;
  useDistinct?: boolean;
  customQueryAttribute?: string;
  start?: number;
  limit?: number;
  emailInfo?: Record<string, unknown>;
  updateInfo?: Record<string, unknown>;
  additionalParams?: Record<string, unknown>;
  callback?: Record<string, unknown>;
  chart?: Record<string, unknown>;
  [key: string]: unknown;
}

/** File-oriented report request (`APIRequestForReportGeneratorInfo`). */
export interface CustomReportFileRequest {
  type?: string;
  doNotAddHeader?: boolean;
  dateFrom?: string;
  dateTo?: string;
  projectId?: string;
  baseInfo?: string;
  fileName?: string;
  encoding?: string;
  activityId?: number;
  [key: string]: unknown;
}

/** Batch custom reports (`APIReportGeneratorFullInfo`). */
export interface CustomReportBatchRequest {
  id?: number;
  items?: CustomReportRequest[];
  totalCount?: number;
  [key: string]: unknown;
}

/** Saved user-defined report definition. */
export interface UserDefinedReport {
  id?: number;
  reportName?: string;
  [key: string]: unknown;
}

/** Report-generator column metadata from `GET /report_generator/columns`. */
export interface CustomReportColumn {
  fieldName?: string;
  tableName?: string;
  [key: string]: unknown;
}
