import { create } from "zustand"
import { persist } from "zustand/middleware"

export type PresetId = "split" | "canvas" | "chat" | "zen"

export interface LayoutPreset {
  label: string
  sidebar: boolean
  chat: boolean
  /** Canvas share of the horizontal split, in percent. */
  canvasSize: number
}

export const LAYOUT_PRESETS: Record<PresetId, LayoutPreset> = {
  split: { label: "Split 50/50", sidebar: true, chat: true, canvasSize: 60 },
  canvas: { label: "Canvas focus", sidebar: true, chat: false, canvasSize: 100 },
  chat: { label: "Chat focus", sidebar: true, chat: true, canvasSize: 40 },
  zen: { label: "Zen", sidebar: false, chat: false, canvasSize: 100 },
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
