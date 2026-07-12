'use client'

import { useMemo, useState } from 'react'
import { AppSidebar } from '@/components/app-sidebar'
import { GraphCanvas } from '@/components/graph-canvas'
import { ChatPanel } from '@/components/chat-panel'
import {
  ACTIVE_BRANCH_IDS,
  GRAPH_EDGES,
  GRAPH_NODES,
} from '@/lib/chatgrp-data'

export default function AppPage() {
  const [selected, setSelected] = useState<string>('n4')

  const branch = useMemo(
    () =>
      ACTIVE_BRANCH_IDS.map((id) => GRAPH_NODES.find((n) => n.id === id)!).filter(Boolean),
    [],
  )

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <AppSidebar activeId="graph-theory" />
      <main className="relative flex-1">
        <GraphCanvas
          nodes={GRAPH_NODES}
          edges={GRAPH_EDGES}
          selectedId={selected}
          onSelect={setSelected}
        />
      </main>
      <ChatPanel
        branch={branch}
        breadcrumb={['Distributed systems', 'Sharding', 'Consistency']}
      />
    </div>
  )
}
