import { z } from "zod";

import type { ErplyBooksClient } from "../client.js";
import {
  optionalBoolean,
  optionalInt,
  optionalNonNegativeInt,
  optionalNumber,
  optionalPositiveInt,
  optionalString,
  parseToolArgs,
  positiveInt,
} from "../validation/tool-args.js";
import { jsonToolResult, mutationToolResult } from "./list-response.js";

const optionalObject = z
  .record(z.string(), z.unknown())
  .nullish()
  .transform((v) => v ?? undefined);

const listAttributesSchema = z.object({
  type: optionalString,
  keyword: optionalString,
  value: optionalString,
  name: optionalString,
  countryCode: optionalString,
  entityId: optionalPositiveInt,
  dateFrom: optionalString,
  dateTo: optionalString,
  projectId: optionalString,
  parentActivityItemId: optionalPositiveInt,
  activityId: optionalPositiveInt,
  altValue: optionalString,
  altValue2: optionalString,
  altValue3: optionalString,
  altValue4: optionalString,
  altValue5: optionalString,
  altValue6: optionalString,
  altValue7: optionalString,
  altValue8: optionalString,
  altValue9: optionalString,
  transactionEntryId: optionalString,
  forceOrganisationSearch: optionalBoolean,
  reportGeneratorInput: optionalString,
  start: optionalNonNegativeInt,
  limit: optionalPositiveInt,
});

const activityItemBodyFields = {
  typeCode: optionalString,
  description: optionalString,
  value: optionalString,
  entityId: optionalPositiveInt,
  name: optionalString,
  decimalValue: optionalNumber,
  projectId: optionalPositiveInt,
  column: optionalInt,
  row: optionalInt,
  activityId: optionalPositiveInt,
  parentActivityItemId: optionalPositiveInt,
  transactionEntryId: optionalPositiveInt,
  dateFrom: optionalString,
  dateTo: optionalString,
  mainProjectId: optionalPositiveInt,
  alternativeValue: optionalString,
  alternativeValue2: optionalString,
  alternativeValue3: optionalString,
  alternativeValue4: optionalString,
  alternativeValue5: optionalString,
  alternativeValue6: optionalString,
  alternativeValue7: optionalString,
  alternativeValue8: optionalString,
  alternativeValue9: optionalString,
};

const activityItemV2BodyFields = {
  typeCode: optionalString,
  description: optionalString,
  value: optionalString,
  entityId: optionalPositiveInt,
  name: optionalString,
  decimalValue: optionalNumber,
  projectId: optionalPositiveInt,
  column: optionalInt,
  row: optionalInt,
  parentActivityItemId: optionalPositiveInt,
  transactionEntryId: optionalPositiveInt,
  dateFrom: optionalString,
  dateTo: optionalString,
  alternativeValue: optionalString,
  alternativeValue2: optionalString,
  alternativeValue3: optionalString,
  alternativeValue4: optionalString,
  alternativeValue5: optionalString,
  alternativeValue6: optionalString,
  alternativeValue7: optionalString,
  alternativeValue8: optionalString,
  alternativeValue9: optionalString,
};

const createAttributeSchema = z.object(activityItemBodyFields).passthrough();
const updateAttributeSchema = z
  .object({
    activityItemId: positiveInt,
    ...activityItemBodyFields,
  })
  .passthrough();
const createAttributeV2Schema = z.object(activityItemV2BodyFields).passthrough();
const updateAttributeV2Schema = z
  .object({
    activityItemId: positiveInt,
    ...activityItemV2BodyFields,
  })
  .passthrough();

const deleteAttributeSchema = z.object({
  activityItemId: positiveInt,
});

const deleteAttributeForAllOrganisationsSchema = z.object({
  name: z.string().min(1),
});

const assetTrackerInfoSchema = z.object({
  urlId: optionalPositiveInt,
  organisationId: optionalPositiveInt,
  start: optionalString,
  end: optionalString,
});

const CAR_IN_QUERY_KEYS = [
  "ATTRIBUTE_GROSS_WEIGHT",
  "ATTRIBUTE_LICENCEPLATE",
  "ATTRIBUTE_UNLADEN_WEIGHT",
  "customerId",
  "articleId",
  "projectId",
  "documentInfoId",
  "lang",
  "status",
  "documentType",
  "additionalPercentage",
  "baseDocumentId",
  "editingDocumentId",
  "deleteActivityItemIds",
  "currency",
] as const;

const carInQueryKeySet = new Set<string>(CAR_IN_QUERY_KEYS);

const createAttributeCarInSchema = z
  .object({
    ATTRIBUTE_GROSS_WEIGHT: optionalString,
    ATTRIBUTE_LICENCEPLATE: optionalString,
    ATTRIBUTE_UNLADEN_WEIGHT: optionalString,
    customerId: optionalPositiveInt,
    articleId: optionalPositiveInt,
    projectId: optionalPositiveInt,
    documentInfoId: optionalPositiveInt,
    lang: optionalString,
    status: optionalString,
    documentType: optionalString,
    additionalPercentage: optionalString,
    baseDocumentId: optionalPositiveInt,
    editingDocumentId: optionalPositiveInt,
    deleteActivityItemIds: optionalString,
    currency: optionalString,
    documentId: optionalPositiveInt,
    attachmentId: optionalPositiveInt,
    partnerDocumentId: optionalString,
    attributeId: optionalPositiveInt,
    folder: optionalString,
    typeCode: optionalString,
    filename: optionalString,
    base64: optionalString,
    number: optionalString,
    contactName: optionalString,
    expenseType: optionalString,
    netTotal: optionalNumber,
    taxSum: optionalNumber,
    taxRateId: optionalPositiveInt,
    total: optionalNumber,
    date: optionalString,
    description: optionalString,
    attribute: optionalObject,
  })
  .passthrough();

function splitCarInArgs(args: Record<string, unknown>): {
  query: Record<string, string | number | boolean | undefined>;
  body: Record<string, unknown>;
} {
  const query: Record<string, string | number | boolean | undefined> = {};
  const body: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args)) {
    if (carInQueryKeySet.has(key)) {
      query[key] = value as string | number | boolean | undefined;
    } else {
      body[key] = value;
    }
  }
  return { query, body };
}

const listAttributesQueryProperties = {
  type: { type: "string" as const, description: "Attribute type filter" },
  keyword: { type: "string" as const, description: "Free-text search" },
  value: { type: "string" as const, description: "Exact value filter" },
  name: { type: "string" as const, description: "Attribute name filter" },
  countryCode: { type: "string" as const, description: "Country code filter" },
  entityId: { type: "number" as const, description: "Parent entity id" },
  dateFrom: {
    type: "string" as const,
    description: "Range start (YYYY-MM-DD or ISO datetime)",
  },
  dateTo: {
    type: "string" as const,
    description: "Range end (YYYY-MM-DD or ISO datetime)",
  },
  projectId: { type: "string" as const, description: "Project id (OpenAPI type: string)" },
  parentActivityItemId: { type: "number" as const, description: "Parent activity item id" },
  activityId: { type: "number" as const, description: "Activity id" },
  altValue: { type: "string" as const, description: "alternativeValue filter" },
  altValue2: { type: "string" as const },
  altValue3: { type: "string" as const },
  altValue4: { type: "string" as const },
  altValue5: { type: "string" as const },
  altValue6: { type: "string" as const },
  altValue7: { type: "string" as const },
  altValue8: { type: "string" as const },
  altValue9: { type: "string" as const },
  transactionEntryId: {
    type: "string" as const,
    description: "Transaction entry id (OpenAPI type: string)",
  },
  forceOrganisationSearch: { type: "boolean" as const },
  reportGeneratorInput: { type: "string" as const },
  start: { type: "number" as const, description: "Offset (default 0)" },
  limit: { type: "number" as const, description: "Page size" },
};

const activityItemBodyProperties = {
  typeCode: { type: "string" as const, description: "Attribute type code" },
  description: { type: "string" as const },
  value: { type: "string" as const, description: "Primary value" },
  entityId: { type: "number" as const, description: "Parent entity id" },
  name: { type: "string" as const, description: "Attribute name" },
  decimalValue: { type: "number" as const },
  projectId: { type: "number" as const, description: "Associated project id" },
  column: { type: "number" as const },
  row: { type: "number" as const },
  activityId: { type: "number" as const },
  parentActivityItemId: { type: "number" as const },
  transactionEntryId: { type: "number" as const },
  dateFrom: { type: "string" as const, description: "Range start (ISO datetime)" },
  dateTo: { type: "string" as const, description: "Range end (ISO datetime)" },
  mainProjectId: { type: "number" as const },
  alternativeValue: { type: "string" as const },
  alternativeValue2: { type: "string" as const },
  alternativeValue3: { type: "string" as const },
  alternativeValue4: { type: "string" as const },
  alternativeValue5: { type: "string" as const },
  alternativeValue6: { type: "string" as const },
  alternativeValue7: { type: "string" as const },
  alternativeValue8: { type: "string" as const },
  alternativeValue9: { type: "string" as const },
};

const activityItemV2BodyProperties = Object.fromEntries(
  Object.entries(activityItemBodyProperties).filter(
    ([key]) => key !== "activityId" && key !== "mainProjectId",
  ),
);

const listRawBodyNote =
  "Returns the raw API body (list envelope not confirmed). All query params are optional.";

export function createAttributeTools(client: ErplyBooksClient) {
  return {
    erply_list_attributes: {
      description: `List activity items / custom attributes (GET /attributes). ${listRawBodyNote}`,
      inputSchema: {
        type: "object" as const,
        properties: listAttributesQueryProperties,
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(listAttributesSchema, params);
        const response = await client.get("/attributes", args);
        return jsonToolResult(response);
      },
    },

    erply_create_attribute: {
      description:
        "Create an activity item / custom attribute (POST /attributes). Sends id: 0. " +
        "All body fields are optional in the OpenAPI spec. Extra APIActivityItemInfo fields " +
        "may be passed through. Some price plans may reject writes.",
      inputSchema: {
        type: "object" as const,
        properties: activityItemBodyProperties,
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(createAttributeSchema, params);
        const created = await client.post("/attributes", { ...args, id: 0 });
        return mutationToolResult(created);
      },
    },

    erply_update_attribute: {
      description:
        "Update an activity item / custom attribute (PUT /attributes/{activityItemId}). " +
        "Requires activityItemId. Path id wins over body id. Extra APIActivityItemInfo fields " +
        "may be passed through.",
      inputSchema: {
        type: "object" as const,
        properties: {
          activityItemId: { type: "number" as const, description: "Activity item id (required)" },
          ...activityItemBodyProperties,
        },
        required: ["activityItemId"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(updateAttributeSchema, params);
        const { activityItemId, ...body } = args;
        const updated = await client.put(`/attributes/${activityItemId}`, {
          ...body,
          id: activityItemId,
        });
        return mutationToolResult(updated);
      },
    },

    erply_delete_attribute: {
      description:
        "Delete an activity item / custom attribute by id (DELETE /attributes/{activityItemId}). " +
        "Destructive — requires an explicit activityItemId.",
      inputSchema: {
        type: "object" as const,
        properties: {
          activityItemId: {
            type: "number" as const,
            description: "Activity item id to delete (required)",
          },
        },
        required: ["activityItemId"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(deleteAttributeSchema, params);
        const result = await client.delete(`/attributes/${args.activityItemId}`);
        return mutationToolResult(result);
      },
    },

    erply_list_attributes_v2: {
      description: `List activity items / custom attributes (GET /attributes/v2). ${listRawBodyNote}`,
      inputSchema: {
        type: "object" as const,
        properties: listAttributesQueryProperties,
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(listAttributesSchema, params);
        const response = await client.get("/attributes/v2", args);
        return jsonToolResult(response);
      },
    },

    erply_create_attribute_v2: {
      description:
        "Create an activity item / custom attribute (POST /attributes/v2). Sends id: 0. " +
        "All body fields are optional in the OpenAPI spec. Extra APIActivityItemV2Info fields " +
        "may be passed through. Some price plans may reject writes.",
      inputSchema: {
        type: "object" as const,
        properties: activityItemV2BodyProperties,
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(createAttributeV2Schema, params);
        const created = await client.post("/attributes/v2", { ...args, id: 0 });
        return mutationToolResult(created);
      },
    },

    erply_update_attribute_v2: {
      description:
        "Update an activity item / custom attribute (PUT /attributes/v2/{activityItemId}). " +
        "Requires activityItemId. Path id wins over body id. Extra APIActivityItemV2Info fields " +
        "may be passed through.",
      inputSchema: {
        type: "object" as const,
        properties: {
          activityItemId: { type: "number" as const, description: "Activity item id (required)" },
          ...activityItemV2BodyProperties,
        },
        required: ["activityItemId"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(updateAttributeV2Schema, params);
        const { activityItemId, ...body } = args;
        const updated = await client.put(`/attributes/v2/${activityItemId}`, {
          ...body,
          id: activityItemId,
        });
        return mutationToolResult(updated);
      },
    },

    erply_get_attribute_asset_tracker_info: {
      description:
        "Get asset-tracker info (GET /attributes/asset_tracker_info). Returns the raw API body. " +
        "Query params urlId, organisationId, start, and end are optional (start/end are strings " +
        "in the OpenAPI spec).",
      inputSchema: {
        type: "object" as const,
        properties: {
          urlId: { type: "number" as const, description: "Tracker url id" },
          organisationId: { type: "number" as const, description: "Organisation id" },
          start: { type: "string" as const, description: "Range start (OpenAPI type: string)" },
          end: { type: "string" as const, description: "Range end (OpenAPI type: string)" },
        },
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(assetTrackerInfoSchema, params);
        const response = await client.get("/attributes/asset_tracker_info", args);
        return jsonToolResult(response);
      },
    },

    erply_create_attribute_car_in: {
      description:
        "Create a weighbridge / car-in activity (POST /attributes/car_in). Query fields " +
        "(ATTRIBUTE_LICENCEPLATE, weights, customerId, articleId, and related ids) are sent as " +
        "query parameters; APIAttachmentInfo fields are sent as the JSON body. Extra body fields " +
        "may be passed through. Some price plans may reject writes.",
      inputSchema: {
        type: "object" as const,
        properties: {
          ATTRIBUTE_GROSS_WEIGHT: { type: "string" as const, description: "Gross weight" },
          ATTRIBUTE_LICENCEPLATE: { type: "string" as const, description: "Licence plate" },
          ATTRIBUTE_UNLADEN_WEIGHT: { type: "string" as const, description: "Unladen weight" },
          customerId: { type: "number" as const },
          articleId: { type: "number" as const },
          projectId: { type: "number" as const },
          documentInfoId: { type: "number" as const },
          lang: { type: "string" as const },
          status: { type: "string" as const },
          documentType: { type: "string" as const },
          additionalPercentage: { type: "string" as const },
          baseDocumentId: { type: "number" as const },
          editingDocumentId: { type: "number" as const },
          deleteActivityItemIds: { type: "string" as const },
          currency: { type: "string" as const },
          documentId: { type: "number" as const },
          attachmentId: { type: "number" as const },
          partnerDocumentId: { type: "string" as const },
          attributeId: { type: "number" as const },
          folder: {
            type: "string" as const,
            description: "Attachment folder enum (e.g. PURCHASES, ENTITIES, OTHER)",
          },
          typeCode: { type: "string" as const, description: "Attachment typeCode enum" },
          filename: { type: "string" as const },
          base64: { type: "string" as const, description: "Attachment file as base64" },
          number: { type: "string" as const },
          contactName: { type: "string" as const },
          expenseType: { type: "string" as const },
          netTotal: { type: "number" as const },
          taxSum: { type: "number" as const },
          taxRateId: { type: "number" as const },
          total: { type: "number" as const },
          date: { type: "string" as const, description: "Attachment/invoice date (ISO datetime)" },
          description: { type: "string" as const },
          attribute: {
            type: "object" as const,
            description: "Nested APIActivityItemV2Info",
          },
        },
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(createAttributeCarInSchema, params);
        const { query, body } = splitCarInArgs(args);
        const created = await client.post("/attributes/car_in", body, query);
        return mutationToolResult(created);
      },
    },

    erply_create_attributes_for_all_organisations: {
      description:
        "Create an activity item for all organisations (POST /attributes/items_for_all_organisation). " +
        "Sends id: 0. All body fields are optional in the OpenAPI spec. Extra APIActivityItemInfo " +
        "fields may be passed through. Some price plans may reject writes.",
      inputSchema: {
        type: "object" as const,
        properties: activityItemBodyProperties,
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(createAttributeSchema, params);
        const created = await client.post("/attributes/items_for_all_organisation", {
          ...args,
          id: 0,
        });
        return mutationToolResult(created);
      },
    },

    erply_delete_attribute_for_all_organisations: {
      description:
        "Delete activity items by name for all organisations " +
        "(DELETE /attributes/items_for_all_organisation/{name}). Destructive — requires an " +
        "explicit name (URL-encoded in the path).",
      inputSchema: {
        type: "object" as const,
        properties: {
          name: {
            type: "string" as const,
            description: "Attribute name to delete across organisations (required)",
          },
        },
        required: ["name"],
      },
      handler: async (params: unknown) => {
        const args = parseToolArgs(deleteAttributeForAllOrganisationsSchema, params);
        const result = await client.delete(
          `/attributes/items_for_all_organisation/${encodeURIComponent(args.name)}`,
        );
        return mutationToolResult(result);
      },
    },
  };
}
