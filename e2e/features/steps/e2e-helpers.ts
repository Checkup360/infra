import { expect, type Page } from "@playwright/test"

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

export function portalOrigins(): string[] {
  return [webOrigin(), dashboardOrigin(), backofficeOrigin()]
}

export function superuserEmail(context = "E2E scenarios"): string {
  const v = process.env.SUPERUSER_EMAIL
  if (!v) throw new Error(`SUPERUSER_EMAIL is required for ${context}`)
  return v
}

export function superuserPassword(context = "E2E scenarios"): string {
  const v = process.env.SUPERUSER_PASSWORD
  if (!v) throw new Error(`SUPERUSER_PASSWORD is required for ${context}`)
  return v
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

export function uniqueSuffix(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export async function expectCurrentUser(page: Page): Promise<any> {
  const me = await page.request.get(`${apiOrigin()}/auth/me`)
  expect(me.ok(), await me.text()).toBeTruthy()
  return await me.json()
}
