/**
 * Signs in once per run and saves the browser state (Supabase session
 * cookies) for every test to reuse. Supabase Auth rate-limits sign-ins per
 * IP, so one sign-in per suite - not one per test - is the difference between
 * a green run and a wall of "waitForURL timed out".
 */
import { expect, test as setup } from "@playwright/test"
import { AUTH_STATE } from "./helpers"

setup("sign in as the dev account", async ({ page }) => {
  await page.goto("/login")
  const devLogin = page.getByRole("button", { name: "Dev quick login" })
  await expect(
    devLogin,
    "Dev quick login button - set NEXT_PUBLIC_DEV_EMAIL and NEXT_PUBLIC_DEV_PASSWORD",
  ).toBeVisible()
  await devLogin.click()
  await page.waitForURL(/\/(app|onboarding)(\/|$|\?)/, { timeout: 30_000 })

  // A brand-new account is sent to onboarding first; complete it via the API
  // so the graph tests stay about the graph. account.spec.ts covers the screens.
  if (page.url().includes("/onboarding")) {
    const res = await page.request.post("/api/onboarding", { data: { defaultModelId: "gpt-4o-mini" } })
    expect(res.ok(), "onboarding API").toBeTruthy()
    await page.goto("/app")
  }
  await expect(page).toHaveURL(/\/app(\/|$|\?)/)

  await page.context().storageState({ path: AUTH_STATE })
})
