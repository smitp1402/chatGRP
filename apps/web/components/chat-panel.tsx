'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronRight, Download, GitFork, Loader2, SendHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import { modelById, modelsForPlan, type ModelId } from '@chatgrp/shared'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useSessionStore } from '@/lib/stores/session-store'
import { useCanvasStore } from '@/lib/stores/canvas-store'
import { useMeStore } from '@/lib/stores/me-store'
import { pathToRoot, breadcrumbFor } from '@/lib/graph-utils'
import { generateStream } from '@/lib/generate-client'

const PROVIDER_DOT: Record<string, string> = {
  openai: 'var(--chart-5)',
  anthropic: 'var(--chart-3)',
  google: 'var(--chart-4)',
}

export function ChatPanel() {
  const activeId = useSessionStore((s) => s.activeId)
  const nodes = useCanvasStore((s) => s.nodes)
  const selectedId = useCanvasStore((s) => s.selectedId)
  const loadNodes = useCanvasStore((s) => s.load)
  const selectNode = useCanvasStore((s) => s.select)
  const plan = useMeStore((s) => s.plan)
  const loadMe = useMeStore((s) => s.load)

  const availableModels = modelsForPlan(plan)
  const [model, setModel] = useState<ModelId>('gpt-4o-mini')
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [forking, setForking] = useState(false)
  const [pendingQuestion, setPendingQuestion] = useState('')
  const [streamText, setStreamText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const branch = pathToRoot(nodes, selectedId)
  const crumbs = breadcrumbFor(nodes, selectedId)
  const activeModel = modelById(model)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [branch.length, streamText, sending])

  // If the current model isn't available on the user's plan, fall back.
  useEffect(() => {
    if (availableModels.length > 0 && !availableModels.some((m) => m.id === model)) {
      setModel(availableModels[0].id)
    }
  }, [availableModels, model])

  async function handleSend() {
    const message = draft.trim()
    if (!message || sending) return
    if (!activeId) {
      toast.error('Select or create a session first.')
      return
    }

    // Both reply and fork branch off the selected node (parentId = selectedId).
    // Fork just marks the new node as a fork so it renders as a dashed branch.
    const parentId = selectedId

    setSending(true)
    setPendingQuestion(message)
    setStreamText('')
    setDraft('')

    await generateStream(
      { sessionId: activeId, message, modelId: model, parentId, isFork: forking },
      {
        onToken: (chunk) => setStreamText((prev) => prev + chunk),
        onDone: async (nodeId) => {
          await loadNodes(activeId)
          void loadMe()
          selectNode(nodeId)
          setSending(false)
          setForking(false)
          setPendingQuestion('')
          setStreamText('')
        },
        onError: (msg) => {
          toast.error(msg)
          setSending(false)
          setPendingQuestion('')
          setStreamText('')
        },
      },
    )
  }

  function exportBranch() {
    if (!selectedId) return
    window.open(`/api/nodes/${selectedId}/export`, '_blank')
  }

  return (
    <div className="flex h-full w-[292px] shrink-0 flex-col border-l border-border bg-background">
      {/* Breadcrumb */}
      <div className="flex h-14 items-center gap-1 overflow-x-auto border-b border-border px-4">
        {crumbs.length === 0 ? (
          <span className="text-xs text-muted-foreground">New conversation</span>
        ) : (
          crumbs.map((crumb, i) => (
            <div key={`${crumb}-${i}`} className="flex items-center gap-1 whitespace-nowrap">
              {i > 0 && <ChevronRight className="size-3 shrink-0 text-muted-foreground" />}
              <span
                className={cn(
                  'text-xs',
                  i === crumbs.length - 1 ? 'font-medium text-foreground' : 'text-muted-foreground',
                )}
              >
                {crumb}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {branch.length === 0 && !sending && (
          <p className="pt-8 text-center text-xs text-muted-foreground">
            {selectedId ? 'This branch has no messages yet.' : 'Send a message to start the graph.'}
          </p>
        )}

        {branch.map((node) => (
          <div key={node.id} className="space-y-4">
            <UserBubble text={node.question} />
            {node.answer && (
              <AiBubble text={node.answer} modelId={node.modelId} credits={node.credits} />
            )}
          </div>
        ))}

        {sending && (
          <div className="space-y-4">
            <UserBubble text={pendingQuestion} />
            <AiBubble text={streamText} modelId={model} credits={activeModel?.credits ?? 0} streaming />
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="border-t border-border p-3">
        <div className="mb-2 flex items-center gap-1.5">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground transition-colors hover:bg-accent">
              <span
                className="inline-block size-1.5 rounded-full"
                style={{ backgroundColor: PROVIDER_DOT[activeModel?.provider ?? 'openai'] }}
              />
              {activeModel?.name ?? 'Select model'}
              <span className="font-mono text-[10px] text-muted-foreground">
                {activeModel?.credits}cr
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              {availableModels.map((m) => (
                <DropdownMenuItem key={m.id} onClick={() => setModel(m.id)}>
                  <span
                    className="inline-block size-1.5 rounded-full"
                    style={{ backgroundColor: PROVIDER_DOT[m.provider] }}
                  />
                  <span className="flex-1">{m.name}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">{m.credits}cr</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {selectedId && (
            <>
              <button
                type="button"
                onClick={() => setForking((v) => !v)}
                aria-pressed={forking}
                title="Start a new sibling branch"
                className={cn(
                  'flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors',
                  forking
                    ? 'border-node-fork bg-node-fork/15 text-node-fork'
                    : 'border-dashed border-node-fork/60 text-node-fork hover:bg-node-fork/10',
                )}
              >
                <GitFork className="size-3.5" />
                Fork
              </button>
              <button
                type="button"
                onClick={exportBranch}
                title="Export this branch as markdown"
                className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <Download className="size-3.5" />
              </button>
            </>
          )}
        </div>

        {forking && (
          <p className="mb-2 rounded-md bg-node-fork/10 px-2 py-1 text-[11px] text-node-fork">
            Forking — your next message starts a new sibling branch.
          </p>
        )}

        <div className="flex items-end gap-2 rounded-xl border border-input bg-card p-2 focus-within:border-ring focus-within:ring-1 focus-within:ring-ring">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault()
                void handleSend()
              }
            }}
            rows={1}
            placeholder={selectedId ? 'Reply to this node…' : 'Ask anything to start…'}
            className="max-h-32 min-h-8 flex-1 resize-none bg-transparent px-1 py-1 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!draft.trim() || sending}
            aria-label="Send message"
            className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
          >
            {sending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <SendHorizontal className="size-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-node-user px-3 py-2 text-[13px] leading-relaxed text-node-user-foreground">
        {text}
      </div>
    </div>
  )
}

function AiBubble({
  text,
  modelId,
  credits,
  streaming = false,
}: {
  text: string
  modelId: ModelId | null
  credits: number
  streaming?: boolean
}) {
  const model = modelId ? modelById(modelId) : undefined
  return (
    <div className="flex flex-col items-start gap-1">
      <div className="max-w-[90%] rounded-2xl rounded-bl-sm border border-border bg-card px-3 py-2 text-[13px] leading-relaxed text-card-foreground">
        {text || (streaming ? <span className="text-muted-foreground">Thinking…</span> : null)}
        {streaming && text && <span className="ml-0.5 inline-block animate-pulse">▋</span>}
      </div>
      {model && (
        <div className="flex items-center gap-1.5 pl-1">
          <span
            className="inline-block size-1.5 rounded-full"
            style={{ backgroundColor: PROVIDER_DOT[model.provider] }}
          />
          <span className="font-mono text-[10px] text-muted-foreground">{model.name}</span>
          <span className="font-mono text-[10px] text-muted-foreground/70">· {credits} cr</span>
        </div>
      )}
    </div>
  )
}
