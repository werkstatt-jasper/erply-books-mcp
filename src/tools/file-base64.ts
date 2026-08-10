/**
 * Normalize and validate a base64 file payload from MCP tool args.
 * Strips whitespace; rejects empty / invalid / empty-decoded input.
 */
export function normalizeFileBase64(fileBase64: string): string {
  const normalized = fileBase64.replace(/\s/g, "");
  if (normalized.length === 0) {
    throw new Error("fileBase64: empty");
  }
  if (!/^[A-Za-z0-9+/]+=*$/.test(normalized)) {
    throw new Error("fileBase64: invalid base64 characters");
  }
  const bytes = Buffer.from(normalized, "base64");
  if (bytes.length === 0) {
    throw new Error("fileBase64: decoded file is empty");
  }
  return normalized;
}

/** Decode a base64 payload into a `File` for multipart uploads. */
export function decodeBase64File(fileBase64: string, fileName: string): File {
  const normalized = normalizeFileBase64(fileBase64);
  const bytes = Buffer.from(normalized, "base64");
  return new File([bytes], fileName);
}
