'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { BookmarkPlus, ChevronRight, Download, GitFork, Loader2, Paperclip, SendHorizontal, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import {
  ALLOWED_MIME_TYPES,
  MAX_ATTACHMENTS_PER_MESSAGE,
  modelById,
  modelsForPlan,
  type AttachmentInput,
  type CanvasAttachment,
  type ModelId,
} from '@chatgrp/shared'
import { ANALYTICS_EVENTS, track } from '@/lib/analytics'
import { AttachmentTray } from '@/components/chat/attachment-tray'
import { SentAttachments } from '@/components/chat/sent-attachments'
import {
  deleteAttachment,
  makePending,
  releasePending,
  screenFiles,
  uploadAttachment,
  type PendingAttachment,
} from '@/lib/attachments-client'
// Loaded on first open: the library is ~400 lines of dialog that most sessions
// never touch, so its chunk should not sit in the chat panel's initial bundle.
const PromptLibrary = dynamic(
  () => import('@/components/prompts/prompt-library').then((m) => m.PromptLibrary),
  { ssr: false },
)
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
  const defaultModelId = useMeStore((s) => s.defaultModelId)

  const availableModels = modelsForPlan(plan)
  const [model, setModel] = useState<ModelId>('gpt-4o-mini')
  const appliedDefault = useRef(false)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [forking, setForking] = useState(false)
  const [pendingQuestion, setPendingQuestion] = useState('')
  const [streamText, setStreamText] = useState('')
  const [libraryOpen, setLibraryOpen] = useState(false)
  // Sticky: once opened, keep the component mounted so reopening is instant.
  const [libraryLoaded, setLibraryLoaded] = useState(false)
  const [saveDraft, setSaveDraft] = useState<string | undefined>(undefined)
  const [attachments, setAttachments] = useState<PendingAttachment[]>([])
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const branch = pathToRoot(nodes, selectedId)
  const crumbs = breadcrumbFor(nodes, selectedId)
  const activeModel = modelById(model)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [branch.length, streamText, sending])

  // Apply the user's onboarding default model once, if it's available.
  useEffect(() => {
    if (
      !appliedDefault.current &&
      defaultModelId &&
      availableModels.some((m) => m.id === defaultModelId)
    ) {
      setModel(defaultModelId as ModelId)
      appliedDefault.current = true
    }
  }, [defaultModelId, availableModels])

  // If the current model isn't available on the user's plan, fall back.
  useEffect(() => {
    if (availableModels.length > 0 && !availableModels.some((m) => m.id === model)) {
      setModel(availableModels[0].id)
    }
  }, [availableModels, model])

  /** Screen picked files, then upload each one in the background. */
  async function addFiles(files: File[]) {
    if (files.length === 0) return
    if (!activeId) {
      toast.error('Select or create a session first.')
      return
    }

    const { accepted, rejected } = screenFiles(files, attachments.length)
    if (rejected.length > 0) toast.error(rejected.join('\n'))
    if (accepted.length === 0) return

    const pending = accepted.map(makePending)
    setAttachments((prev) => [...prev, ...pending])

    await Promise.all(
      pending.map(async (item) => {
        try {
          const uploaded = await uploadAttachment(item.file, activeId)
          setAttachments((prev) =>
            prev.map((a) =>
              a.localId === item.localId ? { ...a, status: 'ready', uploaded } : a,
            ),
          )
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Upload failed'
          setAttachments((prev) =>
            prev.map((a) =>
              a.localId === item.localId ? { ...a, status: 'error', error: message } : a,
            ),
          )
          toast.error(`${item.file.name}: ${message}`)
        }
      }),
    )
  }

  /** Drop a pending file, deleting the uploaded object if it already landed. */
  function removeAttachment(localId: string) {
    setAttachments((prev) => {
      const target = prev.find((a) => a.localId === localId)
      if (target) {
        releasePending(target)
        if (target.uploaded) void deleteAttachment(target.uploaded.storagePath)
      }
      return prev.filter((a) => a.localId !== localId)
    })
  }

  async function handleSend() {
    const message = draft.trim()
    const ready = attachments.filter((a) => a.status === 'ready' && a.uploaded)
    // An attachment on its own is a valid message — a screenshot with no words.
    if ((!message && ready.length === 0) || sending) return
    if (!activeId) {
      toast.error('Select or create a session first.')
      return
    }
    if (attachments.some((a) => a.status === 'uploading')) {
      toast.error('Wait for uploads to finish.')
      return
    }

    // Both reply and fork branch off the selected node (parentId = selectedId).
    // Fork just marks the new node as a fork so it renders as a dashed branch.
    const parentId = selectedId

    const sent = [...attachments]
    const uploaded: AttachmentInput[] = ready.map((a) => a.uploaded!)

    setSending(true)
    setPendingQuestion(message)
    setStreamText('')
    setDraft('')
    setAttachments([])

    await generateStream(
      {
        sessionId: activeId,
        message,
        modelId: model,
        parentId,
        isFork: forking,
        attachments: uploaded,
      },
      {
        onToken: (chunk) => setStreamText((prev) => prev + chunk),
        onDone: async (nodeId) => {
          // Captured on success only — a failed generation is not activation.
          track(ANALYTICS_EVENTS.messageSent, {
            modelId: model,
            attachmentCount: uploaded.length,
            // First message in THIS session. First-ever is derived in PostHog
            // as the earliest message_sent per identified user.
            isFirstInSession: nodes.length === 0,
          })
          if (forking) track(ANALYTICS_EVENTS.nodeForked, { modelId: model })
          sent.forEach(releasePending)
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
          // Put the files back so a failed send is retryable without re-picking.
          setAttachments(sent)
          setDraft(message)
        },
      },
    )
  }

  function exportBranch() {
    if (!selectedId) return
    window.open(`/api/nodes/${selectedId}/export`, '_blank')
  }

  function insertPrompt(text: string, defaultModelId: ModelId | null) {
    setDraft(text)
    if (defaultModelId && availableModels.some((m) => m.id === defaultModelId)) {
      setModel(defaultModelId)
    }
  }

  function openLibrary() {
    setSaveDraft(undefined)
    setLibraryLoaded(true)
    setLibraryOpen(true)
  }

  function saveDraftAsPrompt() {
    setSaveDraft(draft.trim())
    setLibraryLoaded(true)
    setLibraryOpen(true)
  }

  return (
    <div className="flex h-full w-full min-w-0 flex-col border-l border-border bg-background">
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
            <UserBubble text={node.question} attachments={node.attachments} />
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
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
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

          <button
            type="button"
            onClick={openLibrary}
            title="Prompt library"
            className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Sparkles className="size-3.5" />
            Prompts
          </button>
          {draft.trim() && (
            <button
              type="button"
              onClick={saveDraftAsPrompt}
              title="Save this as a prompt"
              className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <BookmarkPlus className="size-3.5" />
            </button>
          )}

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

        <AttachmentTray items={attachments} onRemove={removeAttachment} />

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ALLOWED_MIME_TYPES.join(',')}
          className="hidden"
          onChange={(e) => {
            void addFiles(Array.from(e.target.files ?? []))
            e.target.value = ''
          }}
        />

        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            void addFiles(Array.from(e.dataTransfer.files))
          }}
          className={cn(
            'flex items-end gap-2 rounded-xl border bg-card p-2 transition-colors focus-within:border-ring focus-within:ring-1 focus-within:ring-ring',
            dragOver ? 'border-primary bg-primary/5' : 'border-input',
          )}
        >
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending || attachments.length >= MAX_ATTACHMENTS_PER_MESSAGE}
            title={
              attachments.length >= MAX_ATTACHMENTS_PER_MESSAGE
                ? `Up to ${MAX_ATTACHMENTS_PER_MESSAGE} files per message`
                : 'Attach files or images'
            }
            aria-label="Attach files or images"
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
          >
            <Paperclip className="size-4" />
          </button>

          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onPaste={(e) => {
              // Screenshots arrive on the clipboard as files, not text.
              const files = Array.from(e.clipboardData.files)
              if (files.length > 0) {
                e.preventDefault()
                void addFiles(files)
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault()
                void handleSend()
              }
            }}
            rows={1}
            placeholder={
              dragOver
                ? 'Drop files to attach…'
                : selectedId
                  ? 'Reply to this node…'
                  : 'Ask anything to start…'
            }
            className="max-h-32 min-h-8 flex-1 resize-none bg-transparent px-1 py-1 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={(!draft.trim() && attachments.length === 0) || sending}
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

      {libraryLoaded && (
        <PromptLibrary
          open={libraryOpen}
          onOpenChange={setLibraryOpen}
          onInsert={insertPrompt}
          initialDraft={saveDraft}
        />
      )}
    </div>
  )
}

function UserBubble({
  text,
  attachments = [],
}: {
  text: string
  attachments?: CanvasAttachment[]
}) {
  return (
    <div className="flex flex-col items-end">
      {text && (
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-node-user px-3 py-2 text-[13px] leading-relaxed text-node-user-foreground">
          {text}
        </div>
      )}
      <SentAttachments items={attachments} />
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
