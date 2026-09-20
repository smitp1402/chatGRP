/**
 * Prompt library: save the current draft as a prompt, find it, insert it.
 */
import { expect, test } from "@playwright/test"
import { deleteTestPrompts, deleteTestSessions, openNewSession, signIn, uniqueName } from "./helpers"

test.afterEach(async ({ page }) => {
  await deleteTestPrompts(page)
  await deleteTestSessions(page)
})

test("save a draft as a prompt, then insert it back", async ({ page }) => {
  await signIn(page)
  await openNewSession(page)

  const title = uniqueName("prompt")
  const body = "Summarize the following in three bullet points."

  // Type a draft, save it to the library from the composer.
  const composer = page.getByPlaceholder(/Ask anything to start/)
  await composer.fill(body)
  await page.getByTitle("Save this as a prompt").click()

  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()
  await expect(dialog.locator("#p-body")).toHaveValue(body) // prefilled from the draft
  await dialog.locator("#p-title").fill(title)
  const saved = page.waitForResponse((r) => r.url().endsWith("/api/prompts") && r.request().method() === "POST")
  await dialog.getByRole("button", { name: "Save prompt" }).click()
  const saveRes = await saved
  expect(saveRes.status(), `POST /api/prompts: ${await saveRes.text()}`).toBe(201)

  // It is in the list; insert it into an emptied composer.
  await expect(dialog.getByText(title, { exact: true })).toBeVisible()
  await page.keyboard.press("Escape")
  await composer.fill("")

  await page.getByRole("button", { name: "Prompts" }).click()
  const card = page.getByRole("dialog").locator("div", { hasText: title }).filter({ has: page.getByRole("button", { name: "Insert" }) }).last()
  await card.getByRole("button", { name: "Insert" }).click()
  await expect(composer).toHaveValue(body)

  // Persisted server-side, not just in the store.
  const res = await page.request.get("/api/prompts")
  const { data } = (await res.json()) as { data: { title: string }[] }
  expect(data.some((p) => p.title === title)).toBe(true)
})

test("a prompt can be deleted from the library", async ({ page }) => {
  await signIn(page)
  await openNewSession(page)
  const title = uniqueName("prompt")
  await page.request.post("/api/prompts", { data: { title, body: "to be deleted" } })

  page.on("dialog", (d) => d.accept())
  await page.getByRole("button", { name: "Prompts" }).click()
  const dialog = page.getByRole("dialog")
  await expect(dialog.getByText(title, { exact: true })).toBeVisible()
  const deleted = page.waitForResponse((r) => /\/api\/prompts\/[^/]+$/.test(r.url()) && r.request().method() === "DELETE")
  await dialog.locator("div", { hasText: title }).filter({ has: page.getByRole("button", { name: "Delete prompt" }) }).last()
    .getByRole("button", { name: "Delete prompt" }).click()
  const delRes = await deleted
  expect(delRes.status(), `DELETE /api/prompts/:id: ${await delRes.text()}`).toBe(200)
  await expect(dialog.getByText(title, { exact: true })).toHaveCount(0)
})
