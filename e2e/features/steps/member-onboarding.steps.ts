import { expect } from "@playwright/test"
import { Given, When, Then } from "./fixtures"
import {
  apiOrigin,
  apiSignInAsSuperuser,
  expectCurrentUser,
  uniqueSuffix,
  webOrigin,
} from "./e2e-helpers"

Given("there is an organization for onboarding", async ({ page, invitationWorld }) => {
  await apiSignInAsSuperuser(page, "onboarding scenario setup")
  const suffix = uniqueSuffix()
  const name = `E2E Org Onboarding ${suffix}`
  const slug = `e2e-org-onboarding-${suffix}`

  const res = await page.request.post(`${apiOrigin()}/organizations/`, {
    data: { name, slug },
  })
  expect(res.ok(), await res.text()).toBeTruthy()

  const body = (await res.json()) as { id: string; name: string; slug: string }
  invitationWorld.organizationId = body.id
  invitationWorld.organizationName = body.name
  invitationWorld.organizationSlug = body.slug
})

Given(
  "a new organization member without profile details is created and signed in",
  async ({ page, invitationWorld }) => {
    const orgId = invitationWorld.organizationId
    if (!orgId) throw new Error("Missing organizationId in test world")

    const suffix = uniqueSuffix()
    const email = `e2e-onboard-user-${suffix}@example.com`
    const password = `SuperSecure123!${suffix}`

    const inviteRes = await page.request.post(`${apiOrigin()}/invites/organization`, {
      data: {
        organization_id: orgId,
        role: "member",
        email,
        max_uses: 1,
        expires_in_hours: 24,
      },
    })
    expect(inviteRes.ok(), await inviteRes.text()).toBeTruthy()
    const inviteBody = (await inviteRes.json()) as { token: string }

    await page.context().clearCookies()
    const redeemRes = await page.request.post(
      `${apiOrigin()}/invites/${encodeURIComponent(inviteBody.token)}/redeem`,
      {
        data: { email, password },
        maxRedirects: 0,
      },
    )
    expect(redeemRes.status(), await redeemRes.text()).toBe(303)

    invitationWorld.invitedEmail = email
    invitationWorld.invitedPassword = password

    const currentUser = await expectCurrentUser(page)
    expect(currentUser.requires_onboarding).toBe(true)
  },
)

When("the member opens the web application home page", async ({ page }) => {
  await page.goto(`${webOrigin()}/`)
})

Then("they are redirected to the onboarding wizard page", async ({ page }) => {
  await page.waitForURL((url) => url.pathname === "/onboarding")
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
})

Given("the member is on the onboarding wizard page", async ({ page }) => {
  await page.goto(`${webOrigin()}/onboarding`)
  await page.waitForURL((url) => url.pathname === "/onboarding")
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
})

When("they click get started to begin the wizard", async ({ page }) => {
  const nextBtn = page.getByRole("button", { name: /start onboarding|next|get started|continue/i }).first()
  await expect(nextBtn).toBeVisible()
  await nextBtn.click()
})

When(
  "they fill personal details {string}, {string}, {string}, {string}, {string}",
  async (
    { page, invitationWorld },
    firstName: string,
    lastName: string,
    phone: string,
    dob: string,
    gender: string,
  ) => {
    invitationWorld.memberFirstName = firstName
    invitationWorld.memberLastName = lastName
    invitationWorld.memberPhone = phone

    await page.getByLabel(/first name/i).fill(firstName)
    await page.getByLabel(/last name/i).fill(lastName)
    await page.getByLabel(/phone number/i).fill(phone)
    await page.locator("#date-of-birth").fill(dob)

    await page.getByLabel(/gender/i).click()
    await page.getByRole("option", { name: new RegExp(`^${gender}$`, "i") }).click()

    const nextBtn = page.getByRole("button", { name: /next step|next|continue/i }).first()
    await nextBtn.click()
  },
)

When(
  "they fill health details {string}, {string}, {string}, {string}, {string}, {string}",
  async (
    { page },
    weight: string,
    height: string,
    bloodType: string,
    smoking: string,
    alcohol: string,
    exercise: string,
  ) => {
    await page.getByLabel(/weight/i).fill(weight)
    await page.getByLabel(/height/i).fill(height)

    await page.locator("#blood-type").click()
    await page.getByRole("option", { name: bloodType, exact: true }).click()

    await page.locator("#smoking-status").click()
    await page.getByRole("option", { name: smoking, exact: true }).click()

    await page.locator("#alcohol-consumption").click()
    await page.getByRole("option", { name: alcohol, exact: true }).click()

    await page.locator("#exercise-frequency").click()
    await page.getByRole("option", { name: exercise, exact: true }).click()
  },
)

When("they submit the onboarding form", async ({ page }) => {
  const submitPromise = page.waitForResponse(
    (response) =>
      response.url().includes("/members/me/details") &&
      response.request().method() === "POST",
  )
  const submitBtn = page.getByRole("button", { name: /complete|submit/i }).first()
  await submitBtn.click()
  const res = await submitPromise
  expect(res.ok()).toBeTruthy()
})

Then("the member onboarding is marked complete", async ({ page }) => {
  const user = await expectCurrentUser(page)
  expect(user.requires_onboarding).toBe(false)
})

Then("the member reaches the web dashboard page", async ({ page }) => {
  await page.waitForURL((url) => url.pathname === "/", { timeout: 10000 })
})

Given(
  "the member has completed onboarding with {string}, {string}, {string}",
  async ({ page, invitationWorld }, firstName: string, lastName: string, phone: string) => {
    invitationWorld.memberFirstName = firstName
    invitationWorld.memberLastName = lastName
    invitationWorld.memberPhone = phone

    const res = await page.request.post(`${apiOrigin()}/members/me/details`, {
      data: {
        first_name: firstName,
        last_name: lastName,
        phone_number: phone,
        date_of_birth: "1990-01-01",
      },
    })
    expect(res.ok(), await res.text()).toBeTruthy()

    const user = await expectCurrentUser(page)
    expect(user.requires_onboarding).toBe(false)
  },
)

When("they open the profile settings page", async ({ page }) => {
  await page.goto(`${webOrigin()}/settings`)
  await expect(page.getByRole("heading", { name: "Settings", exact: true }).first()).toBeVisible()
})

When(
  "they update their name to {string}, {string} and phone to {string}",
  async ({ page }, firstName: string, lastName: string, phone: string) => {
    await page.getByLabel(/first name/i).fill(firstName)
    await page.getByLabel(/last name/i).fill(lastName)
    await page.getByLabel(/phone number/i).fill(phone)

    const profileForm = page.locator("form").filter({ has: page.getByLabel(/first name/i) })
    await profileForm.getByRole("button", { name: /save changes|save/i }).click()
  },
)

Then("the profile changes are saved successfully", async ({ page }) => {
  await expect(page.getByText("Changes saved successfully.")).toBeVisible()

  const res = await page.request.get(`${apiOrigin()}/members/me/profile`)
  expect(res.ok(), await res.text()).toBeTruthy()
  const profile = (await res.json()) as {
    first_name: string
    last_name: string
    phone_number: string
  }
  expect(profile.first_name).toBe("Janice")
  expect(profile.last_name).toBe("Smith")
  expect(profile.phone_number).toBe("+54 11 5555-4444")
})

When(
  "they update their biometrics to sex {string}, height {string}, weight {string}",
  async ({ page }, sex: string, height: string, weight: string) => {
    const biometricsForm = page.locator("form").filter({ has: page.getByLabel(/height/i) })

    await biometricsForm.getByLabel(/biological sex/i).click()
    await page.getByRole("option", { name: new RegExp(`^${sex}$`, "i") }).click()

    await biometricsForm.getByLabel(/height/i).fill(height)
    await biometricsForm.getByLabel(/weight/i).fill(weight)

    const patchPromise = page.waitForResponse(
      (res) => res.url().includes("/biometrics") && res.request().method() === "PATCH",
    )
    await biometricsForm.getByRole("button", { name: /save changes|save/i }).click()
    const patchRes = await patchPromise
    expect(patchRes.ok(), await patchRes.text()).toBeTruthy()
  },
)

Then("the biometrics changes are saved successfully", async ({ page }) => {
  await expect(
    page.locator("form").filter({ has: page.getByLabel(/height/i) }).getByText("Changes saved successfully."),
  ).toBeVisible()

  const res = await page.request.get(`${apiOrigin()}/members/me/biometrics`)
  expect(res.ok(), await res.text()).toBeTruthy()
  const biometrics = (await res.json()) as {
    biological_sex: string | null
    height: number | null
    weight: number | null
  }
  expect(biometrics.biological_sex).toBe("male")
  expect(biometrics.height).toBe(175)
  expect(biometrics.weight).toBe(72)
})

Given(
  "they have saved biometrics with sex {string}, height {string}, weight {string}",
  async ({ page }, sex: string, height: string, weight: string) => {
    const res = await page.request.patch(`${apiOrigin()}/members/me/biometrics`, {
      data: {
        biological_sex: sex,
        height: parseFloat(height),
        weight: parseFloat(weight),
      },
    })
    expect(res.ok(), await res.text()).toBeTruthy()
  },
)

Then(
  "the profile form shows first name {string}, last name {string}",
  async ({ page }, firstName: string, lastName: string) => {
    const profileForm = page.locator("form").filter({ has: page.getByLabel(/first name/i) })
    await expect(profileForm.getByLabel(/first name/i)).toHaveValue(firstName)
    await expect(profileForm.getByLabel(/last name/i)).toHaveValue(lastName)
  },
)

Then(
  "the biometrics form shows height {string} and weight {string}",
  async ({ page }, height: string, weight: string) => {
    const biometricsForm = page.locator("form").filter({ has: page.getByLabel(/height/i) })
    await expect(biometricsForm.getByLabel(/height/i)).toHaveValue(height)
    await expect(biometricsForm.getByLabel(/weight/i)).toHaveValue(weight)
  },
)

