'use client'

import { useState } from 'react'
import {
  Bell,
  Lock,
  Palette,
  ShieldAlert,
  User,
} from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { ThemeToggle } from '@/components/theme-toggle'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
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

type SectionId = 'profile' | 'appearance' | 'notifications' | 'privacy' | 'danger'

const NAV: { id: SectionId; label: string; icon: React.ElementType }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'privacy', label: 'Privacy', icon: Lock },
  { id: 'danger', label: 'Danger Zone', icon: ShieldAlert },
]

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
                'flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                section === id
                  ? id === 'danger'
                    ? 'bg-destructive/10 text-destructive'
                    : 'bg-accent text-foreground'
                  : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {section === 'profile' && <ProfileSection />}
          {section === 'appearance' && <AppearanceSection />}
          {section === 'notifications' && <NotificationsSection />}
          {section === 'privacy' && <PrivacySection />}
          {section === 'danger' && <DangerSection />}
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

function Row({
  title,
  description,
  control,
}: {
  title: string
  description: string
  control: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  )
}

function ProfileSection() {
  return (
    <SectionShell title="Profile" description="Manage how you appear across ChatGRP.">
      <Panel>
        <div className="flex items-center gap-4">
          <Avatar className="size-16">
            <AvatarImage src="/user-avatar.png" alt="Avery Chen" />
            <AvatarFallback className="bg-node-user text-node-user-foreground">AC</AvatarFallback>
          </Avatar>
          <div>
            <Button variant="outline" size="sm">
              Upload new photo
            </Button>
            <p className="mt-1.5 text-xs text-muted-foreground">JPG or PNG, up to 2MB.</p>
          </div>
        </div>
      </Panel>

      <Panel className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="displayName">Display name</Label>
          <Input id="displayName" defaultValue="Avery Chen" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" defaultValue="avery@chatgrp.io" readOnly className="text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Your email is managed by your workspace.</p>
        </div>
        <div className="flex items-center justify-between border-t border-border pt-4">
          <div>
            <p className="text-sm font-medium text-foreground">Password</p>
            <p className="text-xs text-muted-foreground">Last changed 3 months ago</p>
          </div>
          <Button variant="outline" size="sm">
            Change password
          </Button>
        </div>
        <div className="flex justify-end">
          <Button size="sm">Save changes</Button>
        </div>
      </Panel>
    </SectionShell>
  )
}

function AppearanceSection() {
  const [layout, setLayout] = useState('tree')
  const [density, setDensity] = useState('expanded')

  return (
    <SectionShell title="Appearance" description="Customize the look and feel of your workspace.">
      <Panel>
        <p className="mb-3 text-sm font-medium text-foreground">Theme</p>
        <ThemeToggle full />
      </Panel>

      <Panel>
        <p className="mb-3 text-sm font-medium text-foreground">Graph layout</p>
        <RadioGroup value={layout} onValueChange={(v) => setLayout(v as string)} className="grid-cols-3 gap-3">
          {[
            { v: 'tree', label: 'Tree', desc: 'Top-down hierarchy' },
            { v: 'radial', label: 'Radial', desc: 'Nodes around a center' },
            { v: 'force', label: 'Force', desc: 'Physics-based layout' },
          ].map((o) => (
            <label
              key={o.v}
              className={cn(
                'flex cursor-pointer flex-col gap-1 rounded-lg border p-3 transition-colors',
                layout === o.v ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent/50',
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">{o.label}</span>
                <RadioGroupItem value={o.v} />
              </div>
              <span className="text-xs text-muted-foreground">{o.desc}</span>
            </label>
          ))}
        </RadioGroup>
      </Panel>

      <Panel>
        <p className="mb-3 text-sm font-medium text-foreground">Node density</p>
        <RadioGroup value={density} onValueChange={(v) => setDensity(v as string)} className="grid-cols-2 gap-3">
          {[
            { v: 'compact', label: 'Compact', desc: 'Question only, smaller nodes' },
            { v: 'expanded', label: 'Expanded', desc: 'Question and answer preview' },
          ].map((o) => (
            <label
              key={o.v}
              className={cn(
                'flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors',
                density === o.v ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent/50',
              )}
            >
              <div>
                <p className="text-sm font-medium text-foreground">{o.label}</p>
                <p className="text-xs text-muted-foreground">{o.desc}</p>
              </div>
              <RadioGroupItem value={o.v} />
            </label>
          ))}
        </RadioGroup>
      </Panel>
    </SectionShell>
  )
}

function NotificationsSection() {
  return (
    <SectionShell title="Notifications" description="Choose what ChatGRP emails you about.">
      <Panel className="divide-y divide-border">
        <Row
          title="Weekly email digest"
          description="A summary of your sessions and activity."
          control={<Switch defaultChecked />}
        />
        <Row
          title="Low credit warning"
          description="Alert me when my balance drops below 20%."
          control={<Switch defaultChecked />}
        />
        <Row
          title="Product updates"
          description="News about new models and features."
          control={<Switch />}
        />
      </Panel>
    </SectionShell>
  )
}

function PrivacySection() {
  return (
    <SectionShell title="Privacy" description="Control your data and session visibility.">
      <Panel className="divide-y divide-border">
        <Row
          title="Make new sessions private by default"
          description="Sessions won't be shareable unless you enable it."
          control={<Switch defaultChecked />}
        />
        <Row
          title="Allow model training on my data"
          description="Help improve responses. Never includes shared links."
          control={<Switch />}
        />
        <Row
          title="Search indexing"
          description="Let public shared sessions appear in search engines."
          control={<Switch />}
        />
      </Panel>
    </SectionShell>
  )
}

function DangerSection() {
  return (
    <SectionShell title="Danger Zone" description="Irreversible actions for your account.">
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
                  This will permanently remove all of your sessions, graphs, and billing history.
                  This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="confirm">Type DELETE to confirm</Label>
                <Input id="confirm" placeholder="DELETE" />
              </div>
              <DialogFooter>
                <DialogClose render={<Button variant="outline">Cancel</Button>} />
                <DialogClose render={<Button variant="destructive">Delete account</Button>} />
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </SectionShell>
  )
}
