import { z } from "zod";

import type { ErplyBooksClient } from "../client.js";
import type { CustomReportFileRequest, CustomReportRequest } from "../types/reports.js";
import {
  optionalBoolean,
  optionalNonNegativeInt,
  optionalPositiveInt,
  optionalString,
  parseToolArgs,
} from "../validation/tool-args.js";
import { bytesToolResult, jsonToolResult, mutationToolResult } from "./list-response.js";

const objectRecord = z.record(z.string(), z.unknown());

const parameterSchema = z
  .object({
    index: optionalNonNegativeInt,
    rules: z
      .array(objectRecord)
      .nullish()
      .transform((v) => v ?? undefined),
  })
  .passthrough();

const emailInfoSchema = z
  .object({
    receiver: optionalString,
    subject: optionalString,
    body: optionalString,
    sender: optionalString,
    senderName: optionalString,
    additionalTypes: optionalString,
  })
  .passthrough();

const generatorBodySchema = z
  .object({
    tables: optionalString,
    output: optionalString,
    outputLayout: optionalString,
    groupBy: optionalString,
    groupByFinal: optionalString,
    reportName: optionalString,
    dateFrom: optionalString,
    dateTo: optionalString,
    groupByOnDBLevel: optionalBoolean,
    additionalParams: objectRecord.nullish().transform((v) => v ?? undefined),
    parameters: z
      .array(parameterSchema)
      .nullish()
      .transform((v) => v ?? undefined),
    additionalColumns: optionalString,
    orderBy: optionalString,
    orderByField: optionalString,
    summaryRowField: optionalString,
    useDistinct: optionalBoolean,
    emailInfo: emailInfoSchema.nullish().transform((v) => v ?? undefined),
    updateInfo: objectRecord.nullish().transform((v) => v ?? undefined),
    customQueryAttribute: optionalString,
    start: optionalNonNegativeInt,
    limit: optionalPositiveInt,
    callback: objectRecord.nullish().transform((v) => v ?? undefined),
    chart: objectRecord.nullish().transform((v) => v ?? undefined),
  })
  .passthrough();

const runQuerySchema = {
  getAllProjects: optionalBoolean,
  projectId: optionalPositiveInt,
  type: optionalString,
};

const runCustomReportSchema = generatorBodySchema.extend(runQuerySchema);

const fileRequestSchema = z
  .object({
    type: optionalString,
    doNotAddHeader: optionalBoolean,
    dateFrom: optionalString,
    dateTo: optionalString,
    projectId: optionalString,
    baseInfo: optionalString,
    fileName: optionalString,
    encoding: optionalString,
    activityId: optionalPositiveInt,
  })
  .passthrough();

const fileJsonSchema = generatorBodySchema.extend({
  type: z.string().min(1),
  fileName: optionalString,
  encoding: optionalString,
  activityId: optionalPositiveInt,
  projectId: optionalPositiveInt,
});

const columnsSchema = z.object({
  lang: optionalString,
  tables: optionalString,
});

const contactInvoiceSchema = z.object({
  projectId: optionalPositiveInt,
  articleId: optionalPositiveInt,
  number: optionalString,
  contactId: optionalPositiveInt,
  showSales: optionalBoolean,
  reportGeneratorInput: optionalString,
  month: optionalPositiveInt,
  year: optionalPositiveInt,
});

const userDefinedSchema = z.object({
  dateFrom: optionalString,
  dateTo: optionalString,
  comparativeDateFrom: optionalString,
  comparativeDateTo: optionalString,
  projectId: optionalPositiveInt,
  attribute1: optionalString,
  attribute2: optionalString,
  attribute3: optionalString,
  attribute4: optionalString,
  cashFlowReport: optionalBoolean,
});

const xmlSchema = z.object({
  type: optionalString,
  fileName: optionalString,
  encoding: optionalString,
  activityId: optionalPositiveInt,
  id: optionalPositiveInt,
  dateFrom: optionalString,
  dateTo: optionalString,
  projectId: optionalPositiveInt,
  parameters: optionalString,
});

const getFileSchema = z.object({
  type: z.string().min(1),
  fileName: optionalString,
  encoding: optionalString,
  activityId: optionalPositiveInt,
  dateFrom: optionalString,
  dateTo: optionalString,
  projectId: optionalPositiveInt,
  parameters: optionalString,
});

const multipleSchema = z
  .object({
    items: z.array(objectRecord).min(1),
    id: optionalPositiveInt,
    totalCount: optionalNonNegativeInt,
    dateFrom: optionalString,
    dateTo: optionalString,
    ...runQuerySchema,
  })
  .passthrough();

const editSchema = z
  .object({
    id: optionalPositiveInt,
    activityId: optionalPositiveInt,
    idFieldName: optionalString,
    getRequestOrUrl: optionalString,
    postRequestOrUrl: optionalString,
    putRequestOrUrl: optionalString,
    deleteRequestOrUrl: optionalString,
    editConfirmed: optionalBoolean,
    saveAllFields: optionalBoolean,
    generatorInfo: objectRecord.nullish().transform((v) => v ?? undefined),
  })
  .passthrough();

const updateValuesSchema = generatorBodySchema;

function splitRunQuery(args: z.infer<typeof runCustomReportSchema>): {
  query: Record<string, string | number | boolean | undefined>;
  body: CustomReportRequest;
} {
  const { getAllProjects, projectId, type, ...body } = args;
  return {
    query: {
      dateFrom: args.dateFrom,
      dateTo: args.dateTo,
      getAllProjects,
      projectId,
      type,
    },
    body,
  };
}

const generatorInputProperties = {
  tables: {
    type: "string" as const,
    description: "Comma-separated table names (see GET /report_generator/columns)",
  },
  output: { type: "string" as const, description: "Output format / layout code" },
  outputLayout: { type: "string" as const },
  groupBy: { type: "string" as const },
  groupByFinal: { type: "string" as const },
  reportName: { type: "string" as const },
  dateFrom: { type: "string" as const, description: "Start date (ISO or YYYY-MM-DD)" },
  dateTo: { type: "string" as const, description: "End date (ISO or YYYY-MM-DD)" },
  groupByOnDBLevel: { type: "boolean" as const },
  parameters: {
    type: "array" as const,
    description: "APIReportGeneratorParameterInfo list ({ index, rules })",
    items: { type: "object" as const },
  },
  additionalColumns: { type: "string" as const },
  orderBy: { type: "string" as const },
  orderByField: { type: "string" as const },
  summaryRowField: { type: "string" as const },
  useDistinct: { type: "boolean" as const },
  emailInfo: {
    type: "object" as const,
    description: "APIEmailInfo (receiver, subject, body, sender, senderName)",
  },
  updateInfo: { type: "object" as const },
  additionalParams: { type: "object" as const },
  customQueryAttribute: { type: "string" as const },
  start: { type: "number" as const },
  limit: { type: "number" as const },
  callback: { type: "object" as const },
  chart: { type: "object" as const },
  getAllProjects: { type: "boolean" as const },
  projectId: { type: "number" as const },
  type: { type: "string" as const, description: "Report type / file type code" },
};

const fileRequestProperties = {
  type: { type: "string" as const, description: "File/report type code" },
  doNotAddHeader: { type: "boolean" as const },
  dateFrom: { type: "string" as const },
  dateTo: { type: "string" as const },
  projectId: { type: "string" as const },
  baseInfo: { type: "string" as const },
  fileName: { type: "string" as const },
  encoding: { type: "string" as const },
  activityId: { type: "number" as const },
};

export function createReportGeneratorTools(client: ErplyBooksClient) {
  return {
    erply_run_custom_report: {
      description:
        "Run a custom report (POST /report_generator). Body is APIReportGeneratorInfo (tables, parameters, output, groupBy, dates, …). Query: dateFrom, dateTo, getAllProjects, projectId, type. Extra fields may be passed through. Some plans return HTTP 409.",
      inputSchema: {
        type: "object" as const,
        properties: generatorInputProperties,
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(runCustomReportSchema, params);
        const { query, body } = splitRunQuery(args);
        const result = await client.post<CustomReportRequest>("/report_generator", body, query);
        return mutationToolResult(result);
      },
    },

    erply_run_custom_report_csv: {
      description:
        "Run a custom report as CSV (POST /report_generator/csv). Body is APIRequestForReportGeneratorInfo. Returns JSON if the API does, otherwise UTF-8 text or base64. Some plans return HTTP 409.",
      inputSchema: {
        type: "object" as const,
        properties: fileRequestProperties,
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(fileRequestSchema, params) as CustomReportFileRequest;
        const bytes = await client.postBytes("/report_generator/csv", args);
        return bytesToolResult(bytes);
      },
    },

    erply_run_custom_report_xlsx: {
      description:
        "Run a custom report as XLSX (POST /report_generator/xlsx). Body is APIRequestForReportGeneratorInfo. Binary responses are returned as base64. Some plans return HTTP 409.",
      inputSchema: {
        type: "object" as const,
        properties: fileRequestProperties,
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(fileRequestSchema, params) as CustomReportFileRequest;
        const bytes = await client.postBytes("/report_generator/xlsx", args);
        return bytesToolResult(bytes);
      },
    },

    erply_run_custom_report_excel: {
      description:
        "Run a custom Excel report (POST /report_generator/custom_excel). Optional APIRequestForReportGeneratorInfo fields may be passed through. Some plans return HTTP 409.",
      inputSchema: {
        type: "object" as const,
        properties: fileRequestProperties,
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(fileRequestSchema, params) as CustomReportFileRequest;
        const body = Object.keys(args).length > 0 ? args : undefined;
        const bytes = await client.postBytes("/report_generator/custom_excel", body);
        return bytesToolResult(bytes);
      },
    },

    erply_send_custom_report_email: {
      description:
        "Email a custom report (POST /report_generator/email). Body is APIReportGeneratorInfo; include emailInfo.receiver. Query: dateFrom, dateTo, getAllProjects, projectId, type.",
      inputSchema: {
        type: "object" as const,
        properties: generatorInputProperties,
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(runCustomReportSchema, params);
        const { query, body } = splitRunQuery(args);
        const result = await client.post("/report_generator/email", body, query);
        return mutationToolResult(result);
      },
    },

    erply_send_custom_report: {
      description:
        "Send a custom report (POST /report_generator/send_report). Body is APIReportGeneratorInfo. Query: dateFrom, dateTo, getAllProjects, activityId, projectId, type.",
      inputSchema: {
        type: "object" as const,
        properties: {
          ...generatorInputProperties,
          activityId: { type: "number" as const },
        },
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(
          runCustomReportSchema.extend({ activityId: optionalPositiveInt }),
          params,
        );
        const { activityId, getAllProjects, projectId, type, ...body } = args;
        const result = await client.post("/report_generator/send_report", body, {
          dateFrom: args.dateFrom,
          dateTo: args.dateTo,
          getAllProjects,
          activityId,
          projectId,
          type,
        });
        return mutationToolResult(result);
      },
    },

    erply_run_custom_reports_multiple: {
      description:
        "Run multiple custom reports (POST /report_generator/multiple). Body is APIReportGeneratorFullInfo ({ items: [...] }). Query: dateFrom, dateTo, getAllProjects, projectId, type.",
      inputSchema: {
        type: "object" as const,
        properties: {
          items: {
            type: "array" as const,
            description: "APIReportGeneratorInfo objects (required, non-empty)",
            items: { type: "object" as const },
          },
          id: { type: "number" as const },
          totalCount: { type: "number" as const },
          dateFrom: { type: "string" as const },
          dateTo: { type: "string" as const },
          getAllProjects: { type: "boolean" as const },
          projectId: { type: "number" as const },
          type: { type: "string" as const },
        },
        required: ["items"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(multipleSchema, params);
        const { getAllProjects, projectId, type, dateFrom, dateTo, ...body } = args;
        const result = await client.post("/report_generator/multiple", body, {
          dateFrom,
          dateTo,
          getAllProjects,
          projectId,
          type,
        });
        return mutationToolResult(result);
      },
    },

    erply_run_custom_report_file: {
      description:
        "Generate a custom report file (POST /report_generator/file). Body is APIRequestForReportGeneratorInfo. Binary/text payload is encoded for MCP.",
      inputSchema: {
        type: "object" as const,
        properties: fileRequestProperties,
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(fileRequestSchema, params) as CustomReportFileRequest;
        const bytes = await client.postBytes("/report_generator/file", args);
        return bytesToolResult(bytes);
      },
    },

    erply_run_custom_report_file_json: {
      description:
        "Generate a custom report file as JSON (POST /report_generator/file/{type}/json_format). Requires type. Body is APIReportGeneratorInfo; query: fileName, encoding, activityId, dateFrom, dateTo, projectId.",
      inputSchema: {
        type: "object" as const,
        properties: {
          ...generatorInputProperties,
          type: { type: "string" as const, description: "File type path segment (required)" },
          fileName: { type: "string" as const },
          encoding: { type: "string" as const },
          activityId: { type: "number" as const },
        },
        required: ["type"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(fileJsonSchema, params);
        const { type, fileName, encoding, activityId, projectId, ...body } = args;
        const result = await client.post(`/report_generator/file/${type}/json_format`, body, {
          fileName,
          encoding,
          activityId,
          dateFrom: args.dateFrom,
          dateTo: args.dateTo,
          projectId,
        });
        return mutationToolResult(result);
      },
    },

    erply_list_custom_report_columns: {
      description:
        "List report-generator columns (GET /report_generator/columns). Optional lang and tables (comma-separated). Use before erply_run_custom_report to discover field names.",
      inputSchema: {
        type: "object" as const,
        properties: {
          lang: { type: "string" as const },
          tables: { type: "string" as const, description: "Comma-separated table names" },
        },
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(columnsSchema, params);
        const result = await client.get("/report_generator/columns", args);
        return jsonToolResult(result);
      },
    },

    erply_contact_invoice_result_report: {
      description:
        "Contact/invoice result report (GET /report_generator/contact_invoice_result_report). Optional projectId, articleId, number, contactId, showSales, reportGeneratorInput, month, year.",
      inputSchema: {
        type: "object" as const,
        properties: {
          projectId: { type: "number" as const },
          articleId: { type: "number" as const },
          number: { type: "string" as const },
          contactId: { type: "number" as const },
          showSales: { type: "boolean" as const },
          reportGeneratorInput: { type: "string" as const },
          month: { type: "number" as const },
          year: { type: "number" as const },
        },
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(contactInvoiceSchema, params);
        const result = await client.get("/report_generator/contact_invoice_result_report", args);
        return jsonToolResult(result);
      },
    },

    erply_list_user_defined_reports: {
      description:
        "List user-defined reports (GET /report_generator/user_defined). Optional dateFrom, dateTo, comparative dates, projectId, attribute1–4, cashFlowReport.",
      inputSchema: {
        type: "object" as const,
        properties: {
          dateFrom: { type: "string" as const },
          dateTo: { type: "string" as const },
          comparativeDateFrom: { type: "string" as const },
          comparativeDateTo: { type: "string" as const },
          projectId: { type: "number" as const },
          attribute1: { type: "string" as const },
          attribute2: { type: "string" as const },
          attribute3: { type: "string" as const },
          attribute4: { type: "string" as const },
          cashFlowReport: { type: "boolean" as const },
        },
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(userDefinedSchema, params);
        const result = await client.get("/report_generator/user_defined", args);
        return jsonToolResult(result);
      },
    },

    erply_get_custom_report_xml: {
      description:
        "Fetch a custom report as XML (GET /report_generator/xml). Optional type, fileName, encoding, activityId, id, dateFrom, dateTo, projectId, parameters.",
      inputSchema: {
        type: "object" as const,
        properties: {
          type: { type: "string" as const },
          fileName: { type: "string" as const },
          encoding: { type: "string" as const },
          activityId: { type: "number" as const },
          id: { type: "number" as const },
          dateFrom: { type: "string" as const },
          dateTo: { type: "string" as const },
          projectId: { type: "number" as const },
          parameters: { type: "string" as const },
        },
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(xmlSchema, params);
        const xml = await client.getText("/report_generator/xml", args);
        return jsonToolResult({ encoding: "utf8", text: xml });
      },
    },

    erply_get_custom_report_file: {
      description:
        "Download a custom report file (GET /report_generator/file/{type}). Requires type. Optional fileName, encoding, activityId, dateFrom, dateTo, projectId, parameters. Binary payloads are returned as base64.",
      inputSchema: {
        type: "object" as const,
        properties: {
          type: { type: "string" as const, description: "File type path segment (required)" },
          fileName: { type: "string" as const },
          encoding: { type: "string" as const },
          activityId: { type: "number" as const },
          dateFrom: { type: "string" as const },
          dateTo: { type: "string" as const },
          projectId: { type: "number" as const },
          parameters: { type: "string" as const },
        },
        required: ["type"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(getFileSchema, params);
        const { type, ...query } = args;
        const bytes = await client.getArrayBuffer(`/report_generator/file/${type}`, query);
        return bytesToolResult(bytes);
      },
    },

    erply_edit_custom_report_callback: {
      description:
        "Apply report-generator callback edits (POST /report_generator/edit). Body is APICallbackEditInfo (id, mapper, generatorInfo, initial/current/edited rows, …). Extra fields may be passed through.",
      inputSchema: {
        type: "object" as const,
        properties: {
          id: { type: "number" as const },
          activityId: { type: "number" as const },
          idFieldName: { type: "string" as const },
          getRequestOrUrl: { type: "string" as const },
          postRequestOrUrl: { type: "string" as const },
          putRequestOrUrl: { type: "string" as const },
          deleteRequestOrUrl: { type: "string" as const },
          editConfirmed: { type: "boolean" as const },
          saveAllFields: { type: "boolean" as const },
          generatorInfo: { type: "object" as const },
        },
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(editSchema, params);
        const result = await client.post("/report_generator/edit", args);
        return mutationToolResult(result);
      },
    },

    erply_update_custom_report_values: {
      description:
        "Update values from a custom report (POST /report_generator/update_values). Body is APIReportGeneratorInfo; set updateInfo ({ tableAndColumn, referenceType, value }). Extra fields may be passed through.",
      inputSchema: {
        type: "object" as const,
        properties: generatorInputProperties,
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(updateValuesSchema, params);
        const result = await client.post("/report_generator/update_values", args);
        return mutationToolResult(result);
      },
    },
  };
}
