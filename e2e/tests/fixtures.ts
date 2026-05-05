import { test as base, expect } from "@playwright/test"

export const env = {
  apiOrigin: process.env.PUBLIC_API_ORIGIN ?? "http://localhost:8000",
  webOrigin: process.env.PUBLIC_WEB_ORIGIN ?? "http://localhost:5173",
  dashboardOrigin:
    process.env.PUBLIC_DASHBOARD_ORIGIN ?? "http://localhost:5174",
  backofficeOrigin:
    process.env.PUBLIC_BACKOFFICE_ORIGIN ?? "http://localhost:5175",
  superuser: {
    email: process.env.SUPERUSER_EMAIL ?? "e2e-admin@example.com",
    password: process.env.SUPERUSER_PASSWORD ?? "E2E-Admin-123!",
  },
}

export const test = base.extend<{}>({
  page: async ({ page, context }, use) => {
    await use(page)
    void context
  },
})

export { expect }

export async function loginAsSuperuser(
  request: import("@playwright/test").APIRequestContext,
): Promise<void> {
  const res = await request.post(`${env.apiOrigin}/auth/login`, {
    form: {
      username: env.superuser.email,
      password: env.superuser.password,
    },
    failOnStatusCode: false,
  })
  if (![200, 204, 303].includes(res.status())) {
    throw new Error(
      `login failed: status=${res.status()} body=${await res.text()}`,
    )
  }
}
