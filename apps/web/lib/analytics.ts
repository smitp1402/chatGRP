import posthog from "posthog-js"

/**
 * Product analytics — the handful of moments that answer "is this working?".
 *
 * Deliberately small. Every event here maps to a question worth asking:
 * do people who sign up ever send a message, do they come back for a second
 * session, does anyone use fork or share, and who reaches checkout. Adding
 * events is cheap; reading a dashboard full of noise is not.
 *
 * No key configured means every call is a no-op, so local development and
 * preview builds send nothing.
 */

export const ANALYTICS_EVENTS = {
  /** Account created — the top of every funnel. */
  signedUp: "signed_up",
  /** A generation was requested. `isFirstMessage` marks activation. */
  messageSent: "message_sent",
  /** A session was created. `sessionCount` >= 2 marks a returning user. */
  sessionCreated: "session_created",
  /** A branch was forked — the feature the whole graph premise rests on. */
  nodeForked: "node_forked",
  /** A share link was minted; the start of the acquisition loop. */
  shareLinkCreated: "share_link_created",
  /** Checkout was opened. Compare against signedUp for conversion. */
  upgradeClicked: "upgrade_clicked",
} as const

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS]

function enabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY) && typeof window !== "undefined"
}

/** Record an event. Safe to call anywhere — no-ops when analytics is off. */
export function track(
  event: AnalyticsEvent,
  properties?: Record<string, string | number | boolean | null>,
): void {
  if (!enabled()) return
  posthog.capture(event, properties)
}

/**
 * Tie subsequent events to a user. Called once after auth resolves so the
 * anonymous pre-signup pageviews stitch onto the account.
 */
export function identify(userId: string, plan?: string): void {
  if (!enabled()) return
  posthog.identify(userId, plan ? { plan } : undefined)
}

/** Clear the identity on sign-out so the next user is not merged into it. */
export function resetIdentity(): void {
  if (!enabled()) return
  posthog.reset()
}
