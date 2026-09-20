/**
 * The one test that proves the whole thing works: sign in, start a session,
 * get a streamed answer, fork it into a sibling branch, see both on the canvas.
 *
 * Uses the dev quick-login account (NEXT_PUBLIC_DEV_EMAIL / _PASSWORD, see
 * components/dev-login-button.tsx) and the AI service's mock streamer, so no
 * provider keys are spent. Sessions are created under a unique "e2e-" name
 * and deleted afterwards; nothing else in the account is touched.
 */
import { expect, test } from "@playwright/test"
import { SIGNED_OUT, deleteTestSessions, generate, openNewSession, signIn } from "./helpers"

test.afterEach(async ({ page }) => {
  await deleteTestSessions(page)
})

test("sign in, generate, fork — two nodes on the canvas", async ({ page }) => {
  await signIn(page)
  await openNewSession(page)

  // First message creates the root node and streams a mock answer.
  await generate(page, "Hello from the end-to-end test", 1)

  // Fork: the next message becomes a sibling branch off the selected node.
  await page.getByRole("button", { name: "Fork" }).click()
  await expect(page.getByText(/Forking — your next message/)).toBeVisible()
  await generate(page, "Take this in a different direction", 2)

  // The stream finished cleanly: the composer accepts input again and is not
  // stuck in the sending state. (Send is disabled while the box is empty.)
  await page.getByPlaceholder(/Reply to this node/).fill("x")
  await expect(page.getByRole("button", { name: "Send message" })).toBeEnabled()
})

test.describe("signed out", () => {
  test.use({ storageState: SIGNED_OUT })

  test("a visitor is sent to /login", async ({ page }) => {
    await page.goto("/app")
    await expect(page).toHaveURL(/\/login/)
  })
})

