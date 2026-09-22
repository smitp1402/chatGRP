/**
 * The reason list is a contract with Postgres: migration 0012 constrains
 * `cancellation_feedback.reason` to exactly these ids, and a value missing
 * there is rejected by the database — losing the feedback for that
 * cancellation, which cannot be collected again.
 */
import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { CANCEL_REASONS, MAX_CANCEL_NOTE, isCancelReason } from "./cancel-reasons"

const migration = readFileSync(
  path.resolve(__dirname, "../../../supabase/migrations/0012_cancellation_feedback.sql"),
  "utf8",
)

describe("cancel reasons", () => {
  it("offers every reason the database will accept, and no others", () => {
    const check = migration.match(/reason in \(([^)]+)\)/)
    expect(check, "no CHECK constraint found in migration 0012").not.toBeNull()

    const allowed = [...check![1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1])
    expect([...CANCEL_REASONS.map((r) => r.id)].sort()).toEqual([...allowed].sort())
  })

  it("caps the note at the length the column allows", () => {
    const limit = migration.match(/char_length\(note\) <= (\d+)/)
    expect(limit, "no note length constraint found").not.toBeNull()
    expect(MAX_CANCEL_NOTE).toBe(Number(limit![1]))
  })

  it("accepts the ids it publishes", () => {
    for (const r of CANCEL_REASONS) expect(isCancelReason(r.id)).toBe(true)
  })

  it("rejects anything else, so a forged value is dropped and not stored", () => {
    for (const bad of ["", "TOO_EXPENSIVE", "unknown", "'; drop table --", null, 7, {}, undefined]) {
      expect(isCancelReason(bad)).toBe(false)
    }
  })

  it("gives every reason a distinct id and a human label", () => {
    const ids = CANCEL_REASONS.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const r of CANCEL_REASONS) expect(r.label.trim().length).toBeGreaterThan(0)
  })
})
