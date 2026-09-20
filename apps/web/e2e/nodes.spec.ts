/**
 * Working with the graph: star, collapse, delete, rename, search.
 */
import { expect, test } from "@playwright/test"
import { deleteTestSessions, generate, nodeWith, openNewSession, signIn, uniqueName } from "./helpers"

test.afterEach(async ({ page }) => {
  await deleteTestSessions(page)
})

test("star, collapse and delete nodes", async ({ page }) => {
  await signIn(page)
  await openNewSession(page)
  const rootQ = "Root question for node actions"
  const childQ = "Child question for node actions"
  await generate(page, rootQ, 1)
  await generate(page, childQ, 2) // replies to the selected (root) node

  const root = nodeWith(page, rootQ)
  const child = nodeWith(page, childQ)

  // Star / unstar (buttons appear on hover).
  await root.hover()
  await root.getByRole("button", { name: "Star node" }).click()
  await expect(root.getByRole("button", { name: "Unstar node" })).toBeVisible()

  // Collapse hides the subtree, expand brings it back.
  await root.getByRole("button", { name: "Collapse branch" }).click()
  await expect(page.locator(".react-flow__node")).toHaveCount(1)
  await root.hover()
  await root.getByRole("button", { name: "Expand branch" }).click()
  await expect(page.locator(".react-flow__node")).toHaveCount(2)

  // Delete the child; the browser confirm is accepted.
  page.on("dialog", (d) => d.accept())
  await child.hover()
  await child.getByRole("button", { name: "Delete node" }).click()
  await expect(page.locator(".react-flow__node")).toHaveCount(1)
  await expect(nodeWith(page, childQ)).toHaveCount(0)

  // Survives a reload — it was persisted, not just removed from the store.
  await page.reload()
  await expect(page.locator(".react-flow__node")).toHaveCount(1)
  await expect(root.getByRole("button", { name: "Unstar node" })).toBeAttached()
})

test("rename a session from the sidebar", async ({ page }) => {
  await signIn(page)
  const { name } = await openNewSession(page)
  const renamed = uniqueName("renamed")

  // Every session row has a (hidden until hover) rename button; take the
  // innermost container that holds both this session's name and a button.
  const row = page
    .locator("div", { has: page.getByText(name, { exact: true }) })
    .filter({ has: page.getByRole("button", { name: "Rename session" }) })
    .last()
  await row.hover()
  await row.getByRole("button", { name: "Rename session" }).click()
  // Rename mode swaps the row's name for a bare input inside the sidebar;
  // the sidebar's only other input is the (placeholder-bearing) search box.
  const field = page.locator('aside input:not([placeholder])')
  await expect(field).toHaveCount(1)
  await field.fill(renamed)
  await field.press("Enter")

  await expect(page.getByText(renamed, { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByText(renamed, { exact: true })).toBeVisible()
})

test("the sidebar filters sessions by name", async ({ page }) => {
  await signIn(page)
  const { name } = await openNewSession(page)

  await page.getByPlaceholder("Search sessions").fill(name)
  await expect(page.getByText(name, { exact: true })).toBeVisible()
  await page.getByPlaceholder("Search sessions").fill("definitely-not-a-session-name")
  await expect(page.getByText(name, { exact: true })).toHaveCount(0)
})

// /app/search renders a hardcoded RESULTS array (app/app/search/page.tsx) -
// it is placeholder UI, not wired to real sessions or nodes yet. This test
// describes the intended behaviour and is skipped until the page is real.
test.fixme("the search page finds a node by its question", async ({ page }) => {
  await signIn(page)
  await openNewSession(page)
  const needle = `needle-${Date.now()}`
  await generate(page, `Find the ${needle} in the haystack`, 1)

  await page.goto("/app/search")
  await page.getByPlaceholder("Search sessions and nodes...").fill(needle)
  await expect(page.getByText(/\d+ results?/)).toBeVisible()
  await expect(page.getByText(new RegExp(needle)).first()).toBeVisible()
})
