/**
 * The reasons offered when someone cancels.
 *
 * Kept as a closed list so the answers can be counted rather than read one by
 * one. The ids must match the CHECK constraint in
 * supabase/migrations/0012_cancellation_feedback.sql — a value missing there is
 * rejected by Postgres, which would lose the feedback for that cancellation.
 *
 * Wording is deliberately blame-free. "Not using it enough" invites an honest
 * answer in a way "You didn't find it useful" does not.
 */
export const CANCEL_REASONS = [
  { id: "too_expensive", label: "Too expensive" },
  { id: "not_using", label: "Not using it enough" },
  { id: "missing_feature", label: "Missing a feature I need" },
  { id: "found_alternative", label: "Found something better" },
  { id: "other", label: "Something else" },
] as const

export type CancelReason = (typeof CANCEL_REASONS)[number]["id"]

const IDS: ReadonlySet<string> = new Set(CANCEL_REASONS.map((r) => r.id))

/** Narrows a client-supplied value. Anything unrecognised is dropped, not stored. */
export function isCancelReason(value: unknown): value is CancelReason {
  return typeof value === "string" && IDS.has(value)
}

/** Matches the note length the migration allows. */
export const MAX_CANCEL_NOTE = 1000
