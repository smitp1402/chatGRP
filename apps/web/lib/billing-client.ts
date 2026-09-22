import type { CancelReason } from "@/lib/cancel-reasons"

interface ApiEnvelope<T> {
  success: boolean
  data?: T
  error?: string
}

async function redirectTo(url: string, res: Response): Promise<never> {
  const body = (await res.json().catch(() => null)) as ApiEnvelope<{ url: string }> | null
  if (!res.ok || !body?.success || !body.data?.url) {
    throw new Error(body?.error ?? `Request failed (${res.status})`)
  }
  window.location.href = body.data.url
  return new Promise<never>(() => {}) // navigation in progress
}

/** Start a Stripe Checkout for a paid plan and redirect there. */
export async function startCheckout(plan: "pro"): Promise<never> {
  const res = await fetch("/api/billing/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan }),
  })
  return redirectTo("checkout", res)
}

/** Open the Stripe billing portal (manage/cancel subscription). */
export async function openBillingPortal(): Promise<never> {
  const res = await fetch("/api/billing/portal", { method: "POST" })
  return redirectTo("portal", res)
}

async function post(path: string, payload?: unknown): Promise<void> {
  const res = await fetch(path, {
    method: "POST",
    ...(payload === undefined
      ? {}
      : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }),
  })
  const body = (await res.json().catch(() => null)) as ApiEnvelope<unknown> | null
  if (!res.ok || !body?.success) {
    throw new Error(body?.error ?? `Request failed (${res.status})`)
  }
}

export interface CancelFeedback {
  reason: CancelReason
  note?: string
}

/**
 * Cancel the subscription at period end (in-app, no portal).
 *
 * Feedback is optional on purpose. Someone who will not say why still gets to
 * leave in one click, and the server stores nothing for them.
 */
export async function cancelSubscription(feedback?: CancelFeedback): Promise<void> {
  return post("/api/billing/cancel", feedback)
}

/** Undo a pending cancellation — the plan renews as normal again. */
export async function resumeSubscription(): Promise<void> {
  return post("/api/billing/resume")
}
