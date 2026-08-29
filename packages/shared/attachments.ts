/**
 * Attachment contract — shared by the web upload path and the AI layer.
 *
 * Limits are enforced three times: in the browser (fast feedback), in the
 * storage bucket policy (bytes), and in the AI layer (token budget). Keep the
 * numbers here as the single source of truth; the bucket's file_size_limit in
 * migration 0007 mirrors MAX_ATTACHMENT_BYTES.
 */

export type AttachmentKind = "image" | "document";

/** Images the vision models can actually read. */
export const IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const;

/** Text-ish files we inline into the prompt as plain text. */
export const DOCUMENT_MIME_TYPES = [
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  "application/pdf",
] as const;

export const ALLOWED_MIME_TYPES = [
  ...IMAGE_MIME_TYPES,
  ...DOCUMENT_MIME_TYPES,
] as const;

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB — matches the bucket limit
export const MAX_ATTACHMENTS_PER_MESSAGE = 4;

/**
 * Characters of a text document we inline before truncating. At the ~4 chars
 * per token heuristic this is ~3,000 tokens, leaving room under the 4,096
 * input cap for the conversation itself.
 */
export const MAX_DOCUMENT_CHARS = 12_000;

/**
 * Flat token estimate charged per image. Providers price images by tile count
 * and we do not decode dimensions client-side, so we use a deliberately
 * pessimistic constant — a full-page screenshot on GPT-4o lands near this.
 */
export const IMAGE_TOKEN_ESTIMATE = 1_100;

export function kindForMime(mime: string): AttachmentKind | null {
  if ((IMAGE_MIME_TYPES as readonly string[]).includes(mime)) return "image";
  if ((DOCUMENT_MIME_TYPES as readonly string[]).includes(mime)) return "document";
  return null;
}

export function isAllowedMime(mime: string): boolean {
  return kindForMime(mime) !== null;
}

/** A file that has been uploaded to storage and is ready to send. */
export interface AttachmentInput {
  storagePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  kind: AttachmentKind;
}

/** An attachment as stored and read back for display. */
export interface Attachment extends AttachmentInput {
  id: string;
  messageId: string;
}

/** Human-readable size, e.g. "1.4 MB". */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Why a file was rejected, or null if it is acceptable. */
export function rejectionReason(file: {
  type: string;
  size: number;
  name: string;
}): string | null {
  if (!isAllowedMime(file.type)) {
    return `${file.name}: unsupported file type (${file.type || "unknown"})`;
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return `${file.name}: larger than ${formatBytes(MAX_ATTACHMENT_BYTES)}`;
  }
  if (file.size === 0) {
    return `${file.name}: file is empty`;
  }
  return null;
}
