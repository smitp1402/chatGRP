'use client'

import { useEffect } from 'react'
import { Plus, Network } from 'lucide-react'
import { AppSidebar } from '@/components/app-sidebar'
import { FlowCanvas } from '@/components/canvas/flow-canvas'
import { ChatPanel } from '@/components/chat-panel'
import { useSessionStore } from '@/lib/stores/session-store'
import { useCanvasStore } from '@/lib/stores/canvas-store'
// Mock chat content — the chat panel is wired to real data in Phase 2.
import { ACTIVE_BRANCH_IDS, GRAPH_NODES } from '@/lib/chatgrp-data'

const isDev = process.env.NODE_ENV !== 'production'

export default function AppPage() {
  const activeId = useSessionStore((s) => s.activeId)
  const { nodes, selectedId, loading, load, addNode, select, persistPosition, toggleStar, clear } =
    useCanvasStore()

  useEffect(() => {
    if (activeId) void load(activeId)
    else clear()
  }, [activeId, load, clear])

  const branch = ACTIVE_BRANCH_IDS.map((id) => GRAPH_NODES.find((n) => n.id === id)!).filter(Boolean)

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
                title="No nodes yet"
                body="Chat will create nodes in Phase 2. For now, add one to try the canvas."
              />
            )}

            {isDev && (
              <button
                type="button"
                onClick={() => void addNode(activeId, selectedId)}
                className="absolute right-4 top-4 z-10 flex items-center gap-1.5 rounded-lg border border-dashed border-primary/50 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary shadow-sm backdrop-blur transition-colors hover:bg-primary/10"
              >
                <Plus className="size-3.5" />
                {selectedId ? 'Add child node' : 'Add root node'} (dev)
              </button>
            )}
          </>
        )}
      </main>

      <ChatPanel branch={branch} breadcrumb={['Distributed systems', 'Sharding', 'Consistency']} />
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
