import { expect } from "@playwright/test"
import { Given, When, Then } from "./fixtures"
import {
  apiOrigin,
  createAndRedeemOrgInvite,
  createTestOrganization,
  dashboardOrigin,
  uniqueSuffix,
} from "./e2e-helpers"

Given(
  "there is an organization with a signed-in organization admin for departments",
  async ({ page, invitationWorld }) => {
    const org = await createTestOrganization(page, "Dept Org")
    invitationWorld.organizationId = org.id
    invitationWorld.organizationName = org.name
    invitationWorld.organizationSlug = org.slug

    const suffix = uniqueSuffix()
    const adminEmail = `e2e-dept-admin-${suffix}@example.com`
    const adminPassword = `SuperSecure123!${suffix}`

    await createAndRedeemOrgInvite(page, {
      organizationId: org.id,
      role: "admin",
      email: adminEmail,
      password: adminPassword,
    })

    invitationWorld.invitedEmail = adminEmail
    invitationWorld.invitedPassword = adminPassword

    await page.goto(`${dashboardOrigin()}/departments`)
    await page.waitForURL((url) => url.origin === dashboardOrigin() && url.pathname === "/departments")
    await expect(page.getByRole("heading", { name: "Departments" }).first()).toBeVisible()
  },
)

When("the org admin creates a department named {string}", async ({ page, invitationWorld }, name: string) => {
  const suffix = uniqueSuffix()
  const deptName = `${name} ${suffix}`
  invitationWorld.memberFirstName = deptName

  await page.getByRole("button", { name: /new department/i }).click()
  await expect(page.getByRole("heading", { name: /create department/i })).toBeVisible()

  await page.locator("#dept-new-name").fill(deptName)
  await page.getByRole("button", { name: /^create$/i }).click()
  await expect(page.getByRole("heading", { name: /create department/i })).toBeHidden()
})

Then("the department {string} appears in the department list", async ({ page, invitationWorld }) => {
  const deptName = invitationWorld.memberFirstName!
  await expect(page.locator('[data-slot="item-title"]', { hasText: deptName })).toBeVisible({ timeout: 10000 })
})

Given(
  "there are departments named {string} and {string}",
  async ({ page, invitationWorld }, name1: string, name2: string) => {
    const orgId = invitationWorld.organizationId!
    const suffix = uniqueSuffix()

    const deptName1 = `${name1} ${suffix}`
    const deptName2 = `${name2} ${suffix}`

    await page.request.post(`${apiOrigin()}/organizations/${orgId}/departments`, { data: { name: deptName1 } })
    await page.request.post(`${apiOrigin()}/organizations/${orgId}/departments`, { data: { name: deptName2 } })

    invitationWorld.memberFirstName = deptName1
    invitationWorld.memberLastName = deptName2

    await page.goto(`${dashboardOrigin()}/departments`)
    await page.waitForURL((url) => url.pathname === "/departments")
    await expect(page.locator('[data-slot="item-title"]', { hasText: deptName1 })).toBeVisible({ timeout: 10000 })
    await expect(page.locator('[data-slot="item-title"]', { hasText: deptName2 })).toBeVisible({ timeout: 10000 })
  },
)

When("the org admin searches for {string}", async ({ page, invitationWorld }, _target: string) => {
  const searchName = invitationWorld.memberFirstName!
  await page.getByPlaceholder(/search departments/i).fill(searchName)
})

Then("only the {string} department card is visible", async ({ page, invitationWorld }, _target: string) => {
  const deptName1 = invitationWorld.memberFirstName!
  const deptName2 = invitationWorld.memberLastName!

  await expect(page.locator('[data-slot="item-title"]', { hasText: deptName1 })).toBeVisible({ timeout: 10000 })
  await expect(page.locator('[data-slot="item-title"]', { hasText: deptName2 })).toBeHidden({ timeout: 10000 })
})

Given("there is a department named {string}", async ({ page, invitationWorld }, name: string) => {
  const orgId = invitationWorld.organizationId!
  const suffix = uniqueSuffix()
  const deptName = `${name} ${suffix}`

  const res = await page.request.post(`${apiOrigin()}/organizations/${orgId}/departments`, {
    data: { name: deptName },
  })
  expect(res.ok(), await res.text()).toBeTruthy()
  const body = (await res.json()) as { id: string; name: string; slug: string }

  invitationWorld.memberFirstName = deptName
  invitationWorld.organizationSlug = body.slug

  await page.goto(`${dashboardOrigin()}/departments`)
  await page.waitForURL((url) => url.pathname === "/departments")
  await expect(page.locator('[data-slot="item-title"]', { hasText: deptName })).toBeVisible({ timeout: 10000 })
})

When(
  "the org admin edits the department name from {string} to {string}",
  async ({ page, invitationWorld }, _oldName: string, newName: string) => {
    const oldDeptName = invitationWorld.memberFirstName!
    const suffix = uniqueSuffix()
    const updatedDeptName = `${newName} ${suffix}`
    invitationWorld.memberLastName = updatedDeptName

    const card = page.locator('[data-slot="item"]', { hasText: oldDeptName }).first()
    await card.getByRole("button", { name: "Open menu" }).click()

    await page.getByRole("menuitem", { name: /edit/i }).click()
    await page.waitForURL((url) => url.pathname.endsWith("/edit"))

    await page.locator("#department-edit-name").fill(updatedDeptName)

    const patchPromise = page.waitForResponse(
      (res) => res.url().includes("/departments") && res.request().method() === "PATCH",
    )
    await page.getByRole("button", { name: /save changes/i }).click()
    const patchRes = await patchPromise
    expect(patchRes.ok()).toBeTruthy()
  },
)

Then("the updated department name {string} is displayed", async ({ page, invitationWorld }, _newName: string) => {
  const updatedDeptName = invitationWorld.memberLastName!
  await page.goto(`${dashboardOrigin()}/departments`)
  await page.waitForURL((url) => url.pathname === "/departments")
  const searchInput = page.getByPlaceholder(/search departments/i)
  await searchInput.fill(updatedDeptName)
  await expect(page.locator('[data-slot="item-title"]', { hasText: updatedDeptName })).toBeVisible({ timeout: 15000 })
})

Given("there is an unassigned department named {string}", async ({ page, invitationWorld }, name: string) => {
  const orgId = invitationWorld.organizationId!
  const suffix = uniqueSuffix()
  const deptName = `${name} ${suffix}`

  const res = await page.request.post(`${apiOrigin()}/organizations/${orgId}/departments`, {
    data: { name: deptName },
  })
  expect(res.ok(), await res.text()).toBeTruthy()

  invitationWorld.memberFirstName = deptName

  await page.goto(`${dashboardOrigin()}/departments`)
  await page.waitForURL((url) => url.pathname === "/departments")
  await expect(page.locator('[data-slot="item-title"]', { hasText: deptName })).toBeVisible({ timeout: 10000 })
})

When("the org admin deletes the department {string}", async ({ page, invitationWorld }, _name: string) => {
  const deptName = invitationWorld.memberFirstName!
  await page.getByPlaceholder(/search departments/i).fill(deptName)
  const card = page.locator('[data-slot="item"]', { hasText: deptName }).first()
  await card.getByRole("button", { name: "Open menu" }).click()

  await page.getByRole("menuitem", { name: /delete/i }).click()
  await expect(page.getByRole("heading", { name: /delete department\?/i })).toBeVisible()

  await page.getByRole("button", { name: /^delete department$/i }).click()
  await expect(page.getByRole("heading", { name: /delete department\?/i })).toBeHidden()
})

Then("the department {string} is removed from the department list", async ({ page, invitationWorld }, _name: string) => {
  const deptName = invitationWorld.memberFirstName!
  await expect(page.locator('[data-slot="item-title"]', { hasText: deptName })).toBeHidden({ timeout: 10000 })
})
