'use client'

import { useState } from 'react'
import { Check, Loader2, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import { createShareLink } from '@/lib/share-client'
import { cn } from '@/lib/utils'

/**
 * Mints a read-only link for the active session and copies it to the clipboard.
 * The token is created once and reused, so clicking twice yields the same URL.
 */
export function ShareButton({ sessionId }: { sessionId: string }) {
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  async function share() {
    setBusy(true)
    try {
      const token = await createShareLink(sessionId)
      const url = `${window.location.origin}/share/${token}`
      await navigator.clipboard?.writeText(url)
      setCopied(true)
      toast.success('Share link copied', { description: url })
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create a share link')
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={() => void share()}
      disabled={busy}
      title="Copy a read-only link to this session"
      className={cn(
        'flex items-center gap-1.5 rounded-lg border border-border bg-card/90 px-2.5 py-1.5',
        'text-xs font-medium text-foreground shadow-sm backdrop-blur transition-colors',
        'hover:bg-accent disabled:opacity-60',
      )}
    >
      {busy ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : copied ? (
        <Check className="size-3.5 text-primary" />
      ) : (
        <Share2 className="size-3.5" />
      )}
      {copied ? 'Copied' : 'Share'}
    </button>
  )
}
