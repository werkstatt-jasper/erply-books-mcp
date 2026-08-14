import type { Attachment } from "../types/attachments.js";

/** Raw OCR lives at `item.alternativeValue9` on GET /attachments/all rows. */
export function ocrTextFromAttachment(row: Attachment | undefined | null): string | null {
  const raw = row?.item?.alternativeValue9;
  return typeof raw === "string" ? raw : null;
}

export function withLiftedOcrText(row: Attachment): Attachment {
  return { ...row, ocrText: ocrTextFromAttachment(row) };
}

export function ocrTextFromListItems(items: Attachment[], attachmentId: number): string | null {
  const match = items.find((row) => row.attachmentId === attachmentId);
  return ocrTextFromAttachment(match);
}
