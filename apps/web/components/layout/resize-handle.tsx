'use client'

import type { KeyboardEvent, PointerEvent } from 'react'
import { cn } from '@/lib/utils'

interface ResizeHandleProps {
  /** Current width, reported to assistive tech. */
  width: number
  min: number
  max: number
  dragging: boolean
  label: string
  onPointerDown: (e: PointerEvent) => void
  onKeyDown: (e: KeyboardEvent) => void
  /** Double-click shortcut — collapses, or re-opens to the stored width. */
  onDoubleClick: () => void
}

/**
 * The draggable divider on a panel's trailing edge.
 *
 * Implements the ARIA window-splitter pattern: a focusable `separator` that
 * reports its position, so the panel can be resized with the keyboard
 * (arrows, shift+arrows for a larger step, Home/End for the bounds) and not
 * only with a pointer.
 *
 * The hit area is 8px wide for comfortable grabbing, while the visible line is
 * 1px and only paints on hover, focus, or drag.
 */
export function ResizeHandle({
  width,
  min,
  max,
  dragging,
  label,
  onPointerDown,
  onKeyDown,
  onDoubleClick,
}: ResizeHandleProps) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={width}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      onDoubleClick={onDoubleClick}
      className={cn(
        'group absolute inset-y-0 -right-1 z-30 w-2 cursor-col-resize touch-none',
        'outline-none',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 transition-colors duration-150',
          'bg-transparent group-hover:bg-brand/60 group-focus-visible:bg-brand',
          dragging && 'bg-brand',
        )}
      />
    </div>
  )
}
