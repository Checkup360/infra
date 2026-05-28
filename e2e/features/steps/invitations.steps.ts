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
  webOrigin,
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

async function createInvitedUserAsMember({
  page,
  invitationWorld: world,
}: {
  page: Page
  invitationWorld: InvitationWorld
}): Promise<void> {
  const { organizationId } = requireOrganizationState(world)
  const suffix = uniqueSuffix()
  const email = `e2e-setup-org-member-${suffix}@example.com`
  const password = `SuperSecure123!${suffix}`

  const memberInvite = await page.request.post(`${apiOrigin()}/invites/organization`, {
    data: {
      organization_id: organizationId,
      role: "member",
      email,
      max_uses: 1,
      expires_in_hours: 24,
    },
  })
  expect(memberInvite.ok(), await memberInvite.text()).toBeTruthy()
  const memberBody = (await memberInvite.json()) as { token: string }

  const adminInvite = await page.request.post(`${apiOrigin()}/invites/organization`, {
    data: {
      organization_id: organizationId,
      role: "admin",
      email,
      max_uses: 1,
      expires_in_hours: 24,
    },
  })
  expect(adminInvite.ok(), await adminInvite.text()).toBeTruthy()
  const adminBody = (await adminInvite.json()) as { token: string; invite_url: string }

  await page.context().clearCookies()
  const redeem = await page.request.post(
    `${apiOrigin()}/invites/${encodeURIComponent(memberBody.token)}/redeem`,
    {
      data: { email, password },
      maxRedirects: 0,
    },
  )
  expect(redeem.status(), await redeem.text()).toBe(303)

  world.invitedEmail = email
  world.invitedPassword = password
  world.inviteToken = adminBody.token
  world.inviteUrl = adminBody.invite_url
  world.expectedRole = "admin"
}

async function createAdminInviteForInvitedUser({
  page,
  invitationWorld: world,
}: {
  page: Page
  invitationWorld: InvitationWorld
}): Promise<void> {
  if (world.inviteToken) return

  const { invitedEmail } = requireRecipientState(world)
  const { organizationId } = requireOrganizationState(world)

  const res = await page.request.post(`${apiOrigin()}/invites/organization`, {
    data: {
      organization_id: organizationId,
      role: "admin",
      email: invitedEmail,
      max_uses: 1,
      expires_in_hours: 24,
    },
  })
  expect(res.ok(), await res.text()).toBeTruthy()

  const body = (await res.json()) as { token: string; invite_url: string }
  world.inviteToken = body.token
  world.inviteUrl = body.invite_url
  world.expectedRole = "admin"
}

async function createMemberInviteForInvitedUser({
  page,
  invitationWorld: world,
}: {
  page: Page
  invitationWorld: InvitationWorld
}): Promise<void> {
  if (world.inviteToken) return

  const { invitedEmail } = requireRecipientState(world)
  const { organizationId } = requireOrganizationState(world)

  const res = await page.request.post(`${apiOrigin()}/invites/organization`, {
    data: {
      organization_id: organizationId,
      role: "member",
      email: invitedEmail,
      max_uses: 1,
      expires_in_hours: 24,
    },
  })
  expect(res.ok(), await res.text()).toBeTruthy()

  const body = (await res.json()) as { token: string; invite_url: string }
  world.inviteToken = body.token
  world.inviteUrl = body.invite_url
  world.expectedRole = "member"
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
  const { organizationId } = requireOrganizationState(world)
  const { invitedEmail } = requireRecipientState(world)

  const res = await page.request.post(`${apiOrigin()}/invites/organization`, {
    data: {
      organization_id: organizationId,
      role,
      email: invitedEmail,
      max_uses: 1,
      expires_in_hours: 24,
    },
  })
  expect(res.ok(), await res.text()).toBeTruthy()

  const body = (await res.json()) as { invite_url: string }
  storeInviteUrl(world, body.invite_url)
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
  expect(body.membership).toMatchObject({
    organization_id: organizationId,
    roles: expect.arrayContaining([role]),
  })
}

Given(
  "the administrator is signed in to the backoffice invitations page",
  async ({ page }) => {
    await page.goto(`${backofficeOrigin()}/invitations`)
    await page.waitForURL((url) => url.pathname === "/login")
    await signInAsSuperuser(page, "invitation scenarios")
    await page.waitForURL(
      (url) => url.origin === backofficeOrigin(),
    )
    if (new URL(page.url()).pathname !== "/invitations") {
      await page.goto(`${backofficeOrigin()}/invitations`)
    }
    await expect(page.getByText("Choose invitation type")).toBeVisible()
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

    await page.context().clearCookies()
    const redeem = await page.request.post(
      `${apiOrigin()}/invites/${encodeURIComponent(inviteBody.token)}/redeem`,
      {
        data: { email, password },
        maxRedirects: 0,
      },
    )
    expect(redeem.status(), await redeem.text()).toBe(303)

    invitationWorld.invitedEmail = email
    invitationWorld.invitedPassword = password
    invitationWorld.inviteToken = undefined
    invitationWorld.inviteUrl = undefined
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

    await page.context().clearCookies()

    const redeem = await page.request.post(
      `${apiOrigin()}/invites/${encodeURIComponent(inviteToken)}/redeem`,
      {
        data: { email: invitedEmail, password: invitedPassword },
        maxRedirects: 0,
      },
    )
    expect(redeem.status(), await redeem.text()).toBe(303)
  },
)

When(
  "the invited user tries to register with a different email",
  async ({ page, invitationWorld }) => {
    await page.context().clearCookies()
    const { invitedPassword } = requireRecipientState(invitationWorld)
    const { inviteUrl } = requireInviteState(invitationWorld)
    const differentEmail = `e2e-mismatch-${uniqueSuffix()}@example.com`

    await page.goto(inviteUrl)
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    await page.getByLabel("Email").fill(differentEmail)
    await page.getByLabel("Password").fill(invitedPassword)
    await page.getByText("Continue", { exact: true }).click()
  },
)

Given("there is a signed-in organization member for the invitation", createInvitedUserAsMember)

Given(
  "they receive an admin invitation for the organization",
  createAdminInviteForInvitedUser,
)

Given(
  "they receive a member invitation for the organization",
  createMemberInviteForInvitedUser,
)

When(
  "an admin invitation is created for the invited user",
  createAdminInviteForInvitedUser,
)

When(
  "the invited user accepts the invitation",
  async ({ page, invitationWorld }) => {
    const { inviteUrl } = requireInviteState(invitationWorld)

    await page.goto(inviteUrl)
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    await page.getByRole("button", { name: /accept invitation/i }).click()

    await page.waitForURL(
      (url) => url.origin === dashboardOrigin() || url.origin === webOrigin(),
      { timeout: 10000 },
    )
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
  await expect(page.getByText(/email does not match the invitation/i)).toBeVisible()
})

Then("the invited user has both member and admin roles", async ({ page, invitationWorld }) => {
  const { invitedEmail } = requireRecipientState(invitationWorld)
  const { organizationId } = requireOrganizationState(invitationWorld)

  const body = await expectCurrentUser(page)
  expect(body.email).toBe(invitedEmail)
  expect(body.is_sysadmin).toBe(false)
  expect(body.membership).toMatchObject({
    organization_id: organizationId,
    roles: expect.arrayContaining(["member", "admin"]),
  })
})
