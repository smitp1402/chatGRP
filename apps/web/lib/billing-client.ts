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
export async function startCheckout(plan: "pro" | "team"): Promise<never> {
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

async function post(path: string): Promise<void> {
  const res = await fetch(path, { method: "POST" })
  const body = (await res.json().catch(() => null)) as ApiEnvelope<unknown> | null
  if (!res.ok || !body?.success) {
    throw new Error(body?.error ?? `Request failed (${res.status})`)
  }
}

/** Cancel the subscription at period end (in-app, no portal). */
export async function cancelSubscription(): Promise<void> {
  return post("/api/billing/cancel")
}

/** Undo a pending cancellation — the plan renews as normal again. */
export async function resumeSubscription(): Promise<void> {
  return post("/api/billing/resume")
}
