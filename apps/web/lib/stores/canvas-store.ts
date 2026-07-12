import { create } from "zustand"
import type { CanvasNode, ModelId } from "@chatgrp/shared"
import * as api from "@/lib/nodes-client"

interface CanvasState {
  nodes: CanvasNode[]
  loading: boolean
  error: string | null
  selectedId: string | null

  load: (sessionId: string) => Promise<void>
  addNode: (sessionId: string, parentId?: string | null, modelId?: ModelId) => Promise<void>
  select: (id: string | null) => void
  persistPosition: (id: string, x: number, y: number) => Promise<void>
  toggleStar: (id: string) => Promise<void>
  clear: () => void
}

/** Canvas node state for the active session. All updates are immutable. */
export const useCanvasStore = create<CanvasState>((set, get) => ({
  nodes: [],
  loading: false,
  error: null,
  selectedId: null,

  load: async (sessionId) => {
    set({ loading: true, error: null })
    try {
      const nodes = await api.listNodes(sessionId)
      set({ nodes, loading: false })
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : "Failed to load nodes" })
    }
  },

  addNode: async (sessionId, parentId = null, modelId) => {
    try {
      const node = await api.createNode(sessionId, { parentId, modelId })
      set((state) => ({ nodes: [...state.nodes, node], selectedId: node.id }))
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to add node" })
    }
  },

  select: (id) => set({ selectedId: id }),

  persistPosition: async (id, x, y) => {
    // Optimistic local update, then persist.
    set((state) => ({
      nodes: state.nodes.map((n) => (n.id === id ? { ...n, x, y } : n)),
    }))
    try {
      await api.updateNode(id, { position_x: x, position_y: y })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to save position" })
    }
  },

  toggleStar: async (id) => {
    const node = get().nodes.find((n) => n.id === id)
    if (!node) return
    const starred = !node.starred
    set((state) => ({
      nodes: state.nodes.map((n) => (n.id === id ? { ...n, starred } : n)),
    }))
    try {
      await api.updateNode(id, { starred })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to update star" })
    }
  },

  clear: () => set({ nodes: [], selectedId: null, error: null }),
}))
