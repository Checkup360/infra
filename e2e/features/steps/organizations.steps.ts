import { expect } from "@playwright/test"
import { Given, When, Then } from "./fixtures"
import {
  apiOrigin,
  apiSignInAsSuperuser,
  backofficeOrigin,
  uniqueSuffix,
} from "./e2e-helpers"

Given("the sysadmin is signed in to the backoffice organizations page", async ({ page }) => {
  await apiSignInAsSuperuser(page, "organizations scenario")
  await page.goto(`${backofficeOrigin()}/`)
  await page.waitForURL((url) => url.origin === backofficeOrigin())
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible()
})

When(
  "they create an organization named {string} with slug {string}",
  async ({ page, invitationWorld }, name: string, slug: string) => {
    const suffix = uniqueSuffix()
    const orgName = `${name} ${suffix}`
    const orgSlug = `${slug}-${suffix}`

    invitationWorld.organizationName = orgName
    invitationWorld.organizationSlug = orgSlug

    await page.getByRole("button", { name: /new organization/i }).click()
    await expect(page.getByRole("heading", { name: /create organization/i })).toBeVisible()

    await page.locator("#org-name").fill(orgName)
    await page.locator("#org-slug").fill(orgSlug)

    await page.getByRole("button", { name: /^create$/i }).click()
    await expect(page.getByRole("heading", { name: /create organization/i })).toBeHidden()
  },
)

Then("the organization {string} appears in the organization list", async ({ page, invitationWorld }) => {
  const orgName = invitationWorld.organizationName!
  await page.getByPlaceholder(/filter by name or slug/i).fill(orgName)
  await expect(page.locator("tbody").getByText(orgName)).toBeVisible({ timeout: 10000 })
})

Given(
  "there are organizations named {string} and {string}",
  async ({ page, invitationWorld }, name1: string, name2: string) => {
    await apiSignInAsSuperuser(page, "setup search scenario")
    const suffix = uniqueSuffix()

    const orgName1 = `${name1} ${suffix}`
    const orgSlug1 = `org-search-1-${suffix}`
    const orgName2 = `${name2} ${suffix}`
    const orgSlug2 = `org-search-2-${suffix}`

    const res1 = await page.request.post(`${apiOrigin()}/organizations/`, {
      data: { name: orgName1, slug: orgSlug1 },
    })
    expect(res1.ok(), await res1.text()).toBeTruthy()

    const res2 = await page.request.post(`${apiOrigin()}/organizations/`, {
      data: { name: orgName2, slug: orgSlug2 },
    })
    expect(res2.ok(), await res2.text()).toBeTruthy()

    invitationWorld.organizationName = orgName1
    invitationWorld.memberLastName = orgName2

    await page.goto(`${backofficeOrigin()}/`)
    await page.waitForURL((url) => url.origin === backofficeOrigin())
    await expect(page.getByRole("heading", { name: "Organizations", level: 1 })).toBeVisible({ timeout: 10000 })
  },
)

When("they search for {string} in the organization list", async ({ page, invitationWorld }, _targetName: string) => {
  const searchName = invitationWorld.organizationName!
  const filterInput = page.getByPlaceholder(/filter by name or slug/i)
  await expect(filterInput).toBeVisible({ timeout: 10000 })
  await filterInput.fill(searchName)
})

Then("only {string} is displayed in the list", async ({ page, invitationWorld }, _expectedName: string) => {
  const searchName = invitationWorld.organizationName!
  const otherName = invitationWorld.memberLastName!

  await expect(page.locator("tbody").getByText(searchName)).toBeVisible({ timeout: 10000 })
  await expect(page.locator("tbody").getByText(otherName)).toBeHidden({ timeout: 10000 })
})

When("they reset organization filters", async ({ page }) => {
  const input = page.getByPlaceholder(/filter by name or slug/i)
  await input.fill("")
  const resetBtn = page.getByRole("button", { name: /reset/i })
  if (await resetBtn.isVisible()) {
    await resetBtn.click()
  }
})

Then("all organizations are displayed in the list", async ({ page }) => {
  await expect(page.getByPlaceholder(/filter by name or slug/i)).toHaveValue("")
})

Given(
  "there is an organization named {string} for detail view",
  async ({ page, invitationWorld }, name: string) => {
    await apiSignInAsSuperuser(page, "setup detail scenario")
    const suffix = uniqueSuffix()
    const orgName = `${name} ${suffix}`
    const orgSlug = `org-detail-${suffix}`

    const res = await page.request.post(`${apiOrigin()}/organizations/`, {
      data: { name: orgName, slug: orgSlug },
    })
    expect(res.ok(), await res.text()).toBeTruthy()
    const body = (await res.json()) as { id: string; name: string }

    invitationWorld.organizationId = body.id
    invitationWorld.organizationName = body.name

    await page.goto(`${backofficeOrigin()}/`)
    await page.waitForURL((url) => url.origin === backofficeOrigin())
    await expect(page.getByRole("heading", { name: "Organizations", level: 1 })).toBeVisible({ timeout: 10000 })
  },
)

When("they click on the organization {string}", async ({ page, invitationWorld }, _name: string) => {
  const orgName = invitationWorld.organizationName!
  const filterInput = page.getByPlaceholder(/filter by name or slug/i)
  await expect(filterInput).toBeVisible({ timeout: 10000 })
  await filterInput.fill(orgName)
  const cell = page.locator("tbody").getByText(orgName).first()
  await expect(cell).toBeVisible({ timeout: 10000 })
  await cell.click()
})

Then(
  "they see the organization summary metrics with total members, employees, and admins",
  async ({ page, invitationWorld }) => {
    const orgName = invitationWorld.organizationName!
    await expect(page.getByRole("heading", { name: orgName })).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/total members/i).first()).toBeVisible()
    await expect(page.getByText(/admins/i).first()).toBeVisible()
  },
)

Given("there is an organization named {string}", async ({ page, invitationWorld }, name: string) => {
  await apiSignInAsSuperuser(page, "setup delete scenario")
  const suffix = uniqueSuffix()
  const orgName = `${name} ${suffix}`
  const orgSlug = `org-delete-${suffix}`

  const res = await page.request.post(`${apiOrigin()}/organizations/`, {
    data: { name: orgName, slug: orgSlug },
  })
  expect(res.ok(), await res.text()).toBeTruthy()

  invitationWorld.organizationName = orgName

  await page.goto(`${backofficeOrigin()}/`)
  await page.waitForURL((url) => url.origin === backofficeOrigin())
  await expect(page.getByRole("heading", { name: "Organizations", level: 1 })).toBeVisible({ timeout: 10000 })
})

When("they delete the organization {string}", async ({ page, invitationWorld }, _name: string) => {
  const orgName = invitationWorld.organizationName!
  const filterInput = page.getByPlaceholder(/filter by name or slug/i)
  await expect(filterInput).toBeVisible({ timeout: 10000 })
  await filterInput.fill(orgName)
  const row = page.locator("tr", { hasText: orgName })
  await expect(row).toBeVisible({ timeout: 10000 })
  await row.getByRole("button", { name: /delete organization/i }).click()

  await expect(page.getByRole("heading", { name: /are you absolutely sure/i })).toBeVisible()
  await page.getByRole("button", { name: /^delete organization$/i }).click()
  await expect(page.getByRole("heading", { name: /are you absolutely sure/i })).toBeHidden()
})

Then("the organization {string} is removed from the organization list", async ({ page, invitationWorld }, _name: string) => {
  const orgName = invitationWorld.organizationName!
  await expect(page.locator("tbody").getByText(orgName)).toBeHidden({ timeout: 10000 })
})
