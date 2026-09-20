/**
 * The one test that proves the whole thing works: sign in, start a session,
 * get a streamed answer, fork it into a sibling branch, see both on the canvas.
 *
 * Uses the dev quick-login account (NEXT_PUBLIC_DEV_EMAIL / _PASSWORD, see
 * components/dev-login-button.tsx) and the AI service's mock streamer, so no
 * provider keys are spent. Sessions are created under a unique "e2e-" name
 * and deleted afterwards; nothing else in the account is touched.
 */
import { expect, test, type Page } from "@playwright/test"

const SESSION_PREFIX = "e2e-"

async function signIn(page: Page) {
  await page.goto("/login")
  const devLogin = page.getByRole("button", { name: "Dev quick login" })
  await expect(
    devLogin,
    "Dev quick login button - set NEXT_PUBLIC_DEV_EMAIL and NEXT_PUBLIC_DEV_PASSWORD",
  ).toBeVisible()
  await devLogin.click()
  await page.waitForURL(/\/(app|onboarding)(\/|$|\?)/, { timeout: 30_000 })

  // A brand-new account is sent to onboarding first; complete it via the API
  // so the test stays about the graph, not the welcome screens.
  if (page.url().includes("/onboarding")) {
    const res = await page.request.post("/api/onboarding", { data: { defaultModelId: "gpt-4o-mini" } })
    expect(res.ok(), "onboarding API").toBeTruthy()
    await page.goto("/app")
  }
  await expect(page).toHaveURL(/\/app(\/|$|\?)/)
}

async function createSession(page: Page): Promise<string> {
  const name = `${SESSION_PREFIX}${Date.now()}`
  const res = await page.request.post("/api/sessions", { data: { name } })
  expect(res.ok(), "create session").toBeTruthy()
  return name
}

async function deleteTestSessions(page: Page) {
  const res = await page.request.get("/api/sessions")
  if (!res.ok()) return
  const { data } = (await res.json()) as { data: { id: string; name: string }[] }
  for (const s of data.filter((s) => s.name.startsWith(SESSION_PREFIX))) {
    await page.request.delete(`/api/sessions/${s.id}`)
  }
}

test.afterEach(async ({ page }) => {
  await deleteTestSessions(page)
})

test("sign in, generate, fork — two nodes on the canvas", async ({ page }) => {
  await signIn(page)

  const name = await createSession(page)
  await page.goto("/app")
  await page.getByText(name, { exact: true }).click()

  // First message creates the root node and streams a mock answer.
  const composer = page.getByPlaceholder(/Ask anything to start/)
  await composer.fill("Hello from the end-to-end test")
  await page.getByRole("button", { name: "Send message" }).click()

  const nodes = page.locator(".react-flow__node")
  await expect(nodes).toHaveCount(1, { timeout: 30_000 })
  await expect(page.getByText(/\(mock ·/).first()).toBeVisible({ timeout: 30_000 })

  // Fork: the next message becomes a sibling branch off the selected node.
  await page.getByRole("button", { name: "Fork" }).click()
  await expect(page.getByText(/Forking — your next message/)).toBeVisible()
  await page.getByPlaceholder(/Reply to this node/).fill("Take this in a different direction")
  await page.getByRole("button", { name: "Send message" }).click()

  await expect(nodes).toHaveCount(2, { timeout: 30_000 })
  await expect(page.getByText(/\(mock ·/)).toHaveCount(2, { timeout: 30_000 })

  // The stream finished cleanly: the composer accepts input again and is not
  // stuck in the sending state. (Send is disabled while the box is empty.)
  await page.getByPlaceholder(/Reply to this node/).fill("x")
  await expect(page.getByRole("button", { name: "Send message" })).toBeEnabled()
})

test("a signed-out visitor is sent to /login", async ({ page }) => {
  await page.goto("/app")
  await expect(page).toHaveURL(/\/login/)
})
