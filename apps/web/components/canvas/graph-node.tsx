'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { ChevronDown, ChevronRight, Star } from 'lucide-react'
import { modelById, type ModelId } from '@chatgrp/shared'
import { cn } from '@/lib/utils'

export interface GraphNodeData {
  question: string
  modelId: ModelId | null
  credits: number
  isFork: boolean
  starred: boolean
  collapsed: boolean
  childCount: number
  onToggleStar: (id: string) => void
  onToggleCollapse: (id: string) => void
  [key: string]: unknown
}

const PROVIDER_DOT: Record<string, string> = {
  openai: 'var(--chart-5)',
  anthropic: 'var(--chart-3)',
  google: 'var(--chart-4)',
}

function GraphNodeComponent({ id, data, selected }: NodeProps) {
  const d = data as GraphNodeData
  const model = d.modelId ? modelById(d.modelId) : undefined
  const accent = d.isFork ? 'var(--color-node-fork)' : 'var(--color-node-ai)'
  const label = d.isFork ? 'Fork' : 'AI'

  return (
    <div
      className={cn(
        'flex w-[220px] flex-col rounded-xl border-2 bg-card text-left shadow-sm transition-all',
        'hover:-translate-y-0.5 hover:shadow-md',
        d.isFork ? 'border-dashed' : 'border-solid',
        selected && 'ring-2 ring-ring ring-offset-2 ring-offset-canvas',
      )}
      style={{ borderColor: accent }}
    >
      <Handle type="target" position={Position.Top} className="!size-1.5 !border-0 !bg-muted-foreground" />

      <div className="flex items-center justify-between px-3 pt-2.5">
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-1.5 rounded-full" style={{ backgroundColor: accent }} />
          <span
            className="font-mono text-[10px] font-medium uppercase tracking-wider"
            style={{ color: accent }}
          >
            {label}
          </span>
        </span>
        <button
          type="button"
          aria-label={d.starred ? 'Unstar node' : 'Star node'}
          onClick={(e) => {
            e.stopPropagation()
            d.onToggleStar(id)
          }}
          className={cn(
            'flex size-5 items-center justify-center rounded transition-colors',
            d.starred ? 'text-amber-400' : 'text-muted-foreground/50 hover:text-muted-foreground',
          )}
        >
          <Star className="size-3.5" fill={d.starred ? 'currentColor' : 'none'} />
        </button>
      </div>

      <p className="line-clamp-2 px-3 pt-1 text-[12px] font-medium leading-snug text-card-foreground">
        {d.question || 'Untitled node'}
      </p>

      <div className="mx-3 mt-auto border-t border-border" />
      <div className="flex items-center justify-between px-3 py-2">
        <span className="flex items-center gap-1.5">
          {model && (
            <span
              className="inline-block size-1.5 rounded-full"
              style={{ backgroundColor: PROVIDER_DOT[model.provider] ?? 'var(--muted-foreground)' }}
            />
          )}
          <span className="font-mono text-[10px] text-muted-foreground">
            {model?.name ?? 'No model'}
          </span>
        </span>
        <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
          {d.credits} cr
        </span>
      </div>

      {d.childCount > 0 && (
        <button
          type="button"
          aria-label={d.collapsed ? 'Expand branch' : 'Collapse branch'}
          onClick={(e) => {
            e.stopPropagation()
            d.onToggleCollapse(id)
          }}
          className="absolute -bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-0.5 rounded-full border border-border bg-card px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground shadow-sm hover:text-foreground"
        >
          {d.collapsed ? <ChevronRight className="size-3" /> : <ChevronDown className="size-3" />}
          {d.childCount}
        </button>
      )}

      <Handle type="source" position={Position.Bottom} className="!size-1.5 !border-0 !bg-muted-foreground" />
    </div>
  )
}

export const GraphNode = memo(GraphNodeComponent)
