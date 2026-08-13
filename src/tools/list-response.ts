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

function looksLikeText(buf: Buffer): boolean {
  const n = Math.min(buf.length, 512);
  let printable = 0;
  for (let i = 0; i < n; i++) {
    const c = buf[i];
    if (c === 9 || c === 10 || c === 13 || (c >= 32 && c < 127)) {
      printable++;
    }
  }
  return printable / n > 0.9;
}

/**
 * Encode a raw HTTP body for MCP: JSON if parseable, UTF-8 text if printable, else base64.
 */
export function bytesToolResult(bytes: ArrayBuffer): {
  content: Array<{ type: "text"; text: string }>;
} {
  const buf = Buffer.from(bytes);
  if (buf.length === 0) {
    return jsonToolResult({ encoding: "empty", byteLength: 0 });
  }
  const asText = buf.toString("utf8");
  const trimmed = asText.trimStart();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return jsonToolResult(JSON.parse(asText));
    } catch {
      // fall through
    }
  }
  if (looksLikeText(buf)) {
    return jsonToolResult({ encoding: "utf8", byteLength: buf.length, text: asText });
  }
  return jsonToolResult({
    encoding: "base64",
    byteLength: buf.length,
    data: buf.toString("base64"),
  });
}
