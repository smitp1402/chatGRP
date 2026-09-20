/**
 * Attachments ride on the user message: an image becomes a vision part, a
 * text file is inlined into the prompt. The mock streamer echoes what it
 * received, which is what makes both observable from the browser.
 */
import { expect, test } from "@playwright/test"
import { TINY_PNG, deleteTestSessions, openNewSession, signIn } from "./helpers"

/** The tray shows "<n> B" only once a file has finished uploading. */
const UPLOADED_SIZE = /^\d+(\.\d+)? (B|KB|MB)$/

test.afterEach(async ({ page }) => {
  await deleteTestSessions(page)
})

test("an image is uploaded, sent, and acknowledged by the model", async ({ page }) => {
  await signIn(page)
  await openNewSession(page)

  await page.locator('input[type="file"]').setInputFiles({
    name: "pic.png",
    mimeType: "image/png",
    buffer: TINY_PNG,
  })
  // The tray lists the file at once; the size appears when the upload to
  // storage has finished, and Send refuses until then.
  await expect(page.getByRole("button", { name: "Remove pic.png" })).toBeVisible()
  await expect(page.getByText(UPLOADED_SIZE)).toBeVisible({ timeout: 20_000 })

  await page.getByPlaceholder(/Ask anything to start/).fill("What is in this picture?")
  await page.getByRole("button", { name: "Send message" }).click()

  await expect(page.locator(".react-flow__node")).toHaveCount(1, { timeout: 30_000 })
  await expect(page.getByText(/Received 1 image\(s\): pic\.png/)).toBeVisible({ timeout: 30_000 })
  await expect(page.locator(".react-flow__node").getByTitle("1 attachment")).toBeVisible()
})

test("a text file's contents reach the model", async ({ page }) => {
  await signIn(page)
  await openNewSession(page)

  await page.locator('input[type="file"]').setInputFiles({
    name: "notes.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("The secret word is pineapple."),
  })
  await expect(page.getByRole("button", { name: "Remove notes.txt" })).toBeVisible()
  await expect(page.getByText(UPLOADED_SIZE)).toBeVisible({ timeout: 20_000 })

  await page.getByPlaceholder(/Ask anything to start/).fill("What is the secret word?")
  await page.getByRole("button", { name: "Send message" }).click()

  // The mock quotes the prompt it was given, file contents included.
  await expect(page.getByText(/pineapple/).first()).toBeVisible({ timeout: 30_000 })
})

test("a removed attachment is not sent", async ({ page }) => {
  await signIn(page)
  await openNewSession(page)

  await page.locator('input[type="file"]').setInputFiles({ name: "gone.png", mimeType: "image/png", buffer: TINY_PNG })
  const remove = page.getByRole("button", { name: "Remove gone.png" })
  await expect(remove).toBeVisible()
  await expect(page.getByText(UPLOADED_SIZE)).toBeVisible({ timeout: 20_000 })
  await remove.click()
  await expect(remove).toHaveCount(0)

  await page.getByPlaceholder(/Ask anything to start/).fill("No picture this time")
  await page.getByRole("button", { name: "Send message" }).click()
  await expect(page.locator(".react-flow__node")).toHaveCount(1, { timeout: 30_000 })
  await expect(page.getByText(/Received \d+ image/)).toHaveCount(0)
})
