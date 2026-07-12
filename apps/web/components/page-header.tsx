import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Logo } from '@/components/logo'

export function PageHeader({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur md:px-6">
      <div className="flex items-center gap-3">
        <Link
          href="/app"
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          <span className="hidden sm:inline">Back to app</span>
        </Link>
        <div className="h-5 w-px bg-border" />
        <span className="text-sm font-medium text-foreground">{title}</span>
      </div>
      <Link href="/app" aria-label="ChatGRP home">
        <Logo showWordmark={false} />
      </Link>
    </header>
  )
}
