'use client'

import { useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { forkSharedGraph } from '@/lib/share-client'
import { claimFork } from '@/lib/pending-fork'
import { useSessionStore } from '@/lib/stores/session-store'

/**
 * Finishes a fork that was started from a share link while logged out.
 *
 * The token was parked in localStorage before the sign-up detour; this claims
 * it once the user lands in the app. Also honours `?session=` so a fork made
 * while already signed in opens the copy straight away.
 *
 * Renders nothing.
 */
export function ForkResumer() {
  const searchParams = useSearchParams()
  const loadSessions = useSessionStore((s) => s.load)
  const setActive = useSessionStore((s) => s.setActive)
  const ran = useRef(false)

  useEffect(() => {
    // Strict Mode double-invokes effects; forking twice would duplicate a graph.
    if (ran.current) return
    ran.current = true

    const requested = searchParams.get('session')
    if (requested) {
      setActive(requested)
      return
    }

    const token = claimFork()
    if (!token) return

    const toastId = toast.loading('Forking the shared graph…')
    void forkSharedGraph(token)
      .then(async ({ sessionId, nodeCount }) => {
        await loadSessions()
        setActive(sessionId)
        toast.success('Graph forked', {
          id: toastId,
          description: `${nodeCount} ${nodeCount === 1 ? 'node' : 'nodes'} copied into your account.`,
        })
      })
      .catch((err: unknown) => {
        toast.error(err instanceof Error ? err.message : 'Could not fork that graph.', {
          id: toastId,
        })
      })
  }, [searchParams, loadSessions, setActive])

  return null
}
