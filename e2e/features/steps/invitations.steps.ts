import { expect, type Page } from "@playwright/test"
import {
  Given,
  When,
  Then,
  Step,
  type InvitationRole,
  type InvitationWorld,
} from "./fixtures"
import {
  apiOrigin,
  backofficeOrigin,
  dashboardOrigin,
  expectCurrentUser,
  signInAsSuperuser,
  uniqueSuffix,
} from "./e2e-helpers"

type OrganizationRole = "admin" | "member"

type RequiredOrganizationState = {
  organizationId: string
  organizationSlug: string
}

type RequiredRecipientState = {
  invitedEmail: string
  invitedPassword: string
}

type RequiredInviteState = {
  inviteToken: string
  inviteUrl: string
}

function requireWorldValue<T>(
  value: T | undefined,
  name: keyof InvitationWorld,
): T {
  if (value === undefined) {
    throw new Error(`Invitation world is missing ${String(name)}`)
  }
  return value
}

function toOrganizationRole(role: string): OrganizationRole {
  if (role === "admin" || role === "member") return role
  throw new Error(`Unsupported role: "${role}", expected "admin" | "member"`)
}

function prepareOrganizationRecipient(
  world: InvitationWorld,
  role: string,
): void {
  prepareRecipient(world, toOrganizationRole(role))
}

function requireOrganizationState(
  world: InvitationWorld,
): RequiredOrganizationState {
  return {
    organizationId: requireWorldValue(world.organizationId, "organizationId"),
    organizationSlug: requireWorldValue(world.organizationSlug, "organizationSlug"),
  }
}

function requireRecipientState(world: InvitationWorld): RequiredRecipientState {
  return {
    invitedEmail: requireWorldValue(world.invitedEmail, "invitedEmail"),
    invitedPassword: requireWorldValue(world.invitedPassword, "invitedPassword"),
  }
}

function requireInviteState(world: InvitationWorld): RequiredInviteState {
  return {
    inviteToken: requireWorldValue(world.inviteToken, "inviteToken"),
    inviteUrl: requireWorldValue(world.inviteUrl, "inviteUrl"),
  }
}

function prepareRecipient(
  world: InvitationWorld,
  expectedRole: InvitationRole,
): void {
  const suffix = uniqueSuffix()
  world.invitedEmail = `e2e-${expectedRole}-${suffix}@example.com`
  world.invitedPassword = `SuperSecure123!${suffix}`
  world.inviteToken = undefined
  world.inviteUrl = undefined
  world.expectedRole = expectedRole
}

function tokenFromInviteUrl(inviteUrl: string): string {
  const url = new URL(inviteUrl)
  const token = url.pathname.split("/").filter(Boolean).at(-1)
  if (!token) {
    throw new Error(`Could not read token from invitation URL: ${inviteUrl}`)
  }
  return token
}

async function createInvitationFromCurrentPage(page: Page): Promise<string> {
  await page.getByRole("button", { name: /generate link/i }).click()
  await expect(page.getByText("Invitation created")).toBeVisible()
  const inviteUrl = await page.locator("input[readonly]").first().inputValue()
  expect(inviteUrl).toMatch(/\/invite\/[^/]+$/)
  return inviteUrl
}

function storeInviteUrl(world: InvitationWorld, inviteUrl: string): void {
  world.inviteUrl = inviteUrl
  world.inviteToken = tokenFromInviteUrl(inviteUrl)
}

async function selectSysadminInvitationType(page: Page): Promise<void> {
  await page.getByText("Sysadmin registration", { exact: true }).click()
  await page.getByRole("button", { name: /continue/i }).click()
}

async function selectOrganizationInvitationType(page: Page): Promise<void> {
  await page.getByText("Organization registration", { exact: true }).click()
  await page.getByRole("button", { name: /continue/i }).click()
}

async function fillOrganizationInviteForm(
  page: Page,
  world: InvitationWorld,
  role: OrganizationRole,
): Promise<void> {
  const { invitedEmail } = requireRecipientState(world)

  await page.getByLabel("Role").click()
  await page
    .getByRole("option", { name: role === "admin" ? "Admin" : "Member" })
    .click()
  await page.getByLabel(/email/i).fill(invitedEmail)
}

async function createBackofficeOrganizationInvitation(
  page: Page,
  world: InvitationWorld,
  role: OrganizationRole,
): Promise<void> {
  const { organizationSlug } = requireOrganizationState(world)

  await selectOrganizationInvitationType(page)
  await page.getByPlaceholder("Search organization...").fill(organizationSlug)
  await page.getByRole("button", { name: new RegExp(organizationSlug) }).click()
  await fillOrganizationInviteForm(page, world, role)
  storeInviteUrl(world, await createInvitationFromCurrentPage(page))
}

async function createDashboardOrganizationInvitation(
  page: Page,
  world: InvitationWorld,
  role: OrganizationRole,
): Promise<void> {
  await page.goto(`${dashboardOrigin()}/people/invite`)
  await expect(page.getByRole("heading", { name: "Invite people", level: 1 })).toBeVisible()
  await fillOrganizationInviteForm(page, world, role)
  storeInviteUrl(world, await createInvitationFromCurrentPage(page))
}

async function assertSignedInWithOrganizationRole(
  page: Page,
  world: InvitationWorld,
  role: OrganizationRole,
): Promise<void> {
  const { invitedEmail } = requireRecipientState(world)
  const { organizationId } = requireOrganizationState(world)

  const body = await expectCurrentUser(page)
  expect(body.email).toBe(invitedEmail)
  expect(body.is_sysadmin).toBe(false)
  expect(body.memberships).toContainEqual(
    expect.objectContaining({ organization_id: organizationId, role }),
  )
}

Given(
  "the administrator is signed in to the backoffice invitations page",
  async ({ page }) => {
    await page.goto(`${backofficeOrigin()}/invitations`)
    await page.waitForURL((url) => url.pathname === "/login")
    await signInAsSuperuser(page, "invitation scenarios")
    await page.waitForURL(
      (url) => url.origin === backofficeOrigin() && url.pathname === "/invitations",
    )
    await expect(page.getByRole("heading", { name: "Invitations", level: 1 })).toBeVisible()
  },
)

Given(
  "there is an organization for invitations",
  async ({ page, invitationWorld }) => {
    const suffix = uniqueSuffix()
    const name = `E2E Invitations ${suffix}`
    const slug = `e2e-invitations-${suffix}`

    const res = await page.request.post(`${apiOrigin()}/organizations/`, {
      data: { name, slug },
    })
    expect(res.ok(), await res.text()).toBeTruthy()

    const body = (await res.json()) as { id: string; name: string; slug: string }
    invitationWorld.organizationId = body.id
    invitationWorld.organizationName = body.name
    invitationWorld.organizationSlug = body.slug
  },
)

Given(
  "the administrator prepares a new sysadmin invitation recipient",
  async ({ invitationWorld }) => {
    prepareRecipient(invitationWorld, "sysadmin")
  },
)

Given(
  "there is a signed-in organization admin for invitations",
  async ({ page, invitationWorld }) => {
    const { organizationId } = requireOrganizationState(invitationWorld)
    const suffix = uniqueSuffix()
    const email = `e2e-setup-org-admin-${suffix}@example.com`
    const password = `SuperSecure123!${suffix}`

    const invite = await page.request.post(`${apiOrigin()}/invites/organization`, {
      data: {
        organization_id: organizationId,
        role: "admin",
        email,
        max_uses: 1,
        expires_in_hours: 24,
      },
    })
    expect(invite.ok(), await invite.text()).toBeTruthy()
    const inviteBody = (await invite.json()) as { token: string }

    const register = await page.request.post(
      `${apiOrigin()}/invites/${encodeURIComponent(inviteBody.token)}/register`,
      {
        data: { email, password },
        maxRedirects: 0,
      },
    )
    expect(register.status(), await register.text()).toBe(303)
  },
)

Step(
  /^(?:the administrator|they) prepare(?:s)? a new organization (\w+) invitation recipient$/,
  async ({ invitationWorld }, role: string) => {
    prepareOrganizationRecipient(invitationWorld, role)
  },
)

When(
  /^they create (?:a |an )?(sysadmin|organization)(?: (\w+))? invitation from the (backoffice|dashboard)$/,
  async ({ page, invitationWorld }, invitationType: string, role: string | undefined, location: string) => {
    if (invitationType === "sysadmin") {
      prepareRecipient(invitationWorld, "sysadmin")
      await selectSysadminInvitationType(page)
      await page.getByLabel(/email address/i).fill(invitationWorld.invitedEmail!)
      storeInviteUrl(invitationWorld, await createInvitationFromCurrentPage(page))
    } else if (invitationType === "organization" && role) {
      prepareOrganizationRecipient(invitationWorld, role)
      if (location === "backoffice") {
        await createBackofficeOrganizationInvitation(
          page,
          invitationWorld,
          toOrganizationRole(role),
        )
      } else if (location === "dashboard") {
        await createDashboardOrganizationInvitation(
          page,
          invitationWorld,
          toOrganizationRole(role),
        )
      }
    }
  },
)

When(
  "the organization admin opens the dashboard invitations page",
  async ({ page }) => {
    await page.goto(`${dashboardOrigin()}/people/invite`)
    await expect(page.getByRole("heading", { name: "Invite people", level: 1 })).toBeVisible()
  },
)

When(
  "the invited user registers with the invitation",
  async ({ page, invitationWorld }) => {
    const { invitedEmail, invitedPassword } =
      requireRecipientState(invitationWorld)
    const { inviteToken } = requireInviteState(invitationWorld)

    const register = await page.request.post(
      `${apiOrigin()}/invites/${encodeURIComponent(inviteToken)}/register`,
      {
        data: { email: invitedEmail, password: invitedPassword },
        maxRedirects: 0,
      },
    )
    expect(register.status(), await register.text()).toBe(303)
  },
)

When(
  "the invited user tries to register with a different email",
  async ({ page, invitationWorld }) => {
    const { invitedPassword } = requireRecipientState(invitationWorld)
    const { inviteUrl } = requireInviteState(invitationWorld)
    const differentEmail = `e2e-mismatch-${uniqueSuffix()}@example.com`

    await page.goto(inviteUrl)
    await expect(page.getByRole("heading", { name: "Create account", level: 1 })).toBeVisible()
    await page.getByLabel("Email").fill(differentEmail)
    await page.getByLabel("Password").fill(invitedPassword)
    await page.getByRole("button", { name: /create account/i }).click()
  },
)

Then(
  /^the invited user is signed in as (?:a |an )?(sysadmin|organization)(?: (\w+))?$/,
  async ({ page, invitationWorld }, userType: string, role: string | undefined) => {
    const { invitedEmail } = requireRecipientState(invitationWorld)
    const body = await expectCurrentUser(page)
    expect(body.email).toBe(invitedEmail)

    if (userType === "sysadmin") {
      expect(body.is_sysadmin).toBe(true)
    } else if (userType === "organization" && role) {
      await assertSignedInWithOrganizationRole(
        page,
        invitationWorld,
        toOrganizationRole(role),
      )
    }
  },
)

Then("registration is rejected", async ({ page }) => {
  await expect(page.getByText(/email does not match|invitation/i)).toBeVisible()
})
