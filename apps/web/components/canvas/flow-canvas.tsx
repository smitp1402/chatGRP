'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node,
  type NodeMouseHandler,
  type OnNodeDrag,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Search } from 'lucide-react'
import type { CanvasNode } from '@chatgrp/shared'
import { autoLayout, NODE_HEIGHT, NODE_WIDTH } from '@/lib/layout'
import { childCount, hiddenNodeIds } from '@/lib/graph-utils'
import { GraphNode, type GraphNodeData } from '@/components/canvas/graph-node'

const nodeTypes = { graph: GraphNode }

interface FlowCanvasProps {
  nodes: CanvasNode[]
  selectedId: string | null
  onSelect: (id: string) => void
  onMoveNode: (id: string, x: number, y: number) => void
  onToggleStar: (id: string) => void
  onToggleCollapse: (id: string) => void
  onDeleteNode: (id: string) => void
}

function Canvas({
  nodes,
  selectedId,
  onSelect,
  onMoveNode,
  onToggleStar,
  onToggleCollapse,
  onDeleteNode,
}: FlowCanvasProps) {
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<Node>([])
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [query, setQuery] = useState('')
  const { setCenter } = useReactFlow()

  const layout = useMemo(() => autoLayout(nodes), [nodes])
  const hidden = useMemo(() => hiddenNodeIds(nodes), [nodes])

  useEffect(() => {
    setRfNodes(
      nodes
        .filter((n) => !hidden.has(n.id))
        .map((n) => ({
          id: n.id,
          type: 'graph',
          position: layout[n.id] ?? { x: 0, y: 0 },
          selected: n.id === selectedId,
          data: {
            question: n.question,
            answer: n.answer,
            modelId: n.modelId,
            credits: n.credits,
            isFork: n.isFork,
            starred: n.starred,
            collapsed: n.collapsed,
            childCount: childCount(nodes, n.id),
            onToggleStar,
            onToggleCollapse,
            onDelete: onDeleteNode,
          } satisfies GraphNodeData,
        })),
    )
  }, [nodes, hidden, layout, selectedId, onToggleStar, onToggleCollapse, onDeleteNode, setRfNodes])

  useEffect(() => {
    setRfEdges(
      nodes
        .filter((n) => n.parentId && !hidden.has(n.id) && !hidden.has(n.parentId))
        .map((n) => ({
          id: `${n.parentId}-${n.id}`,
          source: n.parentId as string,
          target: n.id,
          type: 'smoothstep',
          markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--color-muted-foreground)' },
          style: {
            stroke: 'var(--color-muted-foreground)',
            strokeOpacity: 0.5,
            strokeDasharray: n.isFork ? '5 5' : undefined,
          },
        })),
    )
  }, [nodes, hidden, setRfEdges])

  const onNodeClick: NodeMouseHandler = (_e, node) => onSelect(node.id)
  const onNodeDragStop: OnNodeDrag = (_e, node) =>
    onMoveNode(node.id, node.position.x, node.position.y)

  function runSearch(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim().toLowerCase()
    if (!q) return
    const match = nodes.find(
      (n) => n.question.toLowerCase().includes(q) || n.answer.toLowerCase().includes(q),
    )
    if (!match) return
    onSelect(match.id)
    const pos = layout[match.id]
    if (pos) setCenter(pos.x + NODE_WIDTH / 2, pos.y + NODE_HEIGHT / 2, { zoom: 1, duration: 400 })
  }

  const minimapColor = useMemo(
    () => (node: Node) =>
      (node.data as GraphNodeData)?.isFork ? 'var(--color-node-fork)' : 'var(--color-node-ai)',
    [],
  )

  return (
    <ReactFlow
      nodes={rfNodes}
      edges={rfEdges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={onNodeClick}
      onNodeDragStop={onNodeDragStop}
      fitView
      fitViewOptions={{ padding: 0.3, maxZoom: 1 }}
      minZoom={0.3}
      maxZoom={1.8}
      proOptions={{ hideAttribution: true }}
      className="bg-canvas"
    >
      <Panel position="top-left">
        <form onSubmit={runSearch} className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search nodes…"
            className="h-8 w-52 rounded-lg border border-border bg-card/90 pl-8 pr-2 text-xs text-foreground shadow-sm backdrop-blur placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </form>
      </Panel>
      <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--color-border)" />
      <Controls showInteractive={false} />
      <MiniMap
        position="bottom-right"
        nodeColor={minimapColor}
        nodeStrokeWidth={2}
        maskColor="color-mix(in oklch, var(--color-canvas) 70%, transparent)"
        bgColor="var(--color-card)"
        pannable
        zoomable
        style={{ width: 160, height: 108 }}
        className="!rounded-lg !border !border-border"
      />
    </ReactFlow>
  )
}

export function FlowCanvas(props: FlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <Canvas {...props} />
    </ReactFlowProvider>
  )
}
