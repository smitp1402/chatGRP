/**
 * Layout presets and branch export.
 */
import { expect, test } from "@playwright/test"
import { deleteTestSessions, generate, openNewSession, signIn } from "./helpers"

test.afterEach(async ({ page }) => {
  await deleteTestSessions(page)
})

test("layout presets show and hide the canvas", async ({ page }) => {
  await signIn(page)
  await openNewSession(page)
  await generate(page, "Layout test node", 1)

  const canvas = page.locator(".react-flow")
  await expect(canvas).toBeVisible()

  await page.getByRole("button", { name: "Change layout" }).click()
  await page.getByRole("menuitem", { name: "Chat only" }).click()
  await expect(canvas).toHaveCount(0)
  await expect(page.getByPlaceholder(/Reply to this node|Ask anything/)).toBeVisible()

  await page.getByRole("button", { name: "Change layout" }).click()
  await page.getByRole("menuitem", { name: "Split 50/50" }).click()
  await expect(canvas).toBeVisible()
  await expect(page.locator(".react-flow__node")).toHaveCount(1)
})

test("export a branch as markdown", async ({ page, context }) => {
  await signIn(page)
  await openNewSession(page)
  const question = "Export me as markdown please"
  await generate(page, question, 1)

  await page.locator(".react-flow__node").first().click()

  // The button opens the export URL in a new tab; the route answers with
  // Content-Disposition: attachment. Headless Chromium does not surface that
  // as a download event reliably, so read the same URL with the page's
  // cookies and check the markdown itself.
  const exportRequest = context.waitForEvent("request", (r) => /\/api\/nodes\/[0-9a-f-]{36}\/export$/.test(r.url()))
  await page.getByTitle("Export this branch as markdown").click()
  const exportUrl = (await exportRequest).url()
  const res = await page.request.get(exportUrl)
  expect(res.ok()).toBeTruthy()
  expect(res.headers()["content-type"]).toContain("text/markdown")
  expect(res.headers()["content-disposition"]).toMatch(/attachment; filename=".*\.md"/)
  const body = await res.text()
  expect(body).toContain(question)
  expect(body).toMatch(/\(mock ·/)
})
