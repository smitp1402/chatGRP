'use client'

import { FileText } from 'lucide-react'
import type { CanvasAttachment } from '@chatgrp/shared'
import { LazyThumb } from '@/components/chat/lazy-thumb'

/**
 * Attachments shown under a sent question in the chat panel.
 *
 * Each image thumbnail signs its own URL only once it nears the viewport (see
 * LazyThumb), so opening a long branch does not fire a signing request per
 * image up front. The canvas shows a paperclip count instead of thumbnails for
 * the same reason.
 */
export function SentAttachments({ items }: { items: CanvasAttachment[] }) {
  if (items.length === 0) return null

  return (
    <div className="mt-1.5 flex flex-wrap justify-end gap-1.5">
      {items.map((a) =>
        a.kind === 'image' ? (
          <LazyThumb key={a.id} storagePath={a.storagePath} fileName={a.fileName} />
        ) : (
          <span
            key={a.id}
            title={a.fileName}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2 py-1.5"
          >
            <FileText className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="max-w-32 truncate text-[11px] text-foreground">{a.fileName}</span>
          </span>
        ),
      )}
    </div>
  )
}
