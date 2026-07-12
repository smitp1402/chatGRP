'use client'

import { useState } from 'react'
import { ChevronRight, GitFork, SendHorizontal } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { MODELS, type GraphNode, type ModelId, modelById } from '@/lib/chatgrp-data'

type Bubble = {
  id: string
  role: 'user' | 'ai'
  text: string
  model: ModelId
  credits: number
}

function toBubbles(nodes: GraphNode[]): Bubble[] {
  return nodes.map((n) => ({
    id: n.id,
    role: n.role === 'ai' ? 'ai' : 'user',
    text: n.role === 'ai' ? n.answer : n.question,
    model: n.model,
    credits: n.credits,
  }))
}

export function ChatPanel({
  branch,
  breadcrumb,
  readOnly = false,
}: {
  branch: GraphNode[]
  breadcrumb: string[]
  readOnly?: boolean
}) {
  const bubbles = toBubbles(branch)
  const [model, setModel] = useState<ModelId>('claude-3.7')
  const [draft, setDraft] = useState('')
  const active = modelById(model)

  return (
    <div className="flex h-full w-[292px] shrink-0 flex-col border-l border-border bg-background">
      {/* Breadcrumb */}
      <div className="flex h-14 items-center gap-1 overflow-x-auto border-b border-border px-4">
        {breadcrumb.map((crumb, i) => (
          <div key={crumb} className="flex items-center gap-1 whitespace-nowrap">
            {i > 0 && <ChevronRight className="size-3 shrink-0 text-muted-foreground" />}
            <span
              className={cn(
                'text-xs',
                i === breadcrumb.length - 1
                  ? 'font-medium text-foreground'
                  : 'text-muted-foreground',
              )}
            >
              {crumb}
            </span>
          </div>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {bubbles.map((b) =>
          b.role === 'user' ? (
            <div key={b.id} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-node-user px-3 py-2 text-[13px] leading-relaxed text-node-user-foreground">
                {b.text}
              </div>
            </div>
          ) : (
            <div key={b.id} className="flex flex-col items-start gap-1">
              <div className="max-w-[90%] rounded-2xl rounded-bl-sm border border-border bg-card px-3 py-2 text-[13px] leading-relaxed text-card-foreground">
                {b.text}
              </div>
              <div className="flex items-center gap-1.5 pl-1">
                <span
                  className="inline-block size-1.5 rounded-full"
                  style={{ backgroundColor: modelById(b.model).dot }}
                />
                <span className="font-mono text-[10px] text-muted-foreground">
                  {modelById(b.model).name}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground/70">
                  · {b.credits} cr
                </span>
              </div>
            </div>
          ),
        )}
      </div>

      {/* Composer */}
      {!readOnly && (
        <div className="border-t border-border p-3">
          <div className="mb-2 flex items-center gap-1.5">
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground transition-colors hover:bg-accent">
                <span
                  className="inline-block size-1.5 rounded-full"
                  style={{ backgroundColor: active.dot }}
                />
                {active.name}
                <span className="font-mono text-[10px] text-muted-foreground">
                  {active.credits}cr
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52">
                {MODELS.map((m) => (
                  <DropdownMenuItem key={m.id} onClick={() => setModel(m.id)}>
                    <span
                      className="inline-block size-1.5 rounded-full"
                      style={{ backgroundColor: m.dot }}
                    />
                    <span className="flex-1">{m.name}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">{m.credits}cr</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-md border border-dashed border-node-fork/60 px-2 py-1 text-xs text-node-fork transition-colors hover:bg-node-fork/10"
            >
              <GitFork className="size-3.5" />
              Fork
            </button>
          </div>
          <div className="flex items-end gap-2 rounded-xl border border-input bg-card p-2 focus-within:border-ring focus-within:ring-1 focus-within:ring-ring">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (
                  e.key === 'Enter' &&
                  !e.shiftKey &&
                  !e.nativeEvent.isComposing &&
                  e.keyCode !== 229
                ) {
                  e.preventDefault()
                  setDraft('')
                }
              }}
              rows={1}
              placeholder="Ask a follow-up or branch off..."
              className="max-h-32 min-h-8 flex-1 resize-none bg-transparent px-1 py-1 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setDraft('')}
              disabled={!draft.trim()}
              aria-label="Send message"
              className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
            >
              <SendHorizontal className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
