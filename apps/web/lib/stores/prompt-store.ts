import { create } from "zustand"
import type { SavedPrompt, PromptFolder } from "@chatgrp/shared"
import * as api from "@/lib/prompts-client"
import type { PromptInput } from "@/lib/prompts-client"

interface PromptState {
  prompts: SavedPrompt[]
  folders: PromptFolder[]
  loading: boolean
  error: string | null

  load: () => Promise<void>
  create: (input: PromptInput) => Promise<SavedPrompt>
  update: (id: string, input: PromptInput) => Promise<void>
  remove: (id: string) => Promise<void>
  recordUse: (id: string) => Promise<void>
  addFolder: (name: string) => Promise<void>
  removeFolder: (id: string) => Promise<void>
}

/** Prompt library state. All list updates are immutable. */
export const usePromptStore = create<PromptState>((set, get) => ({
  prompts: [],
  folders: [],
  loading: false,
  error: null,

  load: async () => {
    set({ loading: true, error: null })
    try {
      const [prompts, folders] = await Promise.all([api.listPrompts(), api.listFolders()])
      set({ prompts, folders, loading: false })
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : "Failed to load prompts" })
    }
  },

  create: async (input) => {
    const prompt = await api.createPrompt(input)
    set((state) => ({ prompts: [prompt, ...state.prompts] }))
    return prompt
  },

  update: async (id, input) => {
    await api.updatePrompt(id, input)
    set((state) => ({
      prompts: state.prompts.map((p) => (p.id === id ? { ...p, ...input } : p)),
    }))
  },

  remove: async (id) => {
    await api.deletePrompt(id)
    set((state) => ({ prompts: state.prompts.filter((p) => p.id !== id) }))
  },

  recordUse: async (id) => {
    try {
      await api.recordPromptUse(id)
      set((state) => ({
        prompts: state.prompts.map((p) =>
          p.id === id
            ? { ...p, usageCount: p.usageCount + 1, lastUsedAt: new Date().toISOString() }
            : p,
        ),
      }))
    } catch {
      // usage tracking is best-effort
    }
  },

  addFolder: async (name) => {
    const folder = await api.createFolder(name)
    set((state) => ({ folders: [...state.folders, folder] }))
  },

  removeFolder: async (id) => {
    await api.deleteFolder(id)
    set((state) => ({
      folders: state.folders.filter((f) => f.id !== id),
      prompts: state.prompts.map((p) => (p.folderId === id ? { ...p, folderId: null } : p)),
    }))
  },
}))
