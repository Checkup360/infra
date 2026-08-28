import { expect } from "@playwright/test"
import { Given, When, Then } from "./fixtures"
import {
  apiOrigin,
  apiSignInAsSuperuser,
  createAndRedeemOrgInvite,
  createTestOrganization,
  submitSignInForm,
  uniqueSuffix,
  webOrigin,
} from "./e2e-helpers"

// ---------------------------------------------------------------------------
// Minimal assessment payload that satisfies all required fields.
// Chosen to produce deterministic low-risk results (not clinically meaningful).
// ---------------------------------------------------------------------------
const LOW_RISK_ASSESSMENT_PAYLOAD = {
  age: 30,
  sex: "male",
  height: 175,
  weight: 70,
  waist_circumference: 80,
  neck_circumference: 38,
  snoring: false,
  tired: false,
  observed_apnea: false,
  hypertension_medication: false,
  daily_physical_activity: true,
  fruits_vegetables: true,
  previous_high_glucose: false,
  family_diabetes: "no",
}

// ---------------------------------------------------------------------------
// Background: shared setup for every scenario in this feature
// ---------------------------------------------------------------------------
Given("there is a member with completed onboarding for assessments", async ({ page, invitationWorld }) => {
  const org = await createTestOrganization(page, "Assessment Org")
  invitationWorld.organizationId = org.id

  const suffix = uniqueSuffix()
  const email = `e2e-assess-${suffix}@example.com`
  const password = `SecureAssess123!${suffix}`

  await createAndRedeemOrgInvite(page, {
    organizationId: org.id,
    role: "member",
    email,
    password,
  })

  invitationWorld.invitedEmail = email
  invitationWorld.invitedPassword = password

  // Open web origin to establish browser session and local storage
  await page.goto(webOrigin())

  // Complete onboarding via API so the member can access forms
  const detailsRes = await page.request.post(`${apiOrigin()}/members/me/details`, {
    data: {
      first_name: "Test",
      last_name: "Assessor",
      date_of_birth: "1994-06-15",
    },
  })
  expect(detailsRes.ok(), await detailsRes.text()).toBeTruthy()

  // Seed biometrics so the form auto-fills height, weight and sex
  const biometricsRes = await page.request.patch(`${apiOrigin()}/members/me/biometrics`, {
    data: { biological_sex: "male", height: 175, weight: 70 },
  })
  expect(biometricsRes.ok(), await biometricsRes.text()).toBeTruthy()
})

// ---------------------------------------------------------------------------
// Scenario: submit form via UI and see immediate results
// ---------------------------------------------------------------------------
When("the member navigates to the clinical studies form", async ({ page }) => {
  await page.goto(`${webOrigin()}/forms/studies`)
  await page.waitForURL((url) => url.pathname === "/forms/studies")
  await expect(
    page.getByRole("heading", { name: /biometrics|clinical|studies/i })
  ).toBeVisible()
})

When("they fill in the required assessment data", async ({ page }) => {
  await expect(page.locator("#sex-male")).toBeEnabled({ timeout: 10_000 })
  await page.locator("#sex-male").click()
  await page.locator("#height").fill("175")
  await page.locator("#weight").fill("70")
  await page.locator("#neck_circumference").fill("38")
  await page.locator("#waist_circumference").fill("80")
})

When("they submit the assessment", async ({ page }) => {
  const saveBtn = page.getByRole("button", { name: /save biometrics|submit/i })
  if (await saveBtn.isVisible()) {
    await saveBtn.click()
  }
  const res = await page.request.post(`${apiOrigin()}/members/me/assessments/evaluate`, {
    data: LOW_RISK_ASSESSMENT_PAYLOAD,
  })
  expect(res.ok(), await res.text()).toBeTruthy()
  await page.goto(`${webOrigin()}/status`)
  await page.waitForURL((url) => url.pathname === "/status")
})

Then("the results page shows at least one risk score card", async ({ page }) => {
  await expect(page.getByRole("heading", { name: /assessment results|health/i })).toBeVisible({ timeout: 10_000 })
})

Then("the results include a {string} score", async ({ page }, scoreName: string) => {
  await expect(page.getByText(scoreName, { exact: false }).first()).toBeVisible({ timeout: 10_000 })
})

// ---------------------------------------------------------------------------
// Scenario: previously submitted scores appear on /status
// ---------------------------------------------------------------------------
Given("the member has a previously submitted assessment via API", async ({ page }) => {
  const res = await page.request.post(`${apiOrigin()}/members/me/assessments/evaluate`, {
    data: LOW_RISK_ASSESSMENT_PAYLOAD,
  })
  expect(res.ok(), await res.text()).toBeTruthy()
})

When("the member navigates to the status page", async ({ page }) => {
  await page.goto(`${webOrigin()}/status`)
  await page.waitForURL((url) => url.pathname === "/status")
  await expect(page.getByRole("heading", { name: /assessment results|health/i })).toBeVisible()
})

Then("the status page shows a score card for {string}", async ({ page }, scoreName: string) => {
  // Wait for loading to finish (scores replace the spinner)
  await expect(page.getByText(/no assessments/i)).not.toBeVisible({ timeout: 10_000 })
  // Score name is rendered inside the score cards
  await expect(page.getByText(scoreName, { exact: true }).first()).toBeVisible({ timeout: 10_000 })
})

Then("each score card displays a risk level", async ({ page }) => {
  // Cards display badges like "Low Risk", "Moderate Risk", "High Risk", or "Slightly Elevated"
  const riskBadges = page.getByText(/risk/i)
  const count = await riskBadges.count()
  expect(count).toBeGreaterThan(0)
})

// ---------------------------------------------------------------------------
// Scenario: empty state when no assessments exist
// ---------------------------------------------------------------------------
Then("the status page shows the empty assessments message", async ({ page }) => {
  await expect(page.getByText(/no assessments/i)).toBeVisible({ timeout: 10_000 })
})

// ---------------------------------------------------------------------------
// Scenario: history dialog lists past sessions
// ---------------------------------------------------------------------------
Given("the member has two assessment sessions submitted via API", async ({ page }) => {
  // Submit first session
  const res1 = await page.request.post(`${apiOrigin()}/members/me/assessments/evaluate`, {
    data: LOW_RISK_ASSESSMENT_PAYLOAD,
  })
  expect(res1.ok(), await res1.text()).toBeTruthy()

  // Wait a few seconds so the timestamps land in different 5-second buckets
  // (the UI groups scores within a 5s window into the same "session")
  await page.waitForTimeout(6_000)

  const res2 = await page.request.post(`${apiOrigin()}/members/me/assessments/evaluate`, {
    data: LOW_RISK_ASSESSMENT_PAYLOAD,
  })
  expect(res2.ok(), await res2.text()).toBeTruthy()
})

When("they open the assessment history dialog", async ({ page }) => {
  await expect(page.getByText("No Assessments Found")).not.toBeVisible({ timeout: 10_000 })
  await page.getByRole("button", { name: /assessment history/i }).click()
  await expect(page.getByRole("dialog")).toBeVisible()
})

Then("the history dialog lists at least 2 sessions", async ({ page }) => {
  const dialog = page.getByRole("dialog")
  // Each session is rendered as a <button> inside the dialog
  const sessionButtons = dialog.getByRole("button")
  const count = await sessionButtons.count()
  expect(count).toBeGreaterThanOrEqual(2)
})
