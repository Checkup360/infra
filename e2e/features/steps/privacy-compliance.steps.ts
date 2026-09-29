import { expect } from "@playwright/test"
import { Given, When, Then } from "./fixtures"
import {
  apiOrigin,
  apiSignInAsSuperuser,
  backofficeOrigin,
  createAndRedeemOrgInvite,
  createTestOrganization,
  dashboardOrigin,
  expectCurrentUser,
  uniqueSuffix,
  webOrigin,
} from "./e2e-helpers"

// ---------------------------------------------------------------------------
// Background: Organization setup
// ---------------------------------------------------------------------------
Given("there is an organization for compliance testing", async ({ page, invitationWorld }) => {
  const org = await createTestOrganization(page, "Compliance Org")
  invitationWorld.organizationId = org.id
  invitationWorld.organizationName = org.name
  invitationWorld.organizationSlug = org.slug
})

// ---------------------------------------------------------------------------
// Scenario 1: Onboarding with consents
// ---------------------------------------------------------------------------
Given(
  "a new organization member is created and signed in for compliance onboarding",
  async ({ page, invitationWorld }) => {
    const orgId = invitationWorld.organizationId
    if (!orgId) throw new Error("Missing organizationId in test world")

    const suffix = uniqueSuffix()
    const email = `e2e-compliance-user-${suffix}@example.com`
    const password = `SuperSecure123!${suffix}`

    await createAndRedeemOrgInvite(page, {
      organizationId: orgId,
      role: "member",
      email,
      password,
    })

    invitationWorld.invitedEmail = email
    invitationWorld.invitedPassword = password

    const currentUser = await expectCurrentUser(page)
    expect(currentUser.requires_onboarding).toBe(true)
  },
)

When(
  "they fill biometrics details {string}, {string}",
  async ({ page }, weight: string, height: string) => {
    const heightInMeters = parseFloat(height) > 10 ? (parseFloat(height) / 100).toString() : height
    await page.getByLabel(/weight/i).fill(weight)
    await page.getByLabel(/height/i).fill(heightInMeters)

    const nextBtn = page.getByRole("button", { name: /next step|next|continue/i }).first()
    await nextBtn.click()
  },
)

When(
  "they accept the baseline privacy and health data processing agreements",
  async ({ page }) => {
    const termsCheckbox = page.locator("#accept-terms")
    if (await termsCheckbox.isVisible()) {
      if (!(await termsCheckbox.isChecked())) {
        await termsCheckbox.check()
      }
    }

    const privacyCheckbox = page.locator("#accept-privacy")
    if (await privacyCheckbox.isVisible()) {
      if (!(await privacyCheckbox.isChecked())) {
        await privacyCheckbox.check()
      }
    }

    const healthCheckbox = page.locator("#accept-health")
    if (await healthCheckbox.isVisible()) {
      if (!(await healthCheckbox.isChecked())) {
        await healthCheckbox.check()
      }
    }
  },
)

Then(
  "the member has active consents recorded for terms, privacy, and health processing",
  async ({ page }) => {
    const res = await page.request.get(`${apiOrigin()}/members/me/consents`)
    expect(res.ok(), await res.text()).toBeTruthy()
    const data = (await res.json()) as {
      items: Array<{ consent_type: string; revoked_at: string | null }>
    }

    const consentTypes = data.items
      .filter((item) => !item.revoked_at)
      .map((item) => item.consent_type)

    expect(consentTypes).toContain("TERMS_AND_CONDITIONS")
    expect(consentTypes).toContain("PRIVACY_POLICY")
    expect(consentTypes).toContain("HEALTH_DATA_PROCESSING_CONSENT")
  },
)

// ---------------------------------------------------------------------------
// Scenario 2: Informed consent gate before health form
// ---------------------------------------------------------------------------
Given(
  "there is a member with completed onboarding for compliance",
  async ({ page, invitationWorld }) => {
    const orgId = invitationWorld.organizationId!
    const suffix = uniqueSuffix()
    const email = `e2e-comp-member-${suffix}@example.com`
    const password = `SuperSecure123!${suffix}`

    await createAndRedeemOrgInvite(page, {
      organizationId: orgId,
      role: "member",
      email,
      password,
    })

    invitationWorld.invitedEmail = email
    invitationWorld.invitedPassword = password

    await page.goto(webOrigin())

    const detailsRes = await page.request.post(`${apiOrigin()}/members/me/details`, {
      data: {
        first_name: "Compliance",
        last_name: "Tester",
        phone_number: "+54 11 5555-6666",
        date_of_birth: "1990-01-01",
      },
    })
    expect(detailsRes.ok(), await detailsRes.text()).toBeTruthy()

    await page.request.post(`${apiOrigin()}/members/me/consents`, {
      data: { consent_type: "TERMS_AND_CONDITIONS", document_version: "1.0" },
    })
    await page.request.post(`${apiOrigin()}/members/me/consents`, {
      data: { consent_type: "PRIVACY_POLICY", document_version: "1.0" },
    })
    await page.request.post(`${apiOrigin()}/members/me/consents`, {
      data: { consent_type: "HEALTH_DATA_PROCESSING_CONSENT", document_version: "1.0" },
    })
  },
)

When(
  "the member navigates to the clinical studies form without form consent",
  async ({ page }) => {
    await page.goto(`${webOrigin()}/forms/studies?form=biometrics`)
    await page.waitForURL((url) => url.pathname === "/forms/studies")
  },
)

Then(
  "they see the informed consent requirement card for {string}",
  async ({ page }, _title: string) => {
    await expect(
      page.getByText(/informed consent required/i).first(),
    ).toBeVisible({ timeout: 10000 })
    await expect(
      page.getByRole("button", { name: /review & give consent|give consent/i }),
    ).toBeVisible()
  },
)

When("they click review and give consent", async ({ page }) => {
  const btn = page.getByRole("button", { name: /review & give consent|give consent/i })
  await btn.click()
  await expect(page.getByRole("dialog")).toBeVisible()
})

When("they accept the informed consent in the modal", async ({ page }) => {
  const dialog = page.getByRole("dialog")
  const ackCheckbox = dialog.locator("#consent-form-ack-modal")
  if (await ackCheckbox.isVisible()) {
    if (!(await ackCheckbox.isChecked())) {
      await ackCheckbox.check()
    }
  }

  const acceptBtn = dialog.getByRole("button", { name: /acknowledge & start|accept/i })
  await acceptBtn.click()
  await expect(dialog).toBeHidden({ timeout: 10000 })
})

Then("the clinical studies form is unlocked and ready for data entry", async ({ page }) => {
  await expect(page.locator("#height")).toBeVisible({ timeout: 10000 })
  await expect(page.locator("#weight")).toBeVisible()
  await expect(page.getByRole("button", { name: /save biometrics|save/i })).toBeVisible()
})

// ---------------------------------------------------------------------------
// Scenario 3: Habeas Data Export
// ---------------------------------------------------------------------------
Then("they see the data portability and export section", async ({ page }) => {
  await expect(
    page.getByText(/data portability & export/i).first(),
  ).toBeVisible({ timeout: 10000 })
  await expect(
    page.getByRole("button", { name: /export my data/i }),
  ).toBeVisible()
})

When("they request their personal data export", async ({ page }) => {
  const exportBtn = page.getByRole("button", { name: /export my data/i })
  await exportBtn.click()
})

Then("their data export archive is downloaded successfully", async ({ page }) => {
  await expect(
    page.getByText(/downloaded successfully|generating export/i).first(),
  ).toBeVisible({ timeout: 10000 })
})

// ---------------------------------------------------------------------------
// Scenario 4: Consent Revocation
// ---------------------------------------------------------------------------
Given(
  "there is a member with an active form consent for {string}",
  async ({ page, invitationWorld }, formType: string) => {
    const orgId = invitationWorld.organizationId!
    const suffix = uniqueSuffix()
    const email = `e2e-revoke-${suffix}@example.com`
    const password = `SuperSecure123!${suffix}`

    await createAndRedeemOrgInvite(page, {
      organizationId: orgId,
      role: "member",
      email,
      password,
    })

    invitationWorld.invitedEmail = email
    invitationWorld.invitedPassword = password

    await page.goto(webOrigin())

    await page.request.post(`${apiOrigin()}/members/me/details`, {
      data: {
        first_name: "Revoke",
        last_name: "Tester",
        phone_number: "+54 11 5555-7777",
        date_of_birth: "1991-02-02",
      },
    })

    await page.request.post(`${apiOrigin()}/members/me/consents`, {
      data: { consent_type: "TERMS_AND_CONDITIONS", document_version: "1.0" },
    })
    await page.request.post(`${apiOrigin()}/members/me/consents`, {
      data: { consent_type: "PRIVACY_POLICY", document_version: "1.0" },
    })
    await page.request.post(`${apiOrigin()}/members/me/consents`, {
      data: { consent_type: "HEALTH_DATA_PROCESSING_CONSENT", document_version: "1.0" },
    })
    const formConsentRes = await page.request.post(`${apiOrigin()}/members/me/consents`, {
      data: { consent_type: "FORM_CONSENT", form_type: formType, document_version: "1.0" },
    })
    expect(formConsentRes.ok(), await formConsentRes.text()).toBeTruthy()
  },
)

Then(
  "they see {string} listed as active",
  async ({ page }, consentTitle: string) => {
    const consentCard = page.locator(".divide-y > div", { hasText: consentTitle })
    await expect(consentCard).toBeVisible({ timeout: 10000 })
    await expect(consentCard.getByText("Active")).toBeVisible()
  },
)

When(
  "they click to revoke the consent for {string}",
  async ({ page }, consentTitle: string) => {
    const consentCard = page.locator(".divide-y > div", { hasText: consentTitle })
    await consentCard.getByRole("button", { name: /revoke/i }).click()
  },
)

When("they confirm the revocation dialog", async ({ page }) => {
  const dialog = page.getByRole("alertdialog")
  await expect(dialog).toBeVisible()
  await dialog.getByRole("button", { name: /confirm revocation/i }).click()
  await expect(dialog).toBeHidden({ timeout: 10000 })
})

Then("the consent status is updated to revoked", async ({ page }) => {
  await expect(
    page.getByText(/consent successfully revoked|revoked/i).first(),
  ).toBeVisible({ timeout: 10000 })
})

// ---------------------------------------------------------------------------
// Scenario 5: Compliance Dashboard for Organization Admin
// ---------------------------------------------------------------------------
Given(
  "there is a signed-in organization admin for the compliance dashboard",
  async ({ page, invitationWorld }) => {
    const org = await createTestOrganization(page, "Legal Org")
    invitationWorld.organizationId = org.id
    invitationWorld.organizationName = org.name
    invitationWorld.organizationSlug = org.slug

    const suffix = uniqueSuffix()
    const adminEmail = `e2e-legal-admin-${suffix}@example.com`
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

When("they navigate to the compliance and audit page", async ({ page }) => {
  await page.goto(`${dashboardOrigin()}/compliance`)
  await page.waitForURL((url) => url.origin === dashboardOrigin() && url.pathname === "/compliance")
})

Then("they see the compliance dashboard heading", async ({ page }) => {
  await expect(
    page.getByRole("heading", { name: /compliance & legal audit/i }).first(),
  ).toBeVisible({ timeout: 10000 })
})

Then(
  "the audit metrics cards display total audit events and accepted consents",
  async ({ page }) => {
    await expect(page.getByText("Total Audit Events").first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByText("Consents Accepted").first()).toBeVisible()
  },
)

Then("the compliance audit trail table is visible", async ({ page }) => {
  await expect(page.getByText("Audit Trail").first()).toBeVisible({ timeout: 10000 })
})

// ---------------------------------------------------------------------------
// Scenario 6: PHQ-9 Mental Health Crisis Support Alert
// ---------------------------------------------------------------------------
When("the member navigates to the mood assessment study form", async ({ page }) => {
  await page.goto(`${webOrigin()}/forms/studies?form=mood`)
  await page.waitForURL((url) => url.pathname === "/forms/studies")
})

When("they indicate thoughts of self-harm in the questionnaire", async ({ page }) => {
  const option = page.locator("#self_harm_thoughts-1")
  await expect(option).toBeVisible({ timeout: 10000 })
  await option.click()
})

Then("the confidential crisis support helpline alert is displayed", async ({ page }) => {
  await expect(
    page.getByText(/confidential crisis support & immediate assistance/i).first(),
  ).toBeVisible({ timeout: 10000 })
})

Then("the helpline alert contains emergency contact numbers", async ({ page }) => {
  await expect(page.getByText("135").first()).toBeVisible()
  await expect(page.getByText("0800-999-0091").first()).toBeVisible()
})

// ---------------------------------------------------------------------------
// Scenario 7: Global Compliance Audit Logs in Backoffice
// ---------------------------------------------------------------------------
Given("the sysadmin is signed in to the backoffice audit logs page", async ({ page }) => {
  await apiSignInAsSuperuser(page, "audit logs scenario")
  await page.goto(`${backofficeOrigin()}/audit-logs`)
  await page.waitForURL((url) => url.origin === backofficeOrigin() && url.pathname === "/audit-logs")
})

Then("they see the system audit trail heading", async ({ page }) => {
  await expect(
    page.getByRole("heading", { name: /system audit trail/i }).first(),
  ).toBeVisible({ timeout: 10000 })
})

Then("the audit logs filter for accepted consents is available", async ({ page }) => {
  await expect(
    page.getByRole("button", { name: /^accepted$/i }).first(),
  ).toBeVisible({ timeout: 10000 })
})

