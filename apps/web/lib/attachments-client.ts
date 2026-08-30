import { createClient } from "@/lib/supabase/client"
import {
  MAX_ATTACHMENTS_PER_MESSAGE,
  kindForMime,
  rejectionReason,
  type AttachmentInput,
} from "@chatgrp/shared"

const BUCKET = "attachments"

/** A file picked in the UI, before or during upload. */
export interface PendingAttachment {
  /** Stable client-side id so React keys survive re-renders. */
  localId: string
  file: File
  /** Object URL for image previews; revoked on removal. */
  previewUrl: string | null
  status: "uploading" | "ready" | "error"
  error?: string
  uploaded?: AttachmentInput
}

export function makePending(file: File): PendingAttachment {
  const isImage = kindForMime(file.type) === "image"
  return {
    localId: crypto.randomUUID(),
    file,
    previewUrl: isImage ? URL.createObjectURL(file) : null,
    status: "uploading",
  }
}

export function releasePending(pending: PendingAttachment): void {
  if (pending.previewUrl) URL.revokeObjectURL(pending.previewUrl)
}

/**
 * Validate a batch of picked files against the per-message cap and per-file
 * rules. Returns the files worth uploading plus a message for everything
 * rejected, so the caller can surface one toast instead of many.
 */
export function screenFiles(
  files: File[],
  alreadyAttached: number,
): { accepted: File[]; rejected: string[] } {
  const rejected: string[] = []
  const accepted: File[] = []

  for (const file of files) {
    const reason = rejectionReason(file)
    if (reason) {
      rejected.push(reason)
      continue
    }
    if (alreadyAttached + accepted.length >= MAX_ATTACHMENTS_PER_MESSAGE) {
      rejected.push(`${file.name}: over the ${MAX_ATTACHMENTS_PER_MESSAGE}-file limit`)
      continue
    }
    accepted.push(file)
  }

  return { accepted, rejected }
}

function extensionFor(file: File): string {
  const fromName = file.name.includes(".") ? file.name.split(".").pop() : null
  if (fromName && /^[a-z0-9]{1,8}$/i.test(fromName)) return fromName.toLowerCase()
  return file.type.split("/").pop() ?? "bin"
}

/**
 * Upload one file to `{userId}/{sessionId}/{uuid}.{ext}` in the private
 * attachments bucket. The path's first segment is what the storage RLS policy
 * checks against auth.uid(), so it must stay the user id.
 */
export async function uploadAttachment(
  file: File,
  sessionId: string,
): Promise<AttachmentInput> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not signed in")

  const kind = kindForMime(file.type)
  if (!kind) throw new Error(`Unsupported file type: ${file.type || "unknown"}`)

  const storagePath = `${user.id}/${sessionId}/${crypto.randomUUID()}.${extensionFor(file)}`

  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, file, {
    contentType: file.type,
    upsert: false,
  })
  if (error) throw new Error(error.message)

  return {
    storagePath,
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    kind,
  }
}

/** Remove an uploaded object — used when the user drops a file before sending. */
export async function deleteAttachment(storagePath: string): Promise<void> {
  const supabase = createClient()
  await supabase.storage.from(BUCKET).remove([storagePath])
}

/**
 * Short-lived signed URL for displaying a private object. The bucket is not
 * public, so thumbnails and previews must go through this.
 */
export async function signedUrlFor(
  storagePath: string,
  expiresInSeconds = 3600,
): Promise<string | null> {
  const supabase = createClient()
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds)
  if (error) return null
  return data?.signedUrl ?? null
}
