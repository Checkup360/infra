import { expect, request, type Page } from "@playwright/test"

export function webOrigin(): string {
  return process.env.PUBLIC_WEB_ORIGIN ?? "http://localhost:5173"
}

export function apiOrigin(): string {
  return process.env.PUBLIC_API_ORIGIN ?? "http://localhost:8000"
}

export function dashboardOrigin(): string {
  return process.env.PUBLIC_DASHBOARD_ORIGIN ?? "http://localhost:5174"
}

export function backofficeOrigin(): string {
  return process.env.PUBLIC_BACKOFFICE_ORIGIN ?? "http://localhost:5175"
}

export function cmsOrigin(): string {
  return process.env.PUBLIC_CMS_ORIGIN ?? "http://localhost:3000"
}

export function portalOrigins(): string[] {
  return [webOrigin(), dashboardOrigin(), backofficeOrigin()]
}

export function superuserEmail(_context = "E2E scenarios"): string {
  return process.env.SUPERUSER_EMAIL ?? "e2e-admin@example.com"
}

export function superuserPassword(_context = "E2E scenarios"): string {
  return process.env.SUPERUSER_PASSWORD ?? "E2E-Admin-123!"
}

export async function submitSignInForm(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password", { exact: true }).fill(password)
  await page.getByRole("button", { name: /sign in/i }).click()
}

export async function signInAsSuperuser(
  page: Page,
  context = "E2E scenarios",
): Promise<void> {
  await submitSignInForm(
    page,
    superuserEmail(context),
    superuserPassword(context),
  )
}

export async function apiSignInAsSuperuser(
  page: Page,
  context = "E2E scenarios",
): Promise<void> {
  const credentials = {
    username: superuserEmail(context),
    password: superuserPassword(context),
  }
  const res = await page.request.post(`${apiOrigin()}/auth/login`, {
    form: credentials,
    maxRedirects: 0,
  })
  expect(res.ok() || res.status() === 303, await res.text()).toBeTruthy()

  for (const origin of portalOrigins()) {
    try {
      await page.request.post(`${origin}/api/auth/login`, {
        form: credentials,
        maxRedirects: 0,
      })
    } catch {
      // Ignore if portal is unavailable
    }
  }
}

export function uniqueSuffix(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

// Fits entity names with tight backend limits (e.g. departments: 40 chars).
export function shortUniqueSuffix(): string {
  return Math.random().toString(36).slice(2, 8)
}

export async function expectCurrentUser(page: Page): Promise<any> {
  const me = await page.request.get(`${apiOrigin()}/auth/me`)
  expect(me.ok(), await me.text()).toBeTruthy()
  return await me.json()
}

export async function createTestOrganization(
  page: Page,
  prefix = "E2E Org",
): Promise<{ id: string; name: string; slug: string }> {
  await apiSignInAsSuperuser(page, "create test org")
  const suffix = uniqueSuffix()
  const name = `${prefix} ${suffix}`
  const slug = `e2e-${prefix.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${suffix}`

  const res = await page.request.post(`${apiOrigin()}/organizations/`, {
    data: { name, slug },
  })
  expect(res.ok(), await res.text()).toBeTruthy()
  return (await res.json()) as { id: string; name: string; slug: string }
}

export async function createAndRedeemOrgInvite(
  page: Page,
  {
    organizationId,
    role,
    email,
    password,
  }: {
    organizationId: string
    role: "admin" | "member" | "superadmin"
    email: string
    password: string
  },
  isolatedSession = false,
): Promise<{ token: string; inviteUrl: string }> {
  const inviteRes = await page.request.post(`${apiOrigin()}/invites/organization`, {
    data: {
      organization_id: organizationId,
      role,
      email,
      max_uses: 1,
      expires_in_hours: 24,
    },
  })
  expect(inviteRes.ok(), await inviteRes.text()).toBeTruthy()
  const body = (await inviteRes.json()) as { token: string; invite_url: string }

  if (isolatedSession) {
    const isolatedCtx = await request.newContext()
    const redeemRes = await isolatedCtx.post(
      `${apiOrigin()}/invites/${encodeURIComponent(body.token)}/redeem`,
      {
        data: { email, password },
        maxRedirects: 0,
      },
    )
    expect(redeemRes.status(), await redeemRes.text()).toBe(303)
    await isolatedCtx.dispose()
  } else {
    await page.context().clearCookies()
    const redeemRes = await page.request.post(
      `${apiOrigin()}/invites/${encodeURIComponent(body.token)}/redeem`,
      {
        data: { email, password },
        maxRedirects: 0,
      },
    )
    expect(redeemRes.status(), await redeemRes.text()).toBe(303)
  }

  return { token: body.token, inviteUrl: body.invite_url }
}
