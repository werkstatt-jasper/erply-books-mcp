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
  return base64ToolResult(buf);
}

/** ZIP local-file / empty-archive / spanned signatures ("PK\x03\x04", "PK\x05\x06", "PK\x07\x08"). */
export function isZipBytes(buf: Buffer): boolean {
  return (
    buf.length >= 4 &&
    buf[0] === 0x50 &&
    buf[1] === 0x4b &&
    ((buf[2] === 0x03 && buf[3] === 0x04) ||
      (buf[2] === 0x05 && buf[3] === 0x06) ||
      (buf[2] === 0x07 && buf[3] === 0x08))
  );
}

function base64ToolResult(buf: Buffer): {
  content: Array<{ type: "text"; text: string }>;
} {
  return jsonToolResult({
    encoding: "base64",
    byteLength: buf.length,
    data: buf.toString("base64"),
  });
}

/**
 * Encode a file download for MCP. A body with a ZIP signature is always base64
 * (never sniffed as text); anything else (e.g. a JSON envelope) uses {@link bytesToolResult}.
 */
export function zipBytesToolResult(bytes: ArrayBuffer): {
  content: Array<{ type: "text"; text: string }>;
} {
  const buf = Buffer.from(bytes);
  return isZipBytes(buf) ? base64ToolResult(buf) : bytesToolResult(bytes);
}

/** File signatures that are always returned as base64 (never sniffed as JSON or text). */
const BINARY_FILE_SIGNATURES: ReadonlyArray<readonly number[]> = [
  [0x25, 0x50, 0x44, 0x46, 0x2d], // %PDF-
  [0x89, 0x50, 0x4e, 0x47], // PNG
  [0xff, 0xd8, 0xff], // JPEG
  [0x47, 0x49, 0x46, 0x38], // GIF8
  [0x49, 0x49, 0x2a, 0x00], // TIFF (little-endian)
  [0x4d, 0x4d, 0x00, 0x2a], // TIFF (big-endian)
];

/** True for PDF, PNG, JPEG, GIF, TIFF or ZIP bytes (by leading signature). */
export function isKnownBinaryFile(buf: Buffer): boolean {
  if (isZipBytes(buf)) return true;
  return BINARY_FILE_SIGNATURES.some(
    (sig) => buf.length >= sig.length && sig.every((b, i) => buf[i] === b),
  );
}

/** True when a Content-Type names a binary file (PDF, images, ZIP, octet-stream, vendor formats). */
export function isBinaryContentType(contentType: string | null | undefined): boolean {
  if (!contentType) return false;
  const mime = contentType
    .replace(/;[\s\S]*$/, "")
    .trim()
    .toLowerCase();
  if (mime.endsWith("+json") || mime.endsWith("+xml")) return false;
  return (
    mime.startsWith("image/") ||
    mime.startsWith("audio/") ||
    mime.startsWith("video/") ||
    mime.startsWith("application/vnd.") ||
    mime === "application/pdf" ||
    mime === "application/octet-stream" ||
    mime === "application/zip" ||
    mime === "application/x-zip-compressed"
  );
}

const RESPONSE_WRAPPER_PATTERN = /^\s*\{\s*"statusType"\s*:\s*"([A-Za-z_]+)"/;

/**
 * Erply sometimes answers a file download with a serialized JAX-RS `Response`
 * object instead of the file, e.g. the 35-byte truncated body
 * `{"statusType":"NO_CONTENT","entity"`. Returns its `statusType` (e.g.
 * `NO_CONTENT`) and whether the JSON is complete, or null for any other body.
 */
export function erplyResponseWrapper(
  buf: Buffer,
): { statusType: string; complete: boolean; parsed?: unknown } | null {
  const head = buf.subarray(0, 256).toString("utf8");
  const match = RESPONSE_WRAPPER_PATTERN.exec(head);
  if (!match) return null;
  const statusType = match[1] as string;
  try {
    return { statusType, complete: true, parsed: JSON.parse(buf.toString("utf8")) };
  } catch {
    return { statusType, complete: false };
  }
}

/**
 * Encode a file download (attachment, attachments ZIP) for MCP:
 * - empty body: `{ encoding: "empty", byteLength: 0, message }`
 * - a complete Erply `NO_CONTENT` response wrapper: the empty marker with
 *   `apiStatus: "NO_CONTENT"` and a message
 * - a truncated Erply response wrapper: throws a clear error (no file bytes)
 * - a known binary signature or binary Content-Type: base64
 * - anything else: {@link bytesToolResult} (JSON stays JSON)
 */
export function fileDownloadToolResult(
  bytes: ArrayBuffer,
  options: { subject: string; contentType?: string | null; emptyMessage?: string },
): { content: Array<{ type: "text"; text: string }> } {
  const buf = Buffer.from(bytes);
  if (buf.length === 0) {
    return jsonToolResult({
      encoding: "empty",
      byteLength: 0,
      message: options.emptyMessage ?? `Erply returned an empty body for ${options.subject}.`,
    });
  }
  const wrapper = erplyResponseWrapper(buf);
  if (wrapper !== null) {
    if (!wrapper.complete) {
      throw new Error(
        `Erply returned a truncated ${wrapper.statusType} response (${buf.length} bytes: ${JSON.stringify(
          buf.subarray(0, 80).toString("utf8"),
        )}) instead of the file for ${options.subject}. The file bytes are not available from this endpoint; try again later or download the file in the Erply Books UI.`,
      );
    }
    if (wrapper.statusType === "NO_CONTENT") {
      return jsonToolResult({
        encoding: "empty",
        byteLength: 0,
        apiStatus: "NO_CONTENT",
        message: `Erply reported NO_CONTENT for ${options.subject}: no file content was returned.`,
      });
    }
  }
  if (isKnownBinaryFile(buf) || isBinaryContentType(options.contentType)) {
    return base64ToolResult(buf);
  }
  return bytesToolResult(bytes);
}
