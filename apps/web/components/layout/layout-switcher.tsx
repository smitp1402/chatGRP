'use client'

import { Check, LayoutGrid } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LAYOUT_PRESETS, useLayoutStore, type PresetId } from '@/lib/stores/layout-store'

const ORDER: PresetId[] = ['split', 'canvas', 'chat', 'zen']

export function LayoutSwitcher() {
  const preset = useLayoutStore((s) => s.preset)
  const setPreset = useLayoutStore((s) => s.setPreset)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Change layout"
        className="flex items-center gap-1.5 rounded-lg border border-border bg-card/90 px-2.5 py-1.5 text-xs font-medium text-foreground shadow-sm backdrop-blur transition-colors hover:bg-accent"
      >
        <LayoutGrid className="size-3.5" />
        {LAYOUT_PRESETS[preset].label}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {/* Base UI's GroupLabel needs a Group ancestor — without it the menu throws. */}
        <DropdownMenuGroup>
          <DropdownMenuLabel>Layout</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {ORDER.map((id) => (
            <DropdownMenuItem key={id} onClick={() => setPreset(id)}>
              <span className="flex-1">{LAYOUT_PRESETS[id].label}</span>
              {preset === id && <Check className="size-3.5 text-primary" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
