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
  "there is an organization with a signed-in admin and registered members",
  async ({ page, invitationWorld }) => {
    // 1. Create Organization
    const org = await createTestOrganization(page, "Emp Org")
    invitationWorld.organizationId = org.id

    const suffix = uniqueSuffix()
    const adminEmail = `e2e-emp-admin-${suffix}@example.com`
    const adminPass = `AdminSecure123!${suffix}`

    // 2. Create and redeem Admin user
    await createAndRedeemOrgInvite(page, {
      organizationId: org.id,
      role: "admin",
      email: adminEmail,
      password: adminPass,
    })

    // 3. Create Department
    const deptName = `Ingeniería ${suffix}`
    const deptRes = await page.request.post(`${apiOrigin()}/organizations/${org.id}/departments`, {
      data: { name: deptName },
    })
    expect(deptRes.ok(), await deptRes.text()).toBeTruthy()
    const deptBody = (await deptRes.json()) as { id: string; name: string }
    invitationWorld.organizationSlug = deptBody.id
    invitationWorld.memberFirstName = deptName

    // 4. Create & redeem Member 1 (in isolated session)
    const empEmail1 = `emp1-${suffix}@example.com`
    const empPass1 = `Emp1Secure123!${suffix}`
    await createAndRedeemOrgInvite(
      page,
      { organizationId: org.id, role: "member", email: empEmail1, password: empPass1 },
      true,
    )

    // 5. Create & redeem Member 2 (in isolated session)
    const empEmail2 = `emp2-${suffix}@example.com`
    const empPass2 = `Emp2Secure123!${suffix}`
    await createAndRedeemOrgInvite(
      page,
      { organizationId: org.id, role: "member", email: empEmail2, password: empPass2 },
      true,
    )

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

  await expect(page.getByRole("heading", { name: /members|employees/i }).first()).toBeVisible()
  await expect(page.getByText(/total members|total employees/i).first()).toBeVisible()

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
  const assignDeptButton = page.getByRole("button", { name: /assign department|change department/i })
  await expect(assignDeptButton).toBeVisible({ timeout: 15000 })
  await assignDeptButton.click()
  await expect(page.getByRole("heading", { name: /department/i })).toBeVisible({ timeout: 10000 })

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

When("a member without admin role navigates to the dashboard", async ({ page, invitationWorld }) => {
  const suffix = uniqueSuffix()
  const memberEmail = `e2e-unauthorized-${suffix}@example.com`
  const memberPass = `MemberPass123!${suffix}`
  await createAndRedeemOrgInvite(page, {
    organizationId: invitationWorld.organizationId!,
    role: "member",
    email: memberEmail,
    password: memberPass,
  })
  await page.goto(`${dashboardOrigin()}/`)
})

Then("they see the access denied page with a 403 error", async ({ page }) => {
  await page.waitForURL((url) => url.origin === dashboardOrigin() && url.pathname === "/access-denied")
  await expect(page.getByRole("heading", { name: /access denied/i }).first()).toBeVisible({ timeout: 10000 })
  await expect(page.getByText("403").first()).toBeVisible()
  await expect(page.getByText(/only organization admins can access the dashboard/i).first()).toBeVisible()
})
