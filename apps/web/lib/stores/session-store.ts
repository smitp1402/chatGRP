import { create } from "zustand"

import { ANALYTICS_EVENTS, track } from "@/lib/analytics"
import type { SessionListItem } from "@chatgrp/shared"
import * as api from "@/lib/sessions-client"

interface SessionState {
  sessions: SessionListItem[]
  activeId: string | null
  loading: boolean
  error: string | null

  load: () => Promise<void>
  create: (name: string) => Promise<SessionListItem>
  rename: (id: string, name: string) => Promise<void>
  remove: (id: string) => Promise<void>
  setActive: (id: string) => void
}

/**
 * Client-side session state. Mutations call the API, then update the store
 * immutably (never mutate the existing array in place).
 */
export const useSessionStore = create<SessionState>((set, get) => ({
  sessions: [],
  activeId: null,
  loading: false,
  error: null,

  load: async () => {
    set({ loading: true, error: null })
    try {
      const sessions = await api.listSessions()
      set((state) => ({
        sessions,
        loading: false,
        // Keep the current selection if still present, else pick the first.
        activeId:
          state.activeId && sessions.some((s) => s.id === state.activeId)
            ? state.activeId
            : (sessions[0]?.id ?? null),
      }))
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : "Failed to load" })
    }
  },

  create: async (name) => {
    const session = await api.createSession(name)
    set((state) => ({
      sessions: [session, ...state.sessions],
      activeId: session.id,
    }))
    // sessionCount >= 2 is the "they came back" signal.
    track(ANALYTICS_EVENTS.sessionCreated, { sessionCount: get().sessions.length })
    return session
  },

  rename: async (id, name) => {
    const updated = await api.renameSession(id, name)
    set((state) => ({
      sessions: state.sessions.map((s) => (s.id === id ? { ...s, name: updated.name } : s)),
    }))
  },

  remove: async (id) => {
    await api.deleteSession(id)
    set((state) => {
      const sessions = state.sessions.filter((s) => s.id !== id)
      return {
        sessions,
        activeId: state.activeId === id ? (sessions[0]?.id ?? null) : state.activeId,
      }
    })
  },

  setActive: (id) => set({ activeId: id }),
}))
