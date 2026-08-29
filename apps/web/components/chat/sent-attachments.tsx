'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { FileText } from 'lucide-react'
import type { CanvasAttachment } from '@chatgrp/shared'
import { signedUrlFor } from '@/lib/attachments-client'

/**
 * Attachments shown under a sent question in the chat panel.
 *
 * The bucket is private, so image previews need a signed URL each. Only the
 * open branch renders, so this is a handful of requests — the canvas shows a
 * count instead, precisely to avoid signing URLs for every node in the graph.
 */
export function SentAttachments({ items }: { items: CanvasAttachment[] }) {
  const [urls, setUrls] = useState<Record<string, string>>({})

  useEffect(() => {
    let cancelled = false
    const images = items.filter((a) => a.kind === 'image')
    if (images.length === 0) return

    void Promise.all(
      images.map(async (a) => [a.id, await signedUrlFor(a.storagePath)] as const),
    ).then((pairs) => {
      if (cancelled) return
      setUrls(
        Object.fromEntries(pairs.filter(([, url]) => url !== null) as [string, string][]),
      )
    })

    return () => {
      cancelled = true
    }
  }, [items])

  if (items.length === 0) return null

  return (
    <div className="mt-1.5 flex flex-wrap justify-end gap-1.5">
      {items.map((a) =>
        a.kind === 'image' && urls[a.id] ? (
          <a
            key={a.id}
            href={urls[a.id]}
            target="_blank"
            rel="noreferrer"
            title={a.fileName}
            className="block overflow-hidden rounded-lg border border-border transition-opacity hover:opacity-90"
          >
            <Image
              src={urls[a.id]}
              alt={a.fileName}
              width={120}
              height={120}
              unoptimized
              className="size-[72px] object-cover"
            />
          </a>
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
