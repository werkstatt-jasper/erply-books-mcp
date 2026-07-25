/**
 * Erply Books list GETs return `{ items, totalCount, organisation }`.
 * When there are no rows, `items` is often `null` (not `[]`).
 */
export type ErplyListEnvelope<T = unknown> = {
  items?: T[] | null;
  totalCount?: number | null;
  organisation?: unknown;
};

/** Strip the repeated organisation blob; normalize null items to []. */
export function unwrapListEnvelope<T = unknown>(
  response: unknown,
): { totalCount: number | null; items: T[] } {
  if (response === null || typeof response !== "object" || Array.isArray(response)) {
    throw new Error(
      `Expected Erply list envelope object, got ${response === null ? "null" : Array.isArray(response) ? "array" : typeof response}`,
    );
  }
  const envelope = response as ErplyListEnvelope<T>;
  const items = Array.isArray(envelope.items) ? envelope.items : [];
  const totalCount =
    typeof envelope.totalCount === "number" && Number.isFinite(envelope.totalCount)
      ? envelope.totalCount
      : null;
  return { totalCount, items };
}

export function jsonToolResult(payload: unknown): {
  content: Array<{ type: "text"; text: string }>;
} {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
  };
}

/** Normalize DELETE/204 (undefined) to a JSON-friendly `{ ok: true }`. */
export function mutationToolResult(payload: unknown): {
  content: Array<{ type: "text"; text: string }>;
} {
  return jsonToolResult(payload === undefined ? { ok: true } : payload);
}
