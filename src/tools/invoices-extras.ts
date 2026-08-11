import { z } from "zod";

import type { ErplyBooksClient } from "../client.js";
import { ERPLY_DOCUMENT_TYPES } from "../types/invoices.js";
import type { EmailInfo, PartnerInvoice, RecurringInvoice } from "../types/invoices-extras.js";
import {
  optionalBoolean,
  optionalNonNegativeInt,
  optionalPositiveInt,
  optionalString,
  parseToolArgs,
  positiveInt,
  ymdDateString,
} from "../validation/tool-args.js";
import { jsonToolResult, mutationToolResult, unwrapListEnvelope } from "./list-response.js";

const documentTypeSchema = z.enum(ERPLY_DOCUMENT_TYPES);

/** Accept comma-separated string or non-empty number array → API string. */
const idsQuerySchema = z.union([z.string().min(1), z.array(positiveInt).min(1)]);

function toIdsString(ids: string | number[]): string {
  return Array.isArray(ids) ? ids.join(",") : ids;
}

const getInvoicePdfSchema = z.object({
  documentId: positiveInt,
  template: optionalString,
  hash: optionalString,
});

const sendInvoiceEmailSchema = z.object({
  documentId: positiveInt,
  receiver: z.string().min(1),
  subject: optionalString,
  body: optionalString,
  sender: optionalString,
  senderName: optionalString,
  additionalTypes: optionalString,
});

const getEinvoiceSchema = z.object({
  documentIds: idsQuerySchema,
});

const sendEinvoicesSchema = z.object({
  documentIds: idsQuerySchema,
  partnerType: optionalString,
  sendPDF: optionalBoolean,
});

const confirmInvoicesSchema = z.object({
  ids: idsQuerySchema,
  attachmentId: optionalPositiveInt,
  documentStatusTypeCode: optionalString,
  useTransactionLockIfNecessary: optionalBoolean,
});

const listPartnerInvoicesSchema = z.object({
  dateFrom: ymdDateString,
  dateTo: ymdDateString,
  documentType: documentTypeSchema.optional(),
  customerId: optionalPositiveInt,
  keyword: optionalString,
  start: optionalNonNegativeInt,
  limit: optionalPositiveInt,
});

const createPartnerInvoiceSchema = z
  .object({
    typeCode: documentTypeSchema,
    date: ymdDateString,
    customerId: optionalPositiveInt,
    customer: z
      .record(z.string(), z.unknown())
      .nullish()
      .transform((v) => v ?? undefined),
    number: optionalString,
    currencyCode: optionalString,
    projectId: optionalPositiveInt,
    partnerDocumentId: optionalString,
    rows: z
      .array(z.record(z.string(), z.unknown()))
      .nullish()
      .transform((v) => v ?? undefined),
    registrationCode: optionalString,
  })
  .passthrough()
  .superRefine((val, ctx) => {
    if (val.customerId == null && val.customer == null) {
      ctx.addIssue({
        code: "custom",
        message: "customerId or customer is required",
        path: ["customerId"],
      });
    }
  });

const createRecurringInvoiceSchema = z
  .object({
    copyFromDocumentId: positiveInt,
    activeFromDate: optionalString,
    dayOfMonth: optionalPositiveInt,
    invoiceDayOfMonth: optionalPositiveInt,
    enabled: optionalBoolean,
    sendInvoiceByEmail: optionalBoolean,
    emailAddress: optionalString,
    sendInvoice: optionalBoolean,
    entityId: optionalPositiveInt,
    registrationCode: optionalString,
  })
  .passthrough();

const updateRecurringInvoiceSchema = z
  .object({
    documentId: positiveInt,
    copyFromDocumentId: optionalPositiveInt,
    activeFromDate: optionalString,
    dayOfMonth: optionalPositiveInt,
    invoiceDayOfMonth: optionalPositiveInt,
    enabled: optionalBoolean,
    sendInvoiceByEmail: optionalBoolean,
    emailAddress: optionalString,
    sendInvoice: optionalBoolean,
    entityId: optionalPositiveInt,
    registrationCode: optionalString,
  })
  .passthrough();

export function createInvoiceExtraTools(client: ErplyBooksClient) {
  return {
    erply_get_invoice_pdf: {
      description:
        "Fetch an invoice PDF as JSON (GET /invoices/pdf/v2/{documentId}). Requires documentId. Optional template and hash. Prefer this over binary /invoices/pdf/{id}. Some orgs/plans return HTTP 500 or 409.",
      inputSchema: {
        type: "object" as const,
        properties: {
          documentId: { type: "number", description: "Document id (required)" },
          template: { type: "string", description: "Print template code" },
          hash: { type: "string", description: "Optional document hash" },
        },
        required: ["documentId"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(getInvoicePdfSchema, params);
        const { documentId, template, hash } = args;
        const pdf = await client.get(`/invoices/pdf/v2/${documentId}`, { template, hash });
        return jsonToolResult(pdf);
      },
    },

    erply_send_invoice_email: {
      description:
        "Email an invoice (POST /invoices/email/simple). Requires documentId and receiver. Optional subject, body, sender, senderName, additionalTypes (APIEmailInfo).",
      inputSchema: {
        type: "object" as const,
        properties: {
          documentId: { type: "number", description: "Document id (required)" },
          receiver: { type: "string", description: "Recipient email (required)" },
          subject: { type: "string" },
          body: { type: "string" },
          sender: { type: "string" },
          senderName: { type: "string" },
          additionalTypes: { type: "string" },
        },
        required: ["documentId", "receiver"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(sendInvoiceEmailSchema, params);
        const { documentId, ...email } = args;
        const body: EmailInfo = email;
        const result = await client.post("/invoices/email/simple", body, { documentId });
        return mutationToolResult(result);
      },
    },

    erply_get_einvoice: {
      description:
        "Download e-invoice payload(s) (GET /invoices/einvoice). Requires documentIds as a comma-separated string or array of ids.",
      inputSchema: {
        type: "object" as const,
        properties: {
          documentIds: {
            description: "Document id(s): comma-separated string or number array (required)",
            oneOf: [{ type: "string" }, { type: "array", items: { type: "number" }, minItems: 1 }],
          },
        },
        required: ["documentIds"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(getEinvoiceSchema, params);
        const documentIds = toIdsString(args.documentIds);
        const result = await client.get("/invoices/einvoice", { documentIds });
        return jsonToolResult(result);
      },
    },

    erply_send_einvoices: {
      description:
        "Send e-invoices (POST /invoices/send_einvoices). Requires documentIds (comma string or number array). Optional partnerType and sendPDF.",
      inputSchema: {
        type: "object" as const,
        properties: {
          documentIds: {
            description: "Document id(s): comma-separated string or number array (required)",
            oneOf: [{ type: "string" }, { type: "array", items: { type: "number" }, minItems: 1 }],
          },
          partnerType: { type: "string" },
          sendPDF: { type: "boolean", description: "Also send PDF when supported" },
        },
        required: ["documentIds"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(sendEinvoicesSchema, params);
        const documentIds = toIdsString(args.documentIds);
        const result = await client.post("/invoices/send_einvoices", undefined, {
          documentIds,
          partnerType: args.partnerType,
          sendPDF: args.sendPDF,
        });
        return mutationToolResult(result);
      },
    },

    erply_confirm_invoices: {
      description:
        "Confirm invoices (POST /invoices/confirm_invoices). Requires ids (comma string or number array). Optional attachmentId, documentStatusTypeCode, useTransactionLockIfNecessary.",
      inputSchema: {
        type: "object" as const,
        properties: {
          ids: {
            description: "Invoice id(s): comma-separated string or number array (required)",
            oneOf: [{ type: "string" }, { type: "array", items: { type: "number" }, minItems: 1 }],
          },
          attachmentId: { type: "number" },
          documentStatusTypeCode: { type: "string" },
          useTransactionLockIfNecessary: { type: "boolean" },
        },
        required: ["ids"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(confirmInvoicesSchema, params);
        const ids = toIdsString(args.ids);
        const result = await client.post("/invoices/confirm_invoices", undefined, {
          ids,
          attachmentId: args.attachmentId,
          documentStatusTypeCode: args.documentStatusTypeCode,
          useTransactionLockIfNecessary: args.useTransactionLockIfNecessary,
        });
        return mutationToolResult(result);
      },
    },

    erply_list_partner_invoices: {
      description:
        "List partner invoices (GET /invoices/partner). Requires dateFrom and dateTo. Optional documentType, customerId, keyword, start, limit. Returns { totalCount, items } when available.",
      inputSchema: {
        type: "object" as const,
        properties: {
          dateFrom: { type: "string", description: "Start date YYYY-MM-DD (required)" },
          dateTo: { type: "string", description: "End date YYYY-MM-DD (required)" },
          documentType: {
            type: "string",
            description: "Optional DOCUMENT_* type code",
            enum: [...ERPLY_DOCUMENT_TYPES],
          },
          customerId: { type: "number" },
          keyword: { type: "string" },
          start: { type: "number", description: "Offset (default 0)" },
          limit: { type: "number", description: "Page size" },
        },
        required: ["dateFrom", "dateTo"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(listPartnerInvoicesSchema, params);
        const response = await client.get("/invoices/partner", args);
        return jsonToolResult(unwrapListEnvelope<PartnerInvoice>(response));
      },
    },

    erply_create_partner_invoice: {
      description:
        "Create a partner invoice (POST /invoices/partner). Requires typeCode, date, and customerId or customer. Optional registrationCode query. Extra APIPartnerInvoiceInfo fields may be passed through.",
      inputSchema: {
        type: "object" as const,
        properties: {
          typeCode: {
            type: "string",
            description: "DOCUMENT_* type code (required)",
            enum: [...ERPLY_DOCUMENT_TYPES],
          },
          date: { type: "string", description: "Document date YYYY-MM-DD (required)" },
          customerId: { type: "number", description: "Existing customer id (or pass customer)" },
          customer: {
            type: "object",
            description: "Inline customer object",
            additionalProperties: true,
          },
          number: { type: "string" },
          currencyCode: { type: "string" },
          projectId: { type: "number" },
          partnerDocumentId: { type: "string" },
          rows: {
            type: "array",
            items: { type: "object", additionalProperties: true },
          },
          registrationCode: { type: "string" },
        },
        required: ["typeCode", "date"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(createPartnerInvoiceSchema, params);
        const { registrationCode, ...body } = args;
        const created = await client.post<PartnerInvoice>(
          "/invoices/partner",
          { ...body, id: 0 },
          { registrationCode },
        );
        return mutationToolResult(created);
      },
    },

    erply_create_recurring_invoice: {
      description:
        "Create a recurring invoice schedule (POST /invoices/recurring). Requires copyFromDocumentId. Optional activeFromDate, dayOfMonth, invoiceDayOfMonth, enabled, sendInvoiceByEmail, emailAddress, sendInvoice, entityId, registrationCode. Extra APIRecurringInvoiceInfo fields may be passed through.",
      inputSchema: {
        type: "object" as const,
        properties: {
          copyFromDocumentId: {
            type: "number",
            description: "Source document id to copy from (required)",
          },
          activeFromDate: { type: "string" },
          dayOfMonth: { type: "number" },
          invoiceDayOfMonth: { type: "number" },
          enabled: { type: "boolean" },
          sendInvoiceByEmail: { type: "boolean" },
          emailAddress: { type: "string" },
          sendInvoice: { type: "boolean" },
          entityId: { type: "number" },
          registrationCode: { type: "string" },
        },
        required: ["copyFromDocumentId"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(createRecurringInvoiceSchema, params);
        const { registrationCode, ...body } = args;
        const created = await client.post<RecurringInvoice>("/invoices/recurring", body, {
          registrationCode,
        });
        return mutationToolResult(created);
      },
    },

    erply_update_recurring_invoice: {
      description:
        "Update a recurring invoice schedule (PUT /invoices/recurring/{documentId}). Requires documentId. Optional schedule/email fields and registrationCode. Extra APIRecurringInvoiceInfo fields may be passed through.",
      inputSchema: {
        type: "object" as const,
        properties: {
          documentId: {
            type: "number",
            description: "Recurring schedule / document id (required)",
          },
          copyFromDocumentId: { type: "number" },
          activeFromDate: { type: "string" },
          dayOfMonth: { type: "number" },
          invoiceDayOfMonth: { type: "number" },
          enabled: { type: "boolean" },
          sendInvoiceByEmail: { type: "boolean" },
          emailAddress: { type: "string" },
          sendInvoice: { type: "boolean" },
          entityId: { type: "number" },
          registrationCode: { type: "string" },
        },
        required: ["documentId"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(updateRecurringInvoiceSchema, params);
        const { documentId, registrationCode, ...body } = args;
        const updated = await client.put<RecurringInvoice>(
          `/invoices/recurring/${documentId}`,
          { ...body, id: documentId },
          { registrationCode },
        );
        return mutationToolResult(updated);
      },
    },
  };
}

/** Exported for unit tests. */
export const __test__ = { toIdsString };
