'use client'

import { useEffect, useMemo } from 'react'
import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
  type NodeMouseHandler,
  type OnNodeDrag,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { CanvasNode } from '@chatgrp/shared'
import { autoLayout } from '@/lib/layout'
import { GraphNode, type GraphNodeData } from '@/components/canvas/graph-node'

const nodeTypes = { graph: GraphNode }

interface FlowCanvasProps {
  nodes: CanvasNode[]
  selectedId: string | null
  onSelect: (id: string) => void
  onMoveNode: (id: string, x: number, y: number) => void
  onToggleStar: (id: string) => void
}

function Canvas({ nodes, selectedId, onSelect, onMoveNode, onToggleStar }: FlowCanvasProps) {
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<Node>([])
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<Edge>([])

  // Rebuild React Flow nodes whenever the underlying data changes.
  useEffect(() => {
    const layout = autoLayout(nodes)
    setRfNodes(
      nodes.map((n) => ({
        id: n.id,
        type: 'graph',
        position: layout[n.id] ?? { x: 0, y: 0 },
        selected: n.id === selectedId,
        data: {
          question: n.question,
          modelId: n.modelId,
          credits: n.credits,
          isFork: n.isFork,
          starred: n.starred,
          onToggleStar,
        } satisfies GraphNodeData,
      })),
    )
  }, [nodes, selectedId, onToggleStar, setRfNodes])

  useEffect(() => {
    setRfEdges(
      nodes
        .filter((n) => n.parentId)
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
  }, [nodes, setRfEdges])

  const onNodeClick: NodeMouseHandler = (_e, node) => onSelect(node.id)
  const onNodeDragStop: OnNodeDrag = (_e, node) =>
    onMoveNode(node.id, node.position.x, node.position.y)

  const minimapColor = useMemo(
    () => (node: Node) =>
      (node.data as GraphNodeData)?.isFork
        ? 'var(--color-node-fork)'
        : 'var(--color-node-ai)',
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
