/**
 * The webhook is Stripe's only way to tell us a plan changed. Stripe retries
 * on a non-2xx, so a failed DB write must be reported — swallowing it means a
 * paying customer is stuck on Free with no retry.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"
import type Stripe from "stripe"

const constructEvent = vi.fn()
const update = vi.fn()

vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({ webhooks: { constructEvent } }),
  planForPrice: (id: string | undefined) => (id === "price_pro" ? "pro" : null),
}))

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      update: (patch: unknown) => ({
        eq: (col: string, val: string) => ({ select: () => update(patch, col, val) }),
      }),
    }),
  }),
}))

import { POST } from "./route"

function subscriptionEvent(type: string, overrides: Partial<Stripe.Subscription> = {}): Stripe.Event {
  const sub = {
    id: "sub_1",
    customer: "cus_1",
    status: "active",
    cancel_at_period_end: false,
    items: { data: [{ price: { id: "price_pro" }, current_period_end: 1_800_000_000 }] },
    ...overrides,
  }
  return { type, data: { object: sub } } as unknown as Stripe.Event
}

function request(): Request {
  return new Request("http://localhost/api/webhooks/stripe", {
    method: "POST",
    headers: { "stripe-signature": "sig" },
    body: "{}",
  })
}

beforeEach(() => {
  vi.resetAllMocks()
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test"
  update.mockResolvedValue({ data: [{ user_id: "u1" }], error: null })
})

describe("POST /api/webhooks/stripe", () => {
  it("rejects a bad signature with 400 and touches nothing", async () => {
    constructEvent.mockImplementation(() => {
      throw new Error("bad sig")
    })

    const res = await POST(request())

    expect(res.status).toBe(400)
    expect(update).not.toHaveBeenCalled()
  })

  it("sets the plan to pro on an active subscription", async () => {
    constructEvent.mockReturnValue(subscriptionEvent("customer.subscription.updated"))

    const res = await POST(request())

    expect(res.status).toBe(200)
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ plan: "pro", stripe_subscription_id: "sub_1" }),
      "stripe_customer_id",
      "cus_1",
    )
  })

  it("drops to free when the subscription is deleted", async () => {
    constructEvent.mockReturnValue(subscriptionEvent("customer.subscription.deleted"))

    await POST(request())

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ plan: "free", stripe_subscription_id: null }),
      "stripe_customer_id",
      "cus_1",
    )
  })

  it("returns 500 when the profile write fails so Stripe retries", async () => {
    constructEvent.mockReturnValue(subscriptionEvent("customer.subscription.updated"))
    update.mockResolvedValue({ data: null, error: { message: "connection reset" } })

    const res = await POST(request())

    expect(res.status).toBe(500)
  })

  it("acknowledges but logs when no profile has that customer id", async () => {
    constructEvent.mockReturnValue(subscriptionEvent("customer.subscription.updated"))
    update.mockResolvedValue({ data: [], error: null })
    const logged = vi.spyOn(console, "error").mockImplementation(() => {})

    const res = await POST(request())

    expect(res.status).toBe(200) // retrying cannot create the missing mapping
    expect(logged).toHaveBeenCalledWith(expect.stringContaining("cus_1"))
  })

  it("returns 200 for event types it does not handle", async () => {
    constructEvent.mockReturnValue({ type: "invoice.paid", data: { object: {} } } as unknown as Stripe.Event)

    const res = await POST(request())

    expect(res.status).toBe(200)
    expect(update).not.toHaveBeenCalled()
  })
})
