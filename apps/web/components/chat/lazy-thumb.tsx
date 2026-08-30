'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { ImageIcon } from 'lucide-react'
import { signedUrlFor } from '@/lib/attachments-client'

/** Start signing once the thumb is within this margin of the viewport. */
const ROOT_MARGIN = '200px'

/**
 * An attachment thumbnail that costs nothing until it is nearly on screen.
 *
 * The bucket is private, so every image needs its own signed URL — a network
 * round trip per thumbnail. Signing the whole branch on mount means a long
 * conversation fires dozens of requests for images the reader may never scroll
 * to. Here each thumb watches itself and signs on first approach, so an
 * unscrolled branch pays for the two or three thumbs actually visible.
 */
export function LazyThumb({
  storagePath,
  fileName,
}: {
  storagePath: string
  fileName: string
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    let cancelled = false

    async function sign() {
      const signed = await signedUrlFor(storagePath)
      if (cancelled) return
      if (signed) setUrl(signed)
      else setFailed(true)
    }

    // No IntersectionObserver (older browsers, jsdom): sign immediately rather
    // than leaving the reader with a permanently empty box.
    if (typeof IntersectionObserver === 'undefined') {
      void sign()
      return () => {
        cancelled = true
      }
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return
        observer.disconnect()
        void sign()
      },
      { rootMargin: ROOT_MARGIN },
    )
    observer.observe(el)

    return () => {
      cancelled = true
      observer.disconnect()
    }
  }, [storagePath])

  return (
    <div
      ref={ref}
      title={fileName}
      className="size-[72px] overflow-hidden rounded-lg border border-border bg-muted"
    >
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" className="block transition-opacity hover:opacity-90">
          <Image
            src={url}
            alt={fileName}
            width={120}
            height={120}
            unoptimized
            loading="lazy"
            className="size-[72px] object-cover"
          />
        </a>
      ) : (
        <div className="flex size-full items-center justify-center">
          <ImageIcon
            className={failed ? 'size-4 text-destructive/60' : 'size-4 animate-pulse text-muted-foreground/50'}
          />
        </div>
      )}
    </div>
  )
}
