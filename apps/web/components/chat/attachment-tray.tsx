'use client'

import Image from 'next/image'
import { FileText, Loader2, X } from 'lucide-react'
import { formatBytes } from '@chatgrp/shared'
import type { PendingAttachment } from '@/lib/attachments-client'

/**
 * The strip of pending files above the composer. Each chip shows upload state
 * so a slow upload never looks like a frozen send button.
 */
export function AttachmentTray({
  items,
  onRemove,
}: {
  items: PendingAttachment[]
  onRemove: (localId: string) => void
}) {
  if (items.length === 0) return null

  return (
    <ul className="mb-2 flex flex-wrap gap-2">
      {items.map((item) => (
        <li
          key={item.localId}
          className={
            'group relative flex items-center gap-2 rounded-lg border bg-card py-1 pl-1 pr-7 ' +
            (item.status === 'error' ? 'border-destructive' : 'border-border')
          }
        >
          {item.previewUrl ? (
            <Image
              src={item.previewUrl}
              alt={item.file.name}
              width={32}
              height={32}
              unoptimized
              className="size-8 shrink-0 rounded object-cover"
            />
          ) : (
            <span className="flex size-8 shrink-0 items-center justify-center rounded bg-muted">
              <FileText className="size-4 text-muted-foreground" />
            </span>
          )}

          <span className="flex min-w-0 flex-col leading-tight">
            <span className="max-w-40 truncate text-[11px] text-foreground">
              {item.file.name}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {item.status === 'uploading' ? (
                <span className="flex items-center gap-1">
                  <Loader2 className="size-2.5 animate-spin" />
                  Uploading…
                </span>
              ) : item.status === 'error' ? (
                <span className="text-destructive">{item.error ?? 'Upload failed'}</span>
              ) : (
                formatBytes(item.file.size)
              )}
            </span>
          </span>

          <button
            type="button"
            onClick={() => onRemove(item.localId)}
            aria-label={`Remove ${item.file.name}`}
            className="absolute right-1 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-3" />
          </button>
        </li>
      ))}
    </ul>
  )
}
