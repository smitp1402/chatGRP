/**
 * Shared steps for the browser tests. Every helper talks to the app the way
 * a user would, except cleanup, which uses the API so a failed test cannot
 * leave rows behind.
 */
import { expect, type Page } from "@playwright/test"

/** Everything the tests create is named with this prefix and deleted by it. */
export const E2E_PREFIX = "e2e-"

export function uniqueName(kind: string): string {
  return `${E2E_PREFIX}${kind}-${Date.now()}`
}

/** Where auth.setup.ts stores the signed-in browser state for the run. */
export const AUTH_STATE = "e2e/.auth/user.json"

/** Storage state for tests that must start signed OUT. */
export const SIGNED_OUT = { cookies: [], origins: [] }

/**
 * The session comes from auth.setup.ts (one sign-in per run, shared via
 * storageState), so "signing in" is just landing on /app and proving it stuck.
 */
export async function signIn(page: Page): Promise<void> {
  await page.goto("/app")
  await expect(page, "signed-in state from auth.setup.ts").toHaveURL(/\/app(\/|$|\?)/)
}

/**
 * Sessions the current test created; cleanup deletes only these. Module
 * state is safe because playwright.config.ts runs one worker with
 * fullyParallel off - tests never interleave. Make this a fixture before
 * changing either setting.
 */
const created: { id: string; name: string }[] = []

/** Create a session via the API, open /app, and select it in the sidebar. */
export async function openNewSession(page: Page): Promise<{ id: string; name: string }> {
  const name = uniqueName("session")
  const res = await page.request.post("/api/sessions", { data: { name } })
  expect(res.ok(), "create session").toBeTruthy()
  const { data } = (await res.json()) as { data: { id: string } }
  created.push({ id: data.id, name })
  await page.goto("/app")
  await page.getByText(name, { exact: true }).click()
  await expect(page.getByPlaceholder(/Ask anything to start/)).toBeVisible()
  return { id: data.id, name }
}

/**
 * Send a message and wait for the mock answer to land. `expectedNodes` is the
 * canvas node count after the answer, which is the only reliable "done" signal.
 */
export async function generate(page: Page, text: string, expectedNodes: number): Promise<void> {
  const composer = page.getByPlaceholder(/Ask anything to start|Reply to this node/)
  await composer.fill(text)
  await page.getByRole("button", { name: "Send message" }).click()
  await expect(page.locator(".react-flow__node")).toHaveCount(expectedNodes, { timeout: 30_000 })
  await expect(page.getByText(/\(mock ·/)).toHaveCount(expectedNodes, { timeout: 30_000 })
}

/** The canvas node whose question is `text`. */
export function nodeWith(page: Page, text: string) {
  return page.locator(".react-flow__node", { hasText: text })
}

/**
 * Delete the sessions this test created (plus any fork or rename of them).
 * Never "everything with the prefix": another test may be using those.
 */
export async function deleteTestSessions(page: Page): Promise<void> {
  const mine = created.splice(0)
  if (mine.length === 0) return
  // Deleting a session cascades its rows but not its uploads (a known app
  // gap) - remove those first, as the user, through the storage API.
  for (const s of mine) await deleteSessionUploads(page, s.id)
  const res = await page.request.get("/api/sessions")
  if (!res.ok()) return
  const { data } = (await res.json()) as { data: { id: string; name: string }[] }
  const names = mine.map((m) => m.name)
  const owned = (n: string) => names.some((m) => n === m || n === `${m} (fork)`) || n.startsWith(`${E2E_PREFIX}renamed-`)
  for (const s of data.filter((s) => owned(s.name))) {
    await page.request.delete(`/api/sessions/${s.id}`)
  }
}

/**
 * The signed-in user's Supabase access token, read from the auth cookie
 * that @supabase/ssr sets (`sb-<ref>-auth-token`, possibly chunked `.0`,
 * `.1`, ..., value `base64-<json>`). Lets tests call Supabase directly as
 * the user - never with a privileged key.
 */
export async function userAccessToken(page: Page): Promise<{ token: string; userId: string } | null> {
  const cookies = await page.context().cookies()
  const parts = cookies
    .filter((c) => /^sb-.*-auth-token(\.\d+)?$/.test(c.name))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
  if (parts.length === 0) return null
  const raw = decodeURIComponent(parts.map((c) => c.value).join(""))
  const json = raw.startsWith("base64-") ? Buffer.from(raw.slice(7), "base64").toString("utf8") : raw
  try {
    const session = JSON.parse(json) as { access_token?: string; user?: { id?: string } }
    if (!session.access_token || !session.user?.id) return null
    return { token: session.access_token, userId: session.user.id }
  } catch {
    return null
  }
}

/** Remove every object under `{user}/{session}/` in the attachments bucket. */
export async function deleteSessionUploads(page: Page, sessionId: string): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const auth = await userAccessToken(page)
  if (!supabaseUrl || !auth) return
  const headers = { Authorization: `Bearer ${auth.token}`, apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "" }
  const prefix = `${auth.userId}/${sessionId}`
  const list = await page.request.post(`${supabaseUrl}/storage/v1/object/list/attachments`, {
    headers,
    data: { prefix, limit: 100 },
  })
  if (!list.ok()) return
  const names = ((await list.json()) as { name: string }[]).map((o) => `${prefix}/${o.name}`)
  if (names.length === 0) return
  await page.request.delete(`${supabaseUrl}/storage/v1/object/attachments`, { headers, data: { prefixes: names } })
}

export async function deleteTestPrompts(page: Page): Promise<void> {
  const res = await page.request.get("/api/prompts")
  if (!res.ok()) return
  const { data } = (await res.json()) as { data: { id: string; title: string }[] }
  for (const p of (data ?? []).filter((p) => p.title.startsWith(E2E_PREFIX))) {
    await page.request.delete(`/api/prompts/${p.id}`)
  }
}

/** A 1x1 transparent PNG, enough for the upload path and the vision stub. */
export const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
)
