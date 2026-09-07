'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronRight, CreditCard, Loader2, LogOut, Palette, User } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/page-header'
import { ThemeToggle } from '@/components/theme-toggle'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

type SectionId = 'profile' | 'appearance'

const NAV: { id: SectionId; label: string; icon: React.ElementType }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'appearance', label: 'Appearance', icon: Palette },
]

const NAV_ITEM =
  'flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors'

export default function SettingsPage() {
  const [section, setSection] = useState<SectionId>('profile')

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Settings" />
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 md:flex-row md:px-6">
        {/* Left nav */}
        <nav className="flex shrink-0 gap-1 overflow-x-auto md:w-52 md:flex-col">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setSection(id)}
              className={cn(
                NAV_ITEM,
                section === id
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}

          {/* Billing lives on its own page — link out rather than duplicate it. */}
          <Link
            href="/app/billing"
            className={cn(NAV_ITEM, 'text-muted-foreground hover:bg-accent/60 hover:text-foreground')}
          >
            <CreditCard className="size-4" />
            Billing
            <ChevronRight className="ml-auto hidden size-3.5 opacity-50 md:block" />
          </Link>
        </nav>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {section === 'profile' && <ProfileSection />}
          {section === 'appearance' && <AppearanceSection />}
        </div>
      </div>
    </div>
  )
}

function SectionShell({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section>
      <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <div className="mt-6 flex flex-col gap-6">{children}</div>
    </section>
  )
}

function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-xl border border-border bg-card p-5', className)}>{children}</div>
  )
}

function ProfileSection() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    createClient()
      .auth.getSession()
      .then(({ data }) => {
        setEmail(data.session?.user?.email ?? '')
        setName((data.session?.user?.user_metadata?.full_name as string) ?? '')
      })
  }, [])

  async function saveName() {
    setSaving(true)
    const { error } = await createClient().auth.updateUser({ data: { full_name: name.trim() } })
    setSaving(false)
    if (error) toast.error(error.message)
    else toast.success('Profile updated')
  }

  async function signOut() {
    setSigningOut(true)
    await createClient().auth.signOut()
    router.push('/login')
    router.refresh()
  }

  async function deleteAccount() {
    setDeleting(true)
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error ?? 'Failed to delete account')
      }
      await createClient().auth.signOut()
      router.push('/')
    } catch (err) {
      setDeleting(false)
      toast.error(err instanceof Error ? err.message : 'Could not delete account')
    }
  }

  return (
    <SectionShell title="Profile" description="Manage your account.">
      <Panel className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="size-14">
            <AvatarImage src="/user-avatar.png" alt="Account" />
            <AvatarFallback className="bg-node-user text-node-user-foreground">
              {(name?.[0] ?? email?.[0] ?? 'U').toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{name || email || 'Your account'}</p>
            <p className="truncate text-xs text-muted-foreground">{email}</p>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="displayName">Display name</Label>
          <Input id="displayName" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={email} readOnly className="text-muted-foreground" />
        </div>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => void saveName()} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            Save changes
          </Button>
        </div>
      </Panel>

      <Panel className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-foreground">Sign out</p>
          <p className="text-xs text-muted-foreground">Sign out of ChatGRP on this device.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void signOut()} disabled={signingOut}>
          {signingOut ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
          Sign out
        </Button>
      </Panel>

      <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-foreground">Delete account</p>
            <p className="text-xs text-muted-foreground">
              Permanently delete your account, sessions, and graph history.
            </p>
          </div>
          <Dialog>
            <DialogTrigger render={<Button variant="destructive" size="sm">Delete account</Button>} />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete your account?</DialogTitle>
                <DialogDescription>
                  This permanently removes all of your sessions, graphs, prompts, and billing
                  history. This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="confirm">Type DELETE to confirm</Label>
                <Input
                  id="confirm"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="DELETE"
                />
              </div>
              <DialogFooter>
                <DialogClose render={<Button variant="outline">Cancel</Button>} />
                <Button
                  variant="destructive"
                  disabled={confirmText !== 'DELETE' || deleting}
                  onClick={() => void deleteAccount()}
                >
                  {deleting ? <Loader2 className="size-4 animate-spin" /> : null}
                  Delete account
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </SectionShell>
  )
}

function AppearanceSection() {
  return (
    <SectionShell title="Appearance" description="Customize the look and feel of your workspace.">
      <Panel>
        <p className="mb-3 text-sm font-medium text-foreground">Theme</p>
        <ThemeToggle full />
      </Panel>
    </SectionShell>
  )
}

