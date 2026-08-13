import { z } from "zod";

import type { ErplyBooksClient } from "../client.js";
import { ERPLY_DOCUMENT_TYPES } from "../types/invoices.js";
import type {
  DictionaryValueInfo,
  InvoiceRowSplitting,
  InvoiceWithComponents,
  PartnerInvoiceWorkflow,
} from "../types/invoices-workflow.js";
import {
  optionalBoolean,
  optionalPositiveInt,
  optionalString,
  optionalYmd,
  parseToolArgs,
  positiveInt,
} from "../validation/tool-args.js";
import { mutationToolResult } from "./list-response.js";

const documentTypeSchema = z.enum(ERPLY_DOCUMENT_TYPES);
const objectRecord = z.record(z.string(), z.unknown());

/** Accept comma-separated string or non-empty number array → API string. */
const idsQuerySchema = z.union([z.string().min(1), z.array(positiveInt).min(1)]);

function toIdsString(ids: string | number[]): string {
  return Array.isArray(ids) ? ids.join(",") : ids;
}

const optionalObject = objectRecord.nullish().transform((v) => v ?? undefined);
const optionalObjectArray = z
  .array(objectRecord)
  .nullish()
  .transform((v) => v ?? undefined);

const addAttributeSchema = z.object({
  documentId: positiveInt,
  attributeName: optionalString,
  parseXML: optionalBoolean,
  alternativeValue: optionalString,
  alternativeValue2: optionalString,
  alternativeValue3: optionalString,
  alternativeValue4: optionalString,
  alternativeValue5: optionalString,
  alternativeValue6: optionalString,
  alternativeValue7: optionalString,
  alternativeValue8: optionalString,
  decimalValue: optionalString,
});

const addDimensionSchema = z.object({
  ids: idsQuerySchema.optional(),
  attachmentId: optionalPositiveInt,
  projectId: optionalString,
});

const addDocumentConnectionSchema = z.object({
  documentId: positiveInt,
  baseDocumentId: positiveInt,
});

const addOppositeSchema = z
  .object({
    id: optionalPositiveInt,
    typeCode: documentTypeSchema.optional(),
    date: optionalYmd,
    customerId: optionalPositiveInt,
    invoice: optionalObject,
    rows: optionalObjectArray,
    payments: optionalObjectArray,
    customer: optionalObject,
    registrationCode: optionalString,
  })
  .passthrough();

const addToQueueSchema = z
  .object({
    registrationCode: optionalString,
  })
  .passthrough();

const deleteViaPostSchema = z.object({
  id: positiveInt,
  registrationCode: optionalString,
});

const deleteMultipleSchema = z
  .object({
    code: optionalString,
    name: optionalString,
    dontDeleteErplyPayments: optionalBoolean,
    deleteParentPayment: optionalBoolean,
  })
  .passthrough();

const forwardToUserSchema = z.object({
  ids: idsQuerySchema.optional(),
  attachmentId: optionalPositiveInt,
  userId: positiveInt,
});

const overrideSchema = z.object({
  documentIds: idsQuerySchema,
  fieldName: z.string().min(1),
  value: optionalString,
  documentType: documentTypeSchema.optional(),
  unlockIfLocked: optionalBoolean,
});

const prepareRowsSchema = z.object({
  baseDocumentId: positiveInt,
  registrationCode: optionalString,
  documentType: documentTypeSchema.optional(),
  createWasteDocument: optionalBoolean,
});

const splitRowsSchema = z
  .object({
    invoiceId: optionalPositiveInt,
    documentId: optionalPositiveInt,
    documentStatusTypeCode: optionalString,
    oldRows: optionalObjectArray,
    newRows: optionalObjectArray,
    registrationCode: optionalString,
  })
  .passthrough();

const updateSplitRowsSchema = z
  .object({
    documentId: positiveInt,
    invoiceId: optionalPositiveInt,
    documentStatusTypeCode: optionalString,
    oldRows: optionalObjectArray,
    newRows: optionalObjectArray,
    registrationCode: optionalString,
  })
  .passthrough();

const usePrepaymentSchema = z.object({
  documentId: positiveInt,
  paymentId: optionalPositiveInt,
  sumPaid: optionalString,
  date: optionalYmd,
  sumPaidInForeignCurrency: optionalString,
  registrationCode: optionalString,
});

const deletePartnerInvoiceSchema = z.object({
  invoiceId: z.union([z.string().min(1), positiveInt]),
  registrationCode: optionalString,
});

const updatePartnerInvoiceSchema = z
  .object({
    documentId: positiveInt,
    typeCode: documentTypeSchema.optional(),
    date: optionalYmd,
    customerId: optionalPositiveInt,
    rows: optionalObjectArray,
    registrationCode: optionalString,
    searchByCustomerCode: optionalBoolean,
  })
  .passthrough();

const deleteInvoiceRowSchema = z.object({
  documentId: positiveInt,
  articleRowId: positiveInt,
});

export function createInvoiceWorkflowTools(client: ErplyBooksClient) {
  return {
    erply_add_invoice_attribute: {
      description:
        "Add an attribute on a document (POST /invoices/add_attribute). Requires documentId. Optional attributeName, parseXML, alternativeValue…alternativeValue8, decimalValue.",
      inputSchema: {
        type: "object" as const,
        properties: {
          documentId: { type: "number", description: "Document id (required)" },
          attributeName: { type: "string" },
          parseXML: { type: "boolean" },
          alternativeValue: { type: "string" },
          alternativeValue2: { type: "string" },
          alternativeValue3: { type: "string" },
          alternativeValue4: { type: "string" },
          alternativeValue5: { type: "string" },
          alternativeValue6: { type: "string" },
          alternativeValue7: { type: "string" },
          alternativeValue8: { type: "string" },
          decimalValue: { type: "string" },
        },
        required: ["documentId"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(addAttributeSchema, params);
        const result = await client.post("/invoices/add_attribute", undefined, args);
        return mutationToolResult(result);
      },
    },

    erply_add_invoice_dimension: {
      description:
        "Attach a project/dimension to documents (POST /invoices/add_dimension). Optional ids (comma string or number array), attachmentId, projectId.",
      inputSchema: {
        type: "object" as const,
        properties: {
          ids: {
            description: "Document id(s): comma-separated string or number array",
            oneOf: [{ type: "string" }, { type: "array", items: { type: "number" }, minItems: 1 }],
          },
          attachmentId: { type: "number" },
          projectId: { type: "string" },
        },
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(addDimensionSchema, params);
        const result = await client.post("/invoices/add_dimension", undefined, {
          ids: args.ids === undefined ? undefined : toIdsString(args.ids),
          attachmentId: args.attachmentId,
          projectId: args.projectId,
        });
        return mutationToolResult(result);
      },
    },

    erply_add_invoice_document_connection: {
      description:
        "Link a document to a base document (POST /invoices/add_document_connection). Requires documentId and baseDocumentId.",
      inputSchema: {
        type: "object" as const,
        properties: {
          documentId: { type: "number", description: "Target document id (required)" },
          baseDocumentId: { type: "number", description: "Base document id (required)" },
        },
        required: ["documentId", "baseDocumentId"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(addDocumentConnectionSchema, params);
        const result = await client.post("/invoices/add_document_connection", undefined, args);
        return mutationToolResult(result);
      },
    },

    erply_add_invoice_opposite: {
      description:
        "Create an opposite document (POST /invoices/add_opposite). Sends APIInvoiceWithComponentsInfo. Optional id, typeCode, date, customerId, invoice, rows, payments, customer, registrationCode. Extra fields may be passed through.",
      inputSchema: {
        type: "object" as const,
        properties: {
          id: { type: "number" },
          typeCode: {
            type: "string",
            description: "DOCUMENT_* type code",
            enum: [...ERPLY_DOCUMENT_TYPES],
          },
          date: { type: "string", description: "YYYY-MM-DD" },
          customerId: { type: "number" },
          invoice: { type: "object", additionalProperties: true },
          rows: { type: "array", items: { type: "object", additionalProperties: true } },
          payments: { type: "array", items: { type: "object", additionalProperties: true } },
          customer: { type: "object", additionalProperties: true },
          registrationCode: { type: "string" },
        },
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(addOppositeSchema, params);
        const { registrationCode, ...body } = args;
        const created = await client.post<InvoiceWithComponents>("/invoices/add_opposite", body, {
          registrationCode,
        });
        return mutationToolResult(created);
      },
    },

    erply_add_invoice_to_queue: {
      description:
        "Queue a document for processing (POST /invoices/add_to_queue). Optional registrationCode query. Extra JSON body fields may be passed through.",
      inputSchema: {
        type: "object" as const,
        properties: {
          registrationCode: { type: "string" },
        },
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(addToQueueSchema, params);
        const { registrationCode, ...body } = args;
        const result = await client.post("/invoices/add_to_queue", body, { registrationCode });
        return mutationToolResult(result);
      },
    },

    erply_delete_invoice_via_post: {
      description:
        "Delete a document via POST /invoices/delete (alternate to DELETE /invoices/{invoiceId}). Requires id. Optional registrationCode. Destructive.",
      inputSchema: {
        type: "object" as const,
        properties: {
          id: { type: "number", description: "Document id to delete (required)" },
          registrationCode: { type: "string" },
        },
        required: ["id"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(deleteViaPostSchema, params);
        const result = await client.post("/invoices/delete", undefined, args);
        return mutationToolResult(result);
      },
    },

    erply_delete_invoices_multiple_and_payments: {
      description:
        "Delete multiple documents and related payments (POST /invoices/delete_multiple_and_payments). Optional code/name body (APIDictionaryValueInfo), dontDeleteErplyPayments, deleteParentPayment. Extra body fields may be passed through. Destructive.",
      inputSchema: {
        type: "object" as const,
        properties: {
          code: { type: "string", description: "Dictionary/code body field from the spec" },
          name: { type: "string" },
          dontDeleteErplyPayments: { type: "boolean" },
          deleteParentPayment: { type: "boolean" },
        },
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(deleteMultipleSchema, params);
        const { dontDeleteErplyPayments, deleteParentPayment, ...body } = args;
        const result = await client.post<DictionaryValueInfo>(
          "/invoices/delete_multiple_and_payments",
          body,
          { dontDeleteErplyPayments, deleteParentPayment },
        );
        return mutationToolResult(result);
      },
    },

    erply_forward_invoice_to_user: {
      description:
        "Forward documents to a user (POST /invoices/forward_to_user). Requires userId. Optional ids (comma string or number array) and attachmentId.",
      inputSchema: {
        type: "object" as const,
        properties: {
          userId: { type: "number", description: "Target user id (required)" },
          ids: {
            description: "Document id(s): comma-separated string or number array",
            oneOf: [{ type: "string" }, { type: "array", items: { type: "number" }, minItems: 1 }],
          },
          attachmentId: { type: "number" },
        },
        required: ["userId"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(forwardToUserSchema, params);
        const result = await client.post("/invoices/forward_to_user", undefined, {
          userId: args.userId,
          ids: args.ids === undefined ? undefined : toIdsString(args.ids),
          attachmentId: args.attachmentId,
        });
        return mutationToolResult(result);
      },
    },

    erply_override_invoice_fields: {
      description:
        "Override a field on documents (POST /invoices/override). Requires documentIds and fieldName. Optional value, documentType, unlockIfLocked.",
      inputSchema: {
        type: "object" as const,
        properties: {
          documentIds: {
            description: "Document id(s): comma-separated string or number array (required)",
            oneOf: [{ type: "string" }, { type: "array", items: { type: "number" }, minItems: 1 }],
          },
          fieldName: { type: "string", description: "Field to override (required)" },
          value: { type: "string" },
          documentType: {
            type: "string",
            enum: [...ERPLY_DOCUMENT_TYPES],
          },
          unlockIfLocked: { type: "boolean" },
        },
        required: ["documentIds", "fieldName"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(overrideSchema, params);
        const result = await client.post("/invoices/override", undefined, {
          documentIds: toIdsString(args.documentIds),
          fieldName: args.fieldName,
          value: args.value,
          documentType: args.documentType,
          unlockIfLocked: args.unlockIfLocked,
        });
        return mutationToolResult(result);
      },
    },

    erply_prepare_invoice_rows: {
      description:
        "Prepare rows from a base document (POST /invoices/prepare_rows). Requires baseDocumentId. Optional registrationCode, documentType, createWasteDocument.",
      inputSchema: {
        type: "object" as const,
        properties: {
          baseDocumentId: { type: "number", description: "Base document id (required)" },
          registrationCode: { type: "string" },
          documentType: {
            type: "string",
            enum: [...ERPLY_DOCUMENT_TYPES],
          },
          createWasteDocument: { type: "boolean" },
        },
        required: ["baseDocumentId"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(prepareRowsSchema, params);
        const result = await client.post("/invoices/prepare_rows", undefined, args);
        return mutationToolResult(result);
      },
    },

    erply_split_invoice_rows: {
      description:
        "Split invoice rows (POST /invoices/split_rows). Sends APIInvoiceRowSplittingInfo. Optional invoiceId, documentId, documentStatusTypeCode, oldRows, newRows, registrationCode. Extra fields may be passed through.",
      inputSchema: {
        type: "object" as const,
        properties: {
          invoiceId: { type: "number" },
          documentId: { type: "number" },
          documentStatusTypeCode: { type: "string" },
          oldRows: { type: "array", items: { type: "object", additionalProperties: true } },
          newRows: { type: "array", items: { type: "object", additionalProperties: true } },
          registrationCode: { type: "string" },
        },
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(splitRowsSchema, params);
        const { registrationCode, ...body } = args;
        const result = await client.post<InvoiceRowSplitting>("/invoices/split_rows", body, {
          registrationCode,
        });
        return mutationToolResult(result);
      },
    },

    erply_update_invoice_split_rows: {
      description:
        "Update a row split (PUT /invoices/split_rows/{documentId}). Requires documentId. Optional invoiceId, documentStatusTypeCode, oldRows, newRows, registrationCode. Extra APIInvoiceRowSplittingInfo fields may be passed through.",
      inputSchema: {
        type: "object" as const,
        properties: {
          documentId: { type: "number", description: "Document id (required)" },
          invoiceId: { type: "number" },
          documentStatusTypeCode: { type: "string" },
          oldRows: { type: "array", items: { type: "object", additionalProperties: true } },
          newRows: { type: "array", items: { type: "object", additionalProperties: true } },
          registrationCode: { type: "string" },
        },
        required: ["documentId"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(updateSplitRowsSchema, params);
        const { documentId, registrationCode, ...body } = args;
        const result = await client.put<InvoiceRowSplitting>(
          `/invoices/split_rows/${documentId}`,
          body,
          { registrationCode },
        );
        return mutationToolResult(result);
      },
    },

    erply_use_invoice_prepayment: {
      description:
        "Apply a prepayment to a document (POST /invoices/use_prepayment). Requires documentId. Optional paymentId, sumPaid, date, sumPaidInForeignCurrency, registrationCode.",
      inputSchema: {
        type: "object" as const,
        properties: {
          documentId: { type: "number", description: "Document id (required)" },
          paymentId: { type: "number" },
          sumPaid: { type: "string" },
          date: { type: "string", description: "YYYY-MM-DD" },
          sumPaidInForeignCurrency: { type: "string" },
          registrationCode: { type: "string" },
        },
        required: ["documentId"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(usePrepaymentSchema, params);
        const result = await client.post("/invoices/use_prepayment", undefined, args);
        return mutationToolResult(result);
      },
    },

    erply_delete_partner_invoice: {
      description:
        "Delete a partner invoice (DELETE /invoices/partner). Requires invoiceId. Optional registrationCode. Destructive.",
      inputSchema: {
        type: "object" as const,
        properties: {
          invoiceId: {
            description: "Partner invoice id (string or number, required)",
            oneOf: [{ type: "string" }, { type: "number" }],
          },
          registrationCode: { type: "string" },
        },
        required: ["invoiceId"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(deletePartnerInvoiceSchema, params);
        const result = await client.delete("/invoices/partner", {
          invoiceId: String(args.invoiceId),
          registrationCode: args.registrationCode,
        });
        return mutationToolResult(result);
      },
    },

    erply_update_partner_invoice: {
      description:
        "Update a partner invoice (PUT /invoices/partner/{documentId}). Requires documentId. Optional typeCode, date, customerId, rows, registrationCode, searchByCustomerCode. Extra APIPartnerInvoiceInfo fields may be passed through.",
      inputSchema: {
        type: "object" as const,
        properties: {
          documentId: { type: "number", description: "Partner document id (required)" },
          typeCode: {
            type: "string",
            enum: [...ERPLY_DOCUMENT_TYPES],
          },
          date: { type: "string", description: "YYYY-MM-DD" },
          customerId: { type: "number" },
          rows: { type: "array", items: { type: "object", additionalProperties: true } },
          registrationCode: { type: "string" },
          searchByCustomerCode: { type: "boolean" },
        },
        required: ["documentId"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(updatePartnerInvoiceSchema, params);
        const { documentId, registrationCode, searchByCustomerCode, ...body } = args;
        const updated = await client.put<PartnerInvoiceWorkflow>(
          `/invoices/partner/${documentId}`,
          { ...body, id: documentId },
          { registrationCode, searchByCustomerCode },
        );
        return mutationToolResult(updated);
      },
    },

    erply_delete_invoice_row: {
      description:
        "Delete one article row from a document (DELETE /invoices/{documentId}/rows/{articleRowId}). Requires documentId and articleRowId. Destructive.",
      inputSchema: {
        type: "object" as const,
        properties: {
          documentId: { type: "number", description: "Document id (required)" },
          articleRowId: { type: "number", description: "Article row id (required)" },
        },
        required: ["documentId", "articleRowId"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(deleteInvoiceRowSchema, params);
        const result = await client.delete(
          `/invoices/${args.documentId}/rows/${args.articleRowId}`,
        );
        return mutationToolResult(result);
      },
    },
  };
}

/** Exported for unit tests. */
export const __test__ = { toIdsString };
