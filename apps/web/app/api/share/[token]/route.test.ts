/**
 * Public share read. The token is the whole access check, so the shape of
 * what is (and is not) returned matters: conversation text and model badges,
 * never attachment paths (they embed the owner's user id).
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

type Row = Record<string, unknown>
const tables: Record<string, { rows: Row[]; error: { message: string } | null }> = {}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (name: string) => {
      const t = tables[name] ?? { rows: [], error: null }
      const q = {
        select: () => q,
        eq: () => q,
        order: () => q,
        maybeSingle: async () => ({ data: t.rows[0] ?? null, error: t.error }),
        then: (resolve: (v: unknown) => void) => resolve({ data: t.rows, error: t.error }),
      }
      return q
    },
  }),
}))

import { GET } from "./route"

const TOKEN = "0f8fad5b-d9cb-469f-a165-70867728950e" // gitleaks:allow - made-up UUID, not a credential
const call = (token: string) => GET(new Request("http://localhost"), { params: Promise.resolve({ token }) })

beforeEach(() => {
  for (const k of Object.keys(tables)) delete tables[k]
})

describe("GET /api/share/:token", () => {
  it("rejects a non-UUID token before touching the database", async () => {
    const res = await call("not-a-uuid'; drop table sessions;--")
    expect(res.status).toBe(404)
  })

  it("404s when no session carries the token", async () => {
    tables.sessions = { rows: [], error: null }
    const res = await call(TOKEN)
    expect(res.status).toBe(404)
    expect((await res.json()).error).toMatch(/no longer available/)
  })

  it("returns the session name and canvas-shaped nodes", async () => {
    tables.sessions = { rows: [{ id: "s1", name: "Shared graph", created_at: "2026-09-20T00:00:00Z" }], error: null }
    tables.nodes = {
      rows: [
        {
          id: "n1", parent_id: null, is_fork: false, starred: false, collapsed: false,
          position_x: 1, position_y: 2, order_index: 0,
          messages: [
            { role: "user", content: "hello" },
            { role: "assistant", content: "hi there" },
          ],
          generation_attempts: [{ model_id: "gpt-4o-mini", status: "completed" }],
        },
      ],
      error: null,
    }

    const res = await call(TOKEN)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.name).toBe("Shared graph")
    expect(body.data.nodes).toHaveLength(1)
    expect(body.data.nodes[0]).toMatchObject({
      id: "n1", parentId: null, question: "hello", answer: "hi there", modelId: "gpt-4o-mini", credits: 2,
    })
    // The share select omits the attachments join; nothing leaks the owner's storage prefix.
    expect(body.data.nodes[0].attachments).toEqual([])
    expect(JSON.stringify(body)).not.toMatch(/storage_path|storagePath/)
  })

  it("surfaces a database error as 500 rather than an empty graph", async () => {
    tables.sessions = { rows: [{ id: "s1", name: "x", created_at: "" }], error: null }
    tables.nodes = { rows: [], error: { message: "connection reset" } }
    const res = await call(TOKEN)
    expect(res.status).toBe(500)
  })
})
