import { expect } from "@playwright/test"
import { When, Then } from "./fixtures"
import { cmsOrigin, webOrigin } from "./e2e-helpers"

When(
  "the operator navigates to the CMS admin panel without a session",
  async ({ page }) => {
    await page.context().clearCookies()
    await page.goto(`${cmsOrigin()}/admin`, { waitUntil: "domcontentloaded" })
  },
)

Then(
  "they are redirected to the web frontend login page",
  async ({ page }) => {
    // The CMS middleware redirects to <PUBLIC_WEB_ORIGIN>/login?next=...
    await page.waitForURL((url) => url.origin === webOrigin() && url.pathname === "/login", {
      timeout: 10_000,
    })
    expect(page.url()).toContain(webOrigin())
  },
)

When("the member opens the health news page", async ({ page }) => {
  await page.goto(`${webOrigin()}/news`)
  await page.waitForURL((url) => url.pathname === "/news")
})

Then("they see the health articles and news heading", async ({ page }) => {
  await expect(
    page.getByRole("heading", { name: /health articles & news|health/i }).first(),
  ).toBeVisible({ timeout: 10000 })
})

