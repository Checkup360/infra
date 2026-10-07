import { expect } from "@playwright/test"
import { Given, When, Then } from "./fixtures"
import {
  createAndRedeemOrgInvite,
  createTestOrganization,
  dashboardOrigin,
  uniqueSuffix,
} from "./e2e-helpers"

// ---------------------------------------------------------------------------
// Background: Organization setup with Admin
// ---------------------------------------------------------------------------
Given(
  "there is an organization with a signed-in organization admin for score weights",
  async ({ page, invitationWorld }) => {
    const org = await createTestOrganization(page, "Weights Org")
    invitationWorld.organizationId = org.id
    invitationWorld.organizationName = org.name
    invitationWorld.organizationSlug = org.slug

    const suffix = uniqueSuffix()
    const adminEmail = `e2e-weights-admin-${suffix}@example.com`
    const adminPassword = `SuperSecure123!${suffix}`

    await createAndRedeemOrgInvite(page, {
      organizationId: org.id,
      role: "admin",
      email: adminEmail,
      password: adminPassword,
    })

    invitationWorld.invitedEmail = adminEmail
    invitationWorld.invitedPassword = adminPassword

    await page.goto(`${dashboardOrigin()}/`)
    await page.waitForURL((url) => url.origin === dashboardOrigin())
  },
)

// ---------------------------------------------------------------------------
// Scenario 1: View Score Weights
// ---------------------------------------------------------------------------
When("the org admin navigates to the score weights page", async ({ page }) => {
  await page.goto(`${dashboardOrigin()}/score-weights`)
  await page.waitForURL(
    (url) => url.origin === dashboardOrigin() && url.pathname === "/score-weights",
  )
})

Then("they see the score weights dashboard heading", async ({ page }) => {
  await expect(
    page.getByRole("heading", { name: /score configuration|score weights/i }).first(),
  ).toBeVisible({ timeout: 10000 })
})

Then("the available score topic categories are displayed", async ({ page }) => {
  await expect(page.getByText("Diabetes").first()).toBeVisible({ timeout: 10000 })
  await expect(page.getByText("Sleep Apnea").first()).toBeVisible()
})

// ---------------------------------------------------------------------------
// Scenario 2: Update and Save Score Weights
// ---------------------------------------------------------------------------
Given("the org admin is on the score weights page", async ({ page }) => {
  await page.goto(`${dashboardOrigin()}/score-weights`)
  await page.waitForURL(
    (url) => url.origin === dashboardOrigin() && url.pathname === "/score-weights",
  )
  await expect(
    page.getByRole("heading", { name: /score configuration|score weights/i }).first(),
  ).toBeVisible({ timeout: 10000 })
})

When("they apply balanced weights across score categories", async ({ page }) => {
  const switchToggle = page.getByRole("switch").first()
  if (await switchToggle.isVisible()) {
    await switchToggle.click()
  }
  const balanceBtn = page
    .getByRole("button", { name: /reset to balanced|enable all modules|balance/i })
    .first()
  await expect(balanceBtn).toBeVisible({ timeout: 10000 })
  await balanceBtn.click()
})

When("they save the score weights configuration", async ({ page }) => {
  const saveBtn = page.getByRole("button", { name: /save changes|save weights|save/i }).first()
  await expect(saveBtn).toBeVisible({ timeout: 10000 })
  await saveBtn.click()
})

Then("the score weights changes are saved successfully", async ({ page }) => {
  await expect(
    page.getByText(/changes saved successfully|score weights updated|changes saved/i).first(),
  ).toBeVisible({ timeout: 10000 })
})
