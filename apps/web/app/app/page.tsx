'use client'

import { Suspense, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Network } from 'lucide-react'
import { AppSidebar } from '@/components/app-sidebar'
import { FlowCanvas } from '@/components/canvas/flow-canvas'
import { ChatPanel } from '@/components/chat-panel'
import { LayoutSwitcher } from '@/components/layout/layout-switcher'
import { ShareButton } from '@/components/share-button'
import { ForkResumer } from '@/components/fork-resumer'
import { ResizableSplit } from '@/components/layout/resizable-split'
import { createClient } from '@/lib/supabase/client'
import { useSessionStore } from '@/lib/stores/session-store'
import { useCanvasStore } from '@/lib/stores/canvas-store'
import { useMeStore } from '@/lib/stores/me-store'
import { LAYOUT_PRESETS, useLayoutStore } from '@/lib/stores/layout-store'

export default function AppPage() {
  const router = useRouter()
  const activeId = useSessionStore((s) => s.activeId)
  const loadSessions = useSessionStore((s) => s.load)
  const loadMe = useMeStore((s) => s.load)
  const meLoaded = useMeStore((s) => s.loaded)
  const onboarded = useMeStore((s) => s.onboarded)
  const preset = useLayoutStore((s) => s.preset)
  const cfg = LAYOUT_PRESETS[preset]
  const { nodes, selectedId, loading, error, load, select, persistPosition, toggleStar, toggleCollapse, removeNode, clear } =
    useCanvasStore()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace('/login')
    })
  }, [router])

  useEffect(() => {
    if (error) toast.error(`Canvas load failed: ${error}`)
  }, [error])

  // Load sessions + plan regardless of whether the sidebar is visible.
  useEffect(() => {
    void loadSessions()
    void loadMe()
  }, [loadSessions, loadMe])

  // First-time users go through onboarding once (gated on loaded, so no flash).
  useEffect(() => {
    if (meLoaded && !onboarded) router.replace('/onboarding')
  }, [meLoaded, onboarded, router])

  useEffect(() => {
    if (activeId) void load(activeId)
    else clear()
  }, [activeId, load, clear])

  const canvasArea = (
    <div className="relative h-full">
      <FlowCanvas
        nodes={nodes}
        selectedId={selectedId}
        onSelect={select}
        onMoveNode={persistPosition}
        onToggleStar={toggleStar}
        onToggleCollapse={toggleCollapse}
        onDeleteNode={removeNode}
      />
      {nodes.length === 0 && !loading && (
        <CanvasMessage
          title="Empty graph"
          body="Send a message in the chat panel to create your first node."
        />
      )}
    </div>
  )

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Completes a fork started from a share link; useSearchParams needs a boundary. */}
      <Suspense fallback={null}>
        <ForkResumer />
      </Suspense>

      {cfg.sidebar && <AppSidebar />}

      <div className="relative flex-1">
        <div className="absolute right-4 top-3 z-30 flex items-center gap-2">
          {activeId && <ShareButton sessionId={activeId} />}
          <LayoutSwitcher />
        </div>

        {!activeId ? (
          <CanvasMessage
            title="No session selected"
            body="Create or pick a session in the sidebar to open its graph."
          />
        ) : cfg.chat ? (
          <ResizableSplit
            key={preset}
            storageKey={`chatgrp-ws-${preset}`}
            initial={cfg.canvasSize}
            min={30}
            max={80}
            left={canvasArea}
            right={<ChatPanel />}
          />
        ) : (
          canvasArea
        )}
      </div>
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
