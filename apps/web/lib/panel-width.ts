/**
 * Resize maths for the app sidebar, kept free of React and the DOM so it can be
 * tested in the node environment the rest of the suite uses.
 *
 * The state is deliberately two fields rather than one width: collapsing has to
 * remember the width the panel had, otherwise re-opening it would lose the size
 * the user picked.
 */

/** Bounds for a resizable panel, in CSS pixels. */
export interface WidthBounds {
  readonly min: number
  readonly max: number
  readonly default: number
  /** Width of the collapsed rail — wide enough for the icon column. */
  readonly collapsed: number
  /** Drag narrower than this and the panel snaps shut. */
  readonly collapseAt: number
}

export const SIDEBAR_BOUNDS: WidthBounds = {
  min: 180,
  max: 420,
  default: 224, // matches the w-56 the sidebar used before it was resizable
  collapsed: 56,
  collapseAt: 148,
}

export interface PanelState {
  /** The expanded width. Retained while collapsed so re-opening restores it. */
  readonly width: number
  readonly collapsed: boolean
}

export const KEY_STEP = 16
export const KEY_STEP_LARGE = 48

/** Rounds to a whole pixel and holds the value inside the bounds. */
export function clampWidth(px: number, bounds: WidthBounds = SIDEBAR_BOUNDS): number {
  if (!Number.isFinite(px)) return bounds.default
  return Math.min(bounds.max, Math.max(bounds.min, Math.round(px)))
}

/** The width actually rendered, which is the rail width while collapsed. */
export function renderedWidth(state: PanelState, bounds: WidthBounds = SIDEBAR_BOUNDS): number {
  return state.collapsed ? bounds.collapsed : clampWidth(state.width, bounds)
}

/**
 * Maps a pointer position (distance from the panel's leading edge) to the next
 * state. Dragging past `collapseAt` snaps shut instead of letting the panel
 * shrink into an unusable sliver.
 */
export function resolveDrag(
  px: number,
  current: PanelState,
  bounds: WidthBounds = SIDEBAR_BOUNDS,
): PanelState {
  if (!Number.isFinite(px)) return current
  if (px < bounds.collapseAt) {
    return current.collapsed ? current : { width: current.width, collapsed: true }
  }
  return { width: clampWidth(px, bounds), collapsed: false }
}

/**
 * Keyboard resizing from the separator handle. Returns `null` for keys this
 * does not own, so the caller can let them bubble normally.
 */
export function resolveKey(
  key: string,
  shift: boolean,
  current: PanelState,
  bounds: WidthBounds = SIDEBAR_BOUNDS,
): PanelState | null {
  const step = shift ? KEY_STEP_LARGE : KEY_STEP
  const from = renderedWidth(current, bounds)

  switch (key) {
    case "ArrowRight":
      // Stepping up from the 56px rail would still sit under collapseAt, which
      // would strand keyboard users collapsed. Re-open to the stored width.
      return current.collapsed
        ? { width: current.width, collapsed: false }
        : resolveDrag(from + step, current, bounds)
    case "ArrowLeft":
      return current.collapsed ? current : resolveDrag(from - step, current, bounds)
    case "Home":
      return { width: bounds.min, collapsed: false }
    case "End":
      return { width: bounds.max, collapsed: false }
    default:
      return null
  }
}

const RESIZE_KEYS: ReadonlySet<string> = new Set([
  "ArrowLeft",
  "ArrowRight",
  "Home",
  "End",
])

/**
 * Whether `resolveKey` owns this key. Lets a handler decide to preventDefault
 * without first computing the next state, which keeps the state update in a
 * functional `setState` rather than needing to read current state on render.
 */
export function isResizeKey(key: string): boolean {
  return RESIZE_KEYS.has(key)
}

export function toggleCollapsed(current: PanelState): PanelState {
  return { width: current.width, collapsed: !current.collapsed }
}

export function serialize(state: PanelState): string {
  return JSON.stringify({ width: state.width, collapsed: state.collapsed })
}

/**
 * Reads a persisted value. localStorage is user-writable and survives across
 * deploys, so treat whatever comes back as untrusted: anything unusable yields
 * `null` and the caller falls back to the default.
 */
export function parseStored(
  raw: string | null,
  bounds: WidthBounds = SIDEBAR_BOUNDS,
): PanelState | null {
  if (!raw) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }

  if (typeof parsed !== "object" || parsed === null) return null

  const { width, collapsed } = parsed as {
    width?: unknown
    collapsed?: unknown
  }
  if (typeof width !== "number" || !Number.isFinite(width)) return null

  return { width: clampWidth(width, bounds), collapsed: collapsed === true }
}
