import { create } from "zustand"
import { persist } from "zustand/middleware"

export type PresetId = "split" | "canvas" | "chat" | "linear" | "zen"

export interface LayoutPreset {
  label: string
  sidebar: boolean
  chat: boolean
  /**
   * Whether the graph canvas is rendered at all. False gives a plain linear
   * chat — the open branch, full width — for people who want a familiar
   * threaded view. Branching is hidden there, so the reading order stays
   * unambiguous.
   */
  canvas: boolean
  /** Canvas share of the horizontal split, in percent. */
  canvasSize: number
}

export const LAYOUT_PRESETS: Record<PresetId, LayoutPreset> = {
  split: { label: "Split 50/50", sidebar: true, chat: true, canvas: true, canvasSize: 60 },
  canvas: { label: "Canvas focus", sidebar: true, chat: false, canvas: true, canvasSize: 100 },
  chat: { label: "Chat focus", sidebar: true, chat: true, canvas: true, canvasSize: 40 },
  linear: { label: "Chat only", sidebar: true, chat: true, canvas: false, canvasSize: 0 },
  zen: { label: "Zen", sidebar: false, chat: false, canvas: true, canvasSize: 100 },
}

interface LayoutState {
  preset: PresetId
  setPreset: (preset: PresetId) => void
}

/** Workspace layout — pure client-side UI state, persisted to localStorage. */
export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      preset: "split",
      setPreset: (preset) => set({ preset }),
    }),
    { name: "chatgrp-layout" },
  ),
)
