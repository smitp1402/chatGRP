/**
 * The account lifecycle: first login, the onboarding screens, delete account,
 * login refused afterwards. Self-cleaning by design - the account it uses is
 * the one it deletes.
 *
 * The user is created through Supabase's admin API (service-role key, no
 * email) rather than the sign-up form: every form sign-up sends a
 * confirmation email, and the project's built-in sender allows only a few per
 * hour, so a test loop through the form dies with `over_email_send_rate_limit`.
 * The form's own client-side gating is checked separately below.
 */
import { expect, test } from "@playwright/test"
import { SIGNED_OUT } from "./helpers"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY

// Traces record request headers, and this file sends the service-role key
// in one. Never keep a trace or video of it, even locally.
test.use({ storageState: SIGNED_OUT, trace: "off", video: "off" })

test("first login → onboarding → delete account → login refused", async ({ page, request }) => {
  test.skip(!SUPABASE_URL || !SERVICE_ROLE, "needs E2E_SUPABASE_SERVICE_ROLE_KEY to create a throwaway user")
  const admin = { apikey: SERVICE_ROLE!, Authorization: `Bearer ${SERVICE_ROLE}` }

  // Precondition: the delete_account RPC (migration 0004) exists on this project.
  const probe = await request.post(`${SUPABASE_URL}/rest/v1/rpc/delete_account`, { headers: admin, data: {} })
  test.skip(
    probe.status() === 404 && (await probe.text()).includes("PGRST202"),
    "migration 0004_delete_account.sql is not applied on this Supabase project",
  )

  const stamp = Date.now()
  const email = `e2e-${stamp}@example.com`
  const password = `E2e-pass-${stamp}!`

  // Create a confirmed user with no email round trip.
  const created = await request.post(`${SUPABASE_URL}/auth/v1/admin/users`, {
    headers: admin,
    data: { email, password, email_confirm: true },
  })
  expect(created.ok(), `admin create user: ${await created.text()}`).toBeTruthy()
  const userId = ((await created.json()) as { id: string }).id

  try {
    // First login lands on onboarding.
    await page.goto("/login")
    await page.locator("#email").fill(email)
    await page.locator("#password").fill(password)
    await page.locator('button[type="submit"]').click()
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 30_000 })

    // Onboarding: welcome → about you → default model.
    await page.getByRole("button", { name: "Continue" }).click()
    await page.locator("#name").fill("E2E Person")
    await page.getByRole("button", { name: "Engineer" }).click()
    await page.getByRole("button", { name: "Continue" }).click()
    await expect(page.getByRole("heading", { name: "Pick a default model" })).toBeVisible()
    await page.getByRole("button", { name: "Enter ChatGRP" }).click()
    await expect(page).toHaveURL(/\/app(\/|$|\?)/, { timeout: 30_000 })

    // Onboarding does not repeat.
    await page.goto("/app")
    await expect(page).toHaveURL(/\/app(\/|$|\?)/)

    // Delete the account from settings; the confirm word gates the button.
    await page.goto("/app/settings")
    await page.getByRole("button", { name: "Delete account" }).first().click()
    const dialog = page.getByRole("dialog")
    const confirm = dialog.getByRole("button", { name: "Delete account" })
    await expect(confirm).toBeDisabled()
    await dialog.locator("#confirm").fill("DELETE")
    await expect(confirm).toBeEnabled()
    await confirm.click()
    // Settings signs the user out and sends them to the landing page.
    await expect(page).toHaveURL(/^https?:\/\/[^/]+\/?$/, { timeout: 30_000 })

    // The login no longer exists.
    await page.goto("/login")
    await page.locator("#email").fill(email)
    await page.locator("#password").fill(password)
    await page.locator('button[type="submit"]').click()
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByText(/invalid|incorrect|not found/i).first()).toBeVisible({ timeout: 15_000 })
  } finally {
    // If the UI path did not finish, remove the throwaway user ourselves.
    await request.delete(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, { headers: admin })
  }
})

test("the sign-up form refuses to submit until the terms are accepted", async ({ page }) => {
  await page.goto("/signup")
  await page.locator("#name").fill("E2E Person")
  await page.locator("#email").fill("e2e-form-only@example.com")
  await page.locator("#password").fill("E2e-pass-123456!")
  await page.locator("#confirm").fill("E2e-pass-123456!")

  const submit = page.locator('button[type="submit"]')
  await expect(submit).toBeDisabled()
  await page.getByRole("checkbox").check()
  await expect(submit).toBeEnabled()

  // A mismatched confirmation disables it again - nothing is ever submitted here.
  await page.locator("#confirm").fill("something-else")
  await expect(submit).toBeDisabled()
})
