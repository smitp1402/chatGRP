'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { SessionListItem } from '@chatgrp/shared'
import { Logo } from '@/components/logo'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { ThemeCycle } from '@/components/theme-cycle'
import { useSessionStore } from '@/lib/stores/session-store'
import { useMeStore } from '@/lib/stores/me-store'
import { relativeTime, sessionGroup, type SessionGroupLabel } from '@/lib/time'

const GROUP_ORDER: SessionGroupLabel[] = ['Today', 'Yesterday', 'Last 7 days', 'Older']

export function AppSidebar() {
  const { sessions, activeId, loading, error, create, rename, remove, setActive } =
    useSessionStore()
  const { plan, creditsUsed, creditsCap } = useMeStore()
  const [query, setQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [email, setEmail] = useState<string | null>(null)

  // Sessions + plan are loaded by the app page (so it works even when this
  // sidebar is hidden by a layout preset). We just render the store here.
  useEffect(() => {
    if (error) toast.error(error)
  }, [error])

  useEffect(() => {
    createClient()
      .auth.getSession()
      .then(({ data }) => setEmail(data.session?.user?.email ?? null))
  }, [])

  const filtered = useMemo(
    () => sessions.filter((s) => s.name.toLowerCase().includes(query.toLowerCase())),
    [sessions, query],
  )

  const grouped = useMemo(
    () =>
      GROUP_ORDER.map((group) => ({
        group,
        items: filtered.filter((s) => sessionGroup(s.createdAt) === group),
      })).filter((g) => g.items.length > 0),
    [filtered],
  )

  async function handleNew() {
    setBusy(true)
    try {
      const session = await create('New session')
      setEditingId(session.id)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create session')
    } finally {
      setBusy(false)
    }
  }

  async function handleRename(id: string, name: string) {
    setEditingId(null)
    const current = sessions.find((s) => s.id === id)
    const trimmed = name.trim()
    if (!trimmed || trimmed === current?.name) return
    try {
      await rename(id, trimmed)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not rename session')
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this session and all its nodes? This cannot be undone.')) return
    try {
      await remove(id)
      toast.success('Session deleted')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete session')
    }
  }

  const pct = creditsCap > 0 ? Math.round((creditsUsed / creditsCap) * 100) : 0
  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1)

  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex h-14 items-center px-3">
        <Link href="/app" aria-label="ChatGRP home">
          <Logo />
        </Link>
      </div>

      <div className="flex flex-col gap-2 px-3 pb-2">
        <button
          type="button"
          onClick={handleNew}
          disabled={busy}
          className="flex h-9 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          New session
        </button>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sessions"
            className="h-8 w-full rounded-lg border border-input bg-background pl-8 pr-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-2">
        {loading && sessions.length === 0 ? (
          <SidebarSkeleton />
        ) : grouped.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">
            {query ? 'No sessions found' : 'No sessions yet — create one to start.'}
          </p>
        ) : (
          grouped.map(({ group, items }) => (
            <SessionGroup key={group} label={group}>
              {items.map((s) => (
                <SessionItem
                  key={s.id}
                  session={s}
                  active={s.id === activeId}
                  editing={s.id === editingId}
                  onSelect={() => setActive(s.id)}
                  onStartRename={() => setEditingId(s.id)}
                  onCommitRename={(name) => handleRename(s.id, name)}
                  onDelete={() => handleDelete(s.id)}
                />
              ))}
            </SessionGroup>
          ))
        )}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <Link
          href="/app/billing"
          className="mb-3 block rounded-lg border border-sidebar-border bg-card/50 p-2.5 transition-colors hover:bg-accent"
        >
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="font-medium text-foreground">Credits</span>
            <span className="font-mono text-muted-foreground tabular-nums">
              {creditsUsed.toLocaleString()}/{creditsCap.toLocaleString()}
            </span>
          </div>
          <Progress value={pct} className="h-1.5" />
        </Link>

        <div className="flex items-center gap-1">
          <Link
            href="/app/settings"
            className="flex min-w-0 flex-1 items-center gap-2 rounded-md p-1 transition-colors hover:bg-accent"
          >
            <Avatar className="size-8">
              <AvatarImage src="/user-avatar.png" alt="Account" />
              <AvatarFallback className="bg-node-user text-node-user-foreground text-xs">
                {(email?.[0] ?? 'U').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-foreground">
                {email ?? 'Your account'}
              </p>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-1.5 py-px font-mono text-[10px] font-medium text-primary">
                <Sparkles className="size-2.5" />
                {planLabel}
              </span>
            </div>
          </Link>
          <ThemeCycle />
        </div>
      </div>
    </aside>
  )
}

function SidebarSkeleton() {
  return (
    <div className="flex flex-col gap-1 px-2 py-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-10 animate-pulse rounded-lg bg-accent/50" />
      ))}
    </div>
  )
}

function SessionGroup({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="mb-3">
      <div className="flex items-center gap-1.5 px-2 py-1.5 font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  )
}

interface SessionItemProps {
  session: SessionListItem
  active: boolean
  editing: boolean
  onSelect: () => void
  onStartRename: () => void
  onCommitRename: (name: string) => void
  onDelete: () => void
}

function SessionItem({
  session,
  active,
  editing,
  onSelect,
  onStartRename,
  onCommitRename,
  onDelete,
}: SessionItemProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState(session.name)

  useEffect(() => {
    if (editing) {
      setDraft(session.name)
      requestAnimationFrame(() => inputRef.current?.select())
    }
  }, [editing, session.name])

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => onCommitRename(draft)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onCommitRename(draft)
          if (e.key === 'Escape') onCommitRename(session.name)
        }}
        className="mx-0 h-8 w-full rounded-lg border border-ring bg-background px-2 text-[13px] font-medium text-foreground focus:outline-none"
      />
    )
  }

  return (
    <div
      className={cn(
        'group relative flex cursor-pointer items-center rounded-lg px-2 py-1.5 transition-colors',
        active ? 'bg-accent' : 'hover:bg-accent/60',
      )}
      onClick={onSelect}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-foreground">{session.name}</p>
        <p className="font-mono text-[10px] text-muted-foreground">
          {session.nodeCount} {session.nodeCount === 1 ? 'node' : 'nodes'} ·{' '}
          {relativeTime(session.createdAt)} ago
        </p>
      </div>
      <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          aria-label="Rename session"
          onClick={(e) => {
            e.stopPropagation()
            onStartRename()
          }}
          className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-background hover:text-foreground"
        >
          <Pencil className="size-3" />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Session menu"
            onClick={(e) => e.stopPropagation()}
            className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-background hover:text-foreground"
          >
            <MoreHorizontal className="size-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={onStartRename}>
              <Pencil className="size-3.5" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              Delete session
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
