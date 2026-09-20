/**
 * Share links: mint one, read it signed-out, fork it into an account.
 * The token is the whole access check, so the signed-out read is the point.
 */
import { writeFileSync } from "node:fs"
import { expect, test } from "@playwright/test"
import { SIGNED_OUT, deleteTestSessions, generate, openNewSession, signIn } from "./helpers"

test.afterEach(async ({ page }) => {
  await deleteTestSessions(page)
})

// The share button writes to the clipboard; headless Chromium refuses without this.
test.use({ permissions: ["clipboard-read", "clipboard-write"] })

test("share a graph, read it signed out, fork it", async ({ page, browser }, testInfo) => {
  await signIn(page)
  const { name } = await openNewSession(page)
  const question = "What is shared stays shared"
  await generate(page, question, 1)

  // Mint the link. The button copies it to the clipboard and confirms.
  await page.getByRole("button", { name: "Share" }).click()
  await expect(page.getByRole("button", { name: "Copied" })).toBeVisible()
  const shareUrl = await page.evaluate(() => navigator.clipboard.readText())
  expect(shareUrl).toMatch(/\/share\/[0-9a-f-]{36}$/)

  // A stranger with the link sees the graph, read-only, and nothing private.
  // Explicit signed-out state: the test runner applies the project's
  // storageState to browser.newContext() too, which would sign this in.
  const stranger = await browser.newContext({ storageState: SIGNED_OUT })
  const anon = await stranger.newPage()
  try {
    await anon.goto(shareUrl)
    await expect(anon.getByText("Read-only")).toBeVisible()
    await expect(anon.getByRole("heading", { name })).toBeVisible()
    await expect(anon.getByText(/1 node\b/)).toBeVisible()

    await anon.locator(".react-flow__node").first().click()
    // The question shows on the node card and in the "Selected node" panel.
    await expect(anon.getByText(question).first()).toBeVisible()
    await expect(anon.getByText(/\(mock ·/)).toBeVisible()
    await expect(anon.getByRole("button", { name: "Delete node" })).toHaveCount(0)

    // Forking needs an account: the stranger is sent to sign up.
    await anon.getByRole("button", { name: "Fork this graph" }).click()
    // Generous: in dev mode the first hit on /signup compiles the route.
    await expect(anon).toHaveURL(/\/signup\?fork=1/, { timeout: 45_000 })
  } catch (err) {
    // The second context is not auto-screenshotted on failure; attach it.
    await anon.screenshot({ path: testInfo.outputPath("stranger.png") })
    writeFileSync(testInfo.outputPath("stranger-url.txt"), anon.url())
    throw err
  } finally {
    await stranger.close()
  }

  // A signed-in user forks it into their own sessions.
  await page.goto(shareUrl)
  await page.getByRole("button", { name: "Fork this graph" }).click()
  await expect(page).toHaveURL(/\/app\?session=/, { timeout: 30_000 })
  await expect(page.getByText(`${name} (fork)`, { exact: true })).toBeVisible()
  await expect(page.locator(".react-flow__node")).toHaveCount(1)
})

test.describe("signed out", () => {
  test.use({ storageState: SIGNED_OUT })

  test("an unknown share token is a clean 404 page, not a crash", async ({ page }) => {
    await page.goto("/share/0f8fad5b-d9cb-469f-a165-70867728950e")
    await expect(page.getByText("This link isn't available")).toBeVisible()
  })
})

