'use client'

import { useCallback, useRef, useState } from 'react'
import { Maximize2, Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  type GraphEdge,
  type GraphNode,
  type NodeRole,
  modelById,
} from '@/lib/chatgrp-data'

const NODE_W = 210
const NODE_H = 108

const ROLE_STYLES: Record<
  NodeRole,
  { border: string; accent: string; label: string }
> = {
  user: {
    border: 'border-[color:var(--color-node-user)]',
    accent: 'var(--color-node-user)',
    label: 'You',
  },
  ai: {
    border: 'border-[color:var(--color-node-ai)]',
    accent: 'var(--color-node-ai)',
    label: 'AI',
  },
  fork: {
    border: 'border-dashed border-[color:var(--color-node-fork)]',
    accent: 'var(--color-node-fork)',
    label: 'Fork',
  },
}

function edgePath(from: GraphNode, to: GraphNode) {
  const sx = from.x + NODE_W / 2
  const sy = from.y + NODE_H
  const tx = to.x + NODE_W / 2
  const ty = to.y
  const midY = sy + (ty - sy) / 2
  return `M ${sx} ${sy} C ${sx} ${midY}, ${tx} ${midY}, ${tx} ${ty}`
}

export function GraphCanvas({
  nodes,
  edges,
  selectedId,
  onSelect,
  className,
}: {
  nodes: GraphNode[]
  edges: GraphEdge[]
  selectedId?: string | null
  onSelect?: (id: string) => void
  className?: string
}) {
  const [scale, setScale] = useState(0.9)
  const [offset, setOffset] = useState({ x: 24, y: 12 })
  const dragState = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)
  const [dragging, setDragging] = useState(false)

  const byId = useCallback((id: string) => nodes.find((n) => n.id === id), [nodes])

  const zoom = (delta: number) =>
    setScale((s) => Math.min(1.8, Math.max(0.4, +(s + delta).toFixed(2))))

  const reset = () => {
    setScale(0.9)
    setOffset({ x: 24, y: 12 })
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('[data-node]')) return
    dragState.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y }
    setDragging(true)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragState.current) return
    setOffset({
      x: dragState.current.ox + (e.clientX - dragState.current.x),
      y: dragState.current.oy + (e.clientY - dragState.current.y),
    })
  }
  const onPointerUp = () => {
    dragState.current = null
    setDragging(false)
  }

  return (
    <div
      className={cn(
        'relative h-full w-full overflow-hidden bg-canvas canvas-grid',
        dragging ? 'cursor-grabbing' : 'cursor-grab',
        className,
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      {/* Zoom / pan tools */}
      <div className="absolute left-4 top-4 z-20 flex items-center gap-1 rounded-lg border border-border bg-surface-2/90 p-1 shadow-[var(--elevation-1)] backdrop-blur">
        <button
          type="button"
          onClick={() => zoom(-0.1)}
          className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Zoom out"
        >
          <Minus className="size-4" />
        </button>
        <span className="min-w-11 text-center font-mono text-xs text-muted-foreground tabular-nums">
          {Math.round(scale * 100)}%
        </span>
        <button
          type="button"
          onClick={() => zoom(0.1)}
          className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Zoom in"
        >
          <Plus className="size-4" />
        </button>
        <div className="mx-0.5 h-5 w-px bg-border" />
        <button
          type="button"
          onClick={reset}
          className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Reset view"
        >
          <Maximize2 className="size-4" />
        </button>
      </div>

      {/* Graph surface */}
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}
      >
        <svg width={720} height={780} className="block overflow-visible">
          <defs>
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-muted-foreground)" />
            </marker>
          </defs>
          {edges.map((edge, i) => {
            const from = byId(edge.from)
            const to = byId(edge.to)
            if (!from || !to) return null
            const isFork = to.role === 'fork' || byId(to.id)?.role === 'fork'
            return (
              <path
                key={`${edge.from}-${edge.to}-${i}`}
                d={edgePath(from, to)}
                fill="none"
                stroke="var(--color-muted-foreground)"
                strokeOpacity={0.55}
                strokeWidth={1.5}
                strokeDasharray={isFork ? '5 5' : undefined}
                markerEnd="url(#arrow)"
              />
            )
          })}
        </svg>

        {/* Nodes as absolutely positioned HTML for clean typography */}
        {nodes.map((node) => {
          const role = ROLE_STYLES[node.role]
          const model = modelById(node.model)
          const selected = selectedId === node.id
          return (
            <button
              type="button"
              key={node.id}
              data-node
              onClick={() => onSelect?.(node.id)}
              className={cn(
                'absolute flex flex-col rounded-xl border-2 bg-card text-left shadow-sm transition-all',
                'hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                role.border,
                selected && 'ring-2 ring-ring ring-offset-2 ring-offset-canvas',
              )}
              style={{ left: node.x, top: node.y, width: NODE_W, height: NODE_H }}
            >
              <div className="flex items-center gap-1.5 px-3 pt-2.5">
                <span
                  className="inline-block size-1.5 rounded-full"
                  style={{ backgroundColor: role.accent }}
                />
                <span
                  className="font-mono text-[10px] font-medium uppercase tracking-wider"
                  style={{ color: role.accent }}
                >
                  {role.label}
                </span>
              </div>
              <p className="line-clamp-2 px-3 pt-1 text-[12px] font-medium leading-snug text-card-foreground">
                {node.question}
              </p>
              <div className="mx-3 mt-auto border-t border-border" />
              <div className="flex items-center justify-between px-3 py-2">
                <span className="flex items-center gap-1.5">
                  <span
                    className="inline-block size-1.5 rounded-full"
                    style={{ backgroundColor: model.dot }}
                  />
                  <span className="font-mono text-[10px] text-muted-foreground">{model.name}</span>
                </span>
                <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                  {node.credits} cr
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-20 flex flex-col gap-1.5 rounded-lg border border-border bg-card/90 px-3 py-2.5 text-[11px] shadow-sm backdrop-blur">
        <LegendRow color="var(--color-node-user)" label="Your message" />
        <LegendRow color="var(--color-node-ai)" label="AI reply" />
        <LegendRow color="var(--color-node-fork)" label="Fork / branch" dashed />
      </div>
    </div>
  )
}

function LegendRow({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <span
        className={cn('inline-block h-2.5 w-4 rounded-sm border-2')}
        style={{
          borderColor: color,
          borderStyle: dashed ? 'dashed' : 'solid',
          backgroundColor: dashed ? 'transparent' : `color-mix(in oklch, ${color} 25%, transparent)`,
        }}
      />
      {label}
    </div>
  )
}
