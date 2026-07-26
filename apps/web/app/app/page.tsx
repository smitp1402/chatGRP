'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Network } from 'lucide-react'
import { AppSidebar } from '@/components/app-sidebar'
import { FlowCanvas } from '@/components/canvas/flow-canvas'
import { ChatPanel } from '@/components/chat-panel'
import { createClient } from '@/lib/supabase/client'
import { useSessionStore } from '@/lib/stores/session-store'
import { useCanvasStore } from '@/lib/stores/canvas-store'

export default function AppPage() {
  const router = useRouter()
  const activeId = useSessionStore((s) => s.activeId)
  const { nodes, selectedId, loading, load, select, persistPosition, toggleStar, clear } =
    useCanvasStore()

  // Client-side auth guard — reads the session locally (no network call),
  // so it's instant and can't hang. Replaces the removed Edge middleware.
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace('/login')
    })
  }, [router])

  useEffect(() => {
    if (activeId) void load(activeId)
    else clear()
  }, [activeId, load, clear])

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <AppSidebar />

      <main className="relative flex-1">
        {!activeId ? (
          <CanvasMessage
            title="No session selected"
            body="Create or pick a session in the sidebar to open its graph."
          />
        ) : (
          <>
            <FlowCanvas
              nodes={nodes}
              selectedId={selectedId}
              onSelect={select}
              onMoveNode={persistPosition}
              onToggleStar={toggleStar}
            />

            {nodes.length === 0 && !loading && (
              <CanvasMessage
                title="Empty graph"
                body="Send a message in the chat panel to create your first node."
              />
            )}
          </>
        )}
      </main>

      <ChatPanel />
    </div>
  )
}

function CanvasMessage({ title, body }: { title: string; body: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
      <div className="flex max-w-xs flex-col items-center gap-2 rounded-xl border border-border bg-card/80 px-6 py-5 text-center shadow-sm backdrop-blur">
        <Network className="size-6 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">{body}</p>
      </div>
    </div>
  )
}
