'use client'

import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { useMounted } from '@/lib/use-mounted'

/** Compact light/dark toggle for tight spaces (e.g. the app sidebar footer). */
export function ThemeCycle() {
  const { resolvedTheme, setTheme } = useTheme()
  const mounted = useMounted()

  // Avoid a hydration mismatch — reserve the space until mounted.
  if (!mounted) return <div className="size-8" />

  const isDark = resolvedTheme === 'dark'
  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  )
}
