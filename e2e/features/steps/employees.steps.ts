import { expect, request } from "@playwright/test"
import { Given, When, Then } from "./fixtures"
import {
  apiOrigin,
  apiSignInAsSuperuser,
  dashboardOrigin,
  uniqueSuffix,
} from "./e2e-helpers"

Given(
  "there is an organization with a signed-in admin and registered members",
  async ({ page, invitationWorld }) => {
    // 1. Superuser creates organization
    await apiSignInAsSuperuser(page, "setup employees scenario")
    const suffix = uniqueSuffix()
    const orgName = `E2E Emp Org ${suffix}`
    const orgSlug = `e2e-emp-org-${suffix}`

    const orgRes = await page.request.post(`${apiOrigin()}/organizations/`, {
      data: { name: orgName, slug: orgSlug },
    })
    expect(orgRes.ok(), await orgRes.text()).toBeTruthy()
    const orgBody = (await orgRes.json()) as { id: string; name: string }
    invitationWorld.organizationId = orgBody.id

    // 2. Create Admin user invite & redeem
    const adminEmail = `e2e-emp-admin-${suffix}@example.com`
    const adminPass = `AdminSecure123!${suffix}`
    const adminInviteRes = await page.request.post(`${apiOrigin()}/invites/organization`, {
      data: { organization_id: orgBody.id, role: "admin", email: adminEmail, max_uses: 1, expires_in_hours: 24 },
    })
    expect(adminInviteRes.ok(), await adminInviteRes.text()).toBeTruthy()
    const adminInvite = (await adminInviteRes.json()) as { token: string }

    await page.context().clearCookies()
    const redeemAdmin = await page.request.post(`${apiOrigin()}/invites/${encodeURIComponent(adminInvite.token)}/redeem`, {
      data: { email: adminEmail, password: adminPass },
      maxRedirects: 0,
    })
    expect(redeemAdmin.status()).toBe(303)

    // 3. Now signed in as Org Admin, create Department
    const deptName = `Ingeniería ${suffix}`
    const deptRes = await page.request.post(`${apiOrigin()}/organizations/${orgBody.id}/departments`, {
      data: { name: deptName },
    })
    expect(deptRes.ok(), await deptRes.text()).toBeTruthy()
    const deptBody = (await deptRes.json()) as { id: string; name: string }
    invitationWorld.organizationSlug = deptBody.id
    invitationWorld.memberFirstName = deptName

    // 4. Create Member 1 (as Org Admin)
    const empEmail1 = `emp1-${suffix}@example.com`
    const empPass1 = `Emp1Secure123!${suffix}`
    const invite1Res = await page.request.post(`${apiOrigin()}/invites/organization`, {
      data: { organization_id: orgBody.id, role: "member", email: empEmail1, max_uses: 1, expires_in_hours: 24 },
    })
    expect(invite1Res.ok(), await invite1Res.text()).toBeTruthy()
    const invite1 = (await invite1Res.json()) as { token: string }

    // Redeem Member 1 in an isolated request context to keep Admin session on page context
    const reqContext1 = await request.newContext()
    const redeem1 = await reqContext1.post(`${apiOrigin()}/invites/${encodeURIComponent(invite1.token)}/redeem`, {
      data: { email: empEmail1, password: empPass1 },
      maxRedirects: 0,
    })
    expect(redeem1.status()).toBe(303)
    await reqContext1.dispose()

    // 5. Create Member 2 (as Org Admin)
    const empEmail2 = `emp2-${suffix}@example.com`
    const empPass2 = `Emp2Secure123!${suffix}`
    const invite2Res = await page.request.post(`${apiOrigin()}/invites/organization`, {
      data: { organization_id: orgBody.id, role: "member", email: empEmail2, max_uses: 1, expires_in_hours: 24 },
    })
    expect(invite2Res.ok(), await invite2Res.text()).toBeTruthy()
    const invite2 = (await invite2Res.json()) as { token: string }

    const reqContext2 = await request.newContext()
    const redeem2 = await reqContext2.post(`${apiOrigin()}/invites/${encodeURIComponent(invite2.token)}/redeem`, {
      data: { email: empEmail2, password: empPass2 },
      maxRedirects: 0,
    })
    expect(redeem2.status()).toBe(303)
    await reqContext2.dispose()

    invitationWorld.invitedEmail = empEmail1
    invitationWorld.memberLastName = empEmail2
  },
)

When("the org admin navigates to the employees page", async ({ page }) => {
  await page.goto(`${dashboardOrigin()}/employees`)
  await page.waitForURL((url) => url.origin === dashboardOrigin() && url.pathname === "/employees")
})

Then("the employee table displays the registered members and summary KPIs", async ({ page, invitationWorld }) => {
  const email1 = invitationWorld.invitedEmail!
  const email2 = invitationWorld.memberLastName!

  await expect(page.getByRole("heading", { name: "Employees" }).first()).toBeVisible()
  await expect(page.getByText(/total employees/i).first()).toBeVisible()

  await expect(page.locator("tbody").getByText(email1)).toBeVisible({ timeout: 10000 })
  await expect(page.locator("tbody").getByText(email2)).toBeVisible({ timeout: 10000 })
})

When("the org admin filters employees by email search", async ({ page, invitationWorld }) => {
  await page.goto(`${dashboardOrigin()}/employees`)
  await page.waitForURL((url) => url.pathname === "/employees")

  const email1 = invitationWorld.invitedEmail!
  await page.getByPlaceholder(/filter by email or area/i).fill(email1)
})

Then("only the matching employee is displayed in the table", async ({ page, invitationWorld }) => {
  const email1 = invitationWorld.invitedEmail!
  const email2 = invitationWorld.memberLastName!

  await expect(page.locator("tbody").getByText(email1)).toBeVisible({ timeout: 10000 })
  await expect(page.locator("tbody").getByText(email2)).toBeHidden({ timeout: 10000 })
})

Given("there is an unassigned member in the organization", async ({ page, invitationWorld }) => {
  await page.goto(`${dashboardOrigin()}/employees`)
  await page.waitForURL((url) => url.pathname === "/employees")

  const email1 = invitationWorld.invitedEmail!
  await expect(page.locator("tbody").getByText(email1)).toBeVisible({ timeout: 10000 })
})

When("the org admin assigns the member to a department", async ({ page, invitationWorld }) => {
  const email1 = invitationWorld.invitedEmail!
  const deptName = invitationWorld.memberFirstName!

  await page.getByPlaceholder(/filter by email or area/i).fill(email1)
  const cell = page.locator("tbody").getByText(email1).first()
  await cell.click()

  await page.waitForURL((url) => url.pathname.startsWith("/employees/"))
  await expect(page.getByRole("heading", { name: /employee details/i })).toBeVisible()

  await page.getByRole("button", { name: /assign department|change department/i }).click()
  await expect(page.getByRole("heading", { name: /department/i })).toBeVisible()

  await page.getByRole("combobox", { name: /department/i }).click()
  await page.getByRole("option", { name: deptName }).click()

  const assignPromise = page.waitForResponse(
    (res) => res.url().includes("/department") && res.request().method() === "PATCH",
  )
  await page.getByRole("button", { name: /^assign department$/i }).click()
  const assignRes = await assignPromise
  expect(assignRes.ok()).toBeTruthy()
})

Then("the member detail page displays the updated department assignment", async ({ page, invitationWorld }) => {
  const deptName = invitationWorld.memberFirstName!
  await expect(page.getByText(deptName).first()).toBeVisible({ timeout: 10000 })
})
