import { create } from "zustand"
import type { Plan } from "@chatgrp/shared"

interface Me {
  plan: Plan
  creditsUsed: number
  creditsCap: number
  creditsRemaining: number
  onboarded: boolean
  defaultModelId: string | null
  /** Paid plan that won't renew — active until `currentPeriodEnd`, then Free. */
  cancelAtPeriodEnd: boolean
  currentPeriodEnd: string | null
}

interface MeState extends Me {
  loaded: boolean
  load: () => Promise<void>
}

const DEFAULT: Me = {
  plan: "free",
  creditsUsed: 0,
  creditsCap: 100,
  creditsRemaining: 100,
  onboarded: false, // redirects are gated on `loaded`, so this never flashes
  defaultModelId: null,
  cancelAtPeriodEnd: false,
  currentPeriodEnd: null,
}

/** Current user's plan + credit usage. Refreshed after each generation. */
export const useMeStore = create<MeState>((set) => ({
  ...DEFAULT,
  loaded: false,

  load: async () => {
    try {
      const res = await fetch("/api/me")
      const body = await res.json()
      if (res.ok && body.success) {
        set({ ...(body.data as Me), loaded: true })
      }
    } catch {
      // Leave defaults; the sidebar just shows the free tier until this succeeds.
    }
  },
}))
