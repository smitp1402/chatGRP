'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, Pencil, Plus, Search, Sparkles, Star, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  MODELS,
  extractVariableNames,
  fillTemplate,
  type ModelId,
  type PromptKind,
  type SavedPrompt,
} from '@chatgrp/shared'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { usePromptStore } from '@/lib/stores/prompt-store'
import { STARTER_PROMPTS } from '@/lib/starter-prompts'

interface PromptLibraryProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Provided when opened from the chat composer to insert into the draft. */
  onInsert?: (text: string, defaultModelId: ModelId | null) => void
  /** Prefill the editor body (e.g. "save current draft"). */
  initialDraft?: string
}

type View = { mode: 'list' } | { mode: 'edit'; prompt: SavedPrompt | null } | { mode: 'fill'; prompt: SavedPrompt }

export function PromptLibrary({ open, onOpenChange, onInsert, initialDraft }: PromptLibraryProps) {
  const { prompts, loading, load, create, update, remove, recordUse } = usePromptStore()
  const [query, setQuery] = useState('')
  const [view, setView] = useState<View>({ mode: 'list' })

  useEffect(() => {
    if (open) void load()
  }, [open, load])

  // Opening with a draft jumps straight to a new-prompt editor.
  useEffect(() => {
    if (open && initialDraft) setView({ mode: 'edit', prompt: null })
    else if (open) setView({ mode: 'list' })
  }, [open, initialDraft])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return prompts
    return prompts.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.body.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q)),
    )
  }, [prompts, query])

  async function handleInsert(prompt: SavedPrompt) {
    const vars = extractVariableNames(prompt.body)
    if (vars.length > 0) {
      setView({ mode: 'fill', prompt })
      return
    }
    onInsert?.(prompt.body, prompt.defaultModelId)
    void recordUse(prompt.id)
    onOpenChange(false)
  }

  async function seedStarter() {
    try {
      for (const p of STARTER_PROMPTS) await create(p)
      toast.success('Starter pack added')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add starter pack')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] w-[min(680px,92vw)] overflow-hidden sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            Prompt Library
          </DialogTitle>
        </DialogHeader>

        {view.mode === 'edit' ? (
          <PromptEditor
            prompt={view.prompt}
            initialBody={view.prompt ? undefined : initialDraft}
            onCancel={() => setView({ mode: 'list' })}
            onSave={async (input) => {
              try {
                if (view.prompt) await update(view.prompt.id, input)
                else await create(input)
                setView({ mode: 'list' })
                toast.success('Prompt saved')
              } catch (err) {
                toast.error(err instanceof Error ? err.message : 'Could not save prompt')
              }
            }}
          />
        ) : view.mode === 'fill' ? (
          <VariableFill
            prompt={view.prompt}
            onCancel={() => setView({ mode: 'list' })}
            onInsert={(text) => {
              onInsert?.(text, view.prompt.defaultModelId)
              void recordUse(view.prompt.id)
              onOpenChange(false)
            }}
          />
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search prompts…"
                  className="pl-8"
                />
              </div>
              <Button size="sm" onClick={() => setView({ mode: 'edit', prompt: null })}>
                <Plus className="size-4" />
                New
              </Button>
            </div>

            <div className="max-h-[52vh] space-y-2 overflow-y-auto pr-1">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    {query ? 'No prompts match.' : 'No saved prompts yet.'}
                  </p>
                  {!query && (
                    <Button variant="outline" size="sm" onClick={seedStarter}>
                      <Sparkles className="size-4" />
                      Add starter pack
                    </Button>
                  )}
                </div>
              ) : (
                filtered.map((p) => (
                  <PromptRow
                    key={p.id}
                    prompt={p}
                    onInsert={onInsert ? () => handleInsert(p) : undefined}
                    onEdit={() => setView({ mode: 'edit', prompt: p })}
                    onDelete={async () => {
                      if (!window.confirm(`Delete "${p.title}"?`)) return
                      await remove(p.id)
                    }}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function PromptRow({
  prompt,
  onInsert,
  onEdit,
  onDelete,
}: {
  prompt: SavedPrompt
  onInsert?: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="group flex items-start gap-2 rounded-lg border border-border bg-card p-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">{prompt.title}</span>
          <span className="rounded bg-accent px-1.5 py-px font-mono text-[10px] text-muted-foreground">
            {prompt.kind === 'system_prompt' ? 'system' : 'prompt'}
          </span>
          {prompt.usageCount > 0 && (
            <span className="inline-flex items-center gap-0.5 font-mono text-[10px] text-muted-foreground">
              <Star className="size-2.5" /> {prompt.usageCount}
            </span>
          )}
        </div>
        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{prompt.body}</p>
        {prompt.tags.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {prompt.tags.map((t) => (
              <span key={t} className="rounded bg-muted px-1.5 py-px text-[10px] text-muted-foreground">
                #{t}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {onInsert && (
          <Button size="sm" variant="secondary" onClick={onInsert}>
            Insert
          </Button>
        )}
        <button
          type="button"
          onClick={onEdit}
          aria-label="Edit prompt"
          className="flex size-7 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Pencil className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label="Delete prompt"
          className="flex size-7 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  )
}

interface EditorInput {
  title: string
  body: string
  kind: PromptKind
  tags: string[]
  defaultModelId: ModelId | null
}

function PromptEditor({
  prompt,
  initialBody,
  onSave,
  onCancel,
}: {
  prompt: SavedPrompt | null
  initialBody?: string
  onSave: (input: EditorInput) => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState(prompt?.title ?? '')
  const [body, setBody] = useState(prompt?.body ?? initialBody ?? '')
  const [kind, setKind] = useState<PromptKind>(prompt?.kind ?? 'user_prompt')
  const [tags, setTags] = useState((prompt?.tags ?? []).join(', '))
  const [defaultModelId, setDefaultModelId] = useState<ModelId | ''>(prompt?.defaultModelId ?? '')
  const [saving, setSaving] = useState(false)

  const vars = extractVariableNames(body)

  async function submit() {
    if (!title.trim() || !body.trim()) {
      toast.error('Title and body are required')
      return
    }
    setSaving(true)
    onSave({
      title: title.trim(),
      body: body.trim(),
      kind,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      defaultModelId: defaultModelId || null,
    })
  }

  const selectClass =
    'h-9 rounded-lg border border-input bg-background px-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring'

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="p-title">Title</Label>
        <Input id="p-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Summarize a paper" />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="p-body">
          Body <span className="text-muted-foreground">— use {'{{variable}}'} placeholders</span>
        </Label>
        <textarea
          id="p-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          placeholder="Summarize {{topic}} in {{count}} bullet points."
          className="resize-none rounded-lg border border-input bg-background p-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        />
        {vars.length > 0 && (
          <p className="text-[11px] text-muted-foreground">
            Variables: {vars.map((v) => `{{${v}}}`).join(', ')}
          </p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col gap-1.5">
          <Label>Kind</Label>
          <select value={kind} onChange={(e) => setKind(e.target.value as PromptKind)} className={selectClass}>
            <option value="user_prompt">User prompt</option>
            <option value="system_prompt">System prompt</option>
          </select>
        </div>
        <div className="col-span-2 flex flex-col gap-1.5">
          <Label>Default model</Label>
          <select
            value={defaultModelId}
            onChange={(e) => setDefaultModelId(e.target.value as ModelId | '')}
            className={selectClass}
          >
            <option value="">None</option>
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="p-tags">Tags (comma-separated)</Label>
        <Input id="p-tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="research, summary" />
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          Save prompt
        </Button>
      </div>
    </div>
  )
}

function VariableFill({
  prompt,
  onInsert,
  onCancel,
}: {
  prompt: SavedPrompt
  onInsert: (text: string) => void
  onCancel: () => void
}) {
  const names = extractVariableNames(prompt.body)
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      names.map((n) => [n, prompt.variables.find((v) => v.name === n)?.default ?? '']),
    ),
  )

  const preview = fillTemplate(prompt.body, values)

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-foreground">Fill in “{prompt.title}”</p>
      {names.map((name) => {
        const meta = prompt.variables.find((v) => v.name === name)
        return (
          <div key={name} className="flex flex-col gap-1.5">
            <Label htmlFor={`v-${name}`}>{meta?.label ?? name}</Label>
            <Input
              id={`v-${name}`}
              value={values[name] ?? ''}
              onChange={(e) => setValues((prev) => ({ ...prev, [name]: e.target.value }))}
              placeholder={`{{${name}}}`}
            />
          </div>
        )
      })}
      <div className="rounded-lg border border-border bg-muted/40 p-2.5 text-xs text-muted-foreground">
        <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider">Preview</span>
        {preview}
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          Back
        </Button>
        <Button onClick={() => onInsert(preview)}>Insert</Button>
      </div>
    </div>
  )
}
