'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  MoreHorizontal,
  Pencil,
  Pin,
  Plus,
  Search,
  Settings,
  Sparkles,
} from 'lucide-react'
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
import { CREDITS, SESSIONS, type Session } from '@/lib/chatgrp-data'

const GROUP_ORDER: Session['group'][] = ['Today', 'Yesterday', 'Last 7 days']

export function AppSidebar({ activeId }: { activeId?: string }) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(
    () => SESSIONS.filter((s) => s.name.toLowerCase().includes(query.toLowerCase())),
    [query],
  )
  const pinned = filtered.filter((s) => s.pinned)
  const grouped = GROUP_ORDER.map((group) => ({
    group,
    items: filtered.filter((s) => !s.pinned && s.group === group),
  })).filter((g) => g.items.length > 0)

  const pct = Math.round((CREDITS.used / CREDITS.total) * 100)

  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      {/* Header */}
      <div className="flex h-14 items-center px-3">
        <Link href="/app" aria-label="ChatGRP home">
          <Logo />
        </Link>
      </div>

      <div className="flex flex-col gap-2 px-3 pb-2">
        <button
          type="button"
          className="flex h-9 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="size-4" />
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

      {/* Session list */}
      <nav className="flex-1 overflow-y-auto px-2 pb-2">
        {pinned.length > 0 && (
          <SessionGroup label="Pinned" icon={<Pin className="size-3" />}>
            {pinned.map((s) => (
              <SessionItem key={s.id} session={s} active={s.id === activeId} />
            ))}
          </SessionGroup>
        )}
        {grouped.map(({ group, items }) => (
          <SessionGroup key={group} label={group}>
            {items.map((s) => (
              <SessionItem key={s.id} session={s} active={s.id === activeId} />
            ))}
          </SessionGroup>
        ))}
        {filtered.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">No sessions found</p>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3">
        <Link
          href="/app/billing"
          className="mb-3 block rounded-lg border border-sidebar-border bg-card/50 p-2.5 transition-colors hover:bg-accent"
        >
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="font-medium text-foreground">Credits</span>
            <span className="font-mono text-muted-foreground tabular-nums">
              {CREDITS.used.toLocaleString()}/{(CREDITS.total / 1000).toFixed(0)}k
            </span>
          </div>
          <Progress value={pct} className="h-1.5" />
        </Link>

        <div className="flex items-center gap-2">
          <Avatar className="size-8">
            <AvatarImage src="/user-avatar.png" alt="Avery Chen" />
            <AvatarFallback className="bg-node-user text-node-user-foreground text-xs">AC</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-foreground">Avery Chen</p>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-1.5 py-px font-mono text-[10px] font-medium text-primary">
              <Sparkles className="size-2.5" />
              Pro
            </span>
          </div>
          <Link
            href="/app/settings"
            aria-label="Settings"
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Settings className="size-4" />
          </Link>
        </div>
      </div>
    </aside>
  )
}

function SessionGroup({
  label,
  icon,
  children,
}: {
  label: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="mb-3">
      <div className="flex items-center gap-1.5 px-2 py-1.5 font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  )
}

function SessionItem({ session, active }: { session: Session; active?: boolean }) {
  return (
    <div
      className={cn(
        'group relative flex cursor-pointer items-center rounded-lg px-2 py-1.5 transition-colors',
        active ? 'bg-accent' : 'hover:bg-accent/60',
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-foreground">{session.name}</p>
        <p className="font-mono text-[10px] text-muted-foreground">
          {session.nodeCount} nodes · {session.updatedAt} ago
        </p>
      </div>
      <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          aria-label="Rename session"
          className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-background hover:text-foreground"
        >
          <Pencil className="size-3" />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Session menu"
            className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-background hover:text-foreground"
          >
            <MoreHorizontal className="size-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem>
              <Pin className="size-3.5" />
              {session.pinned ? 'Unpin' : 'Pin'}
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Pencil className="size-3.5" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">Delete session</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
