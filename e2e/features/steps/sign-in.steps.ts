import { expect } from "@playwright/test"
import { Given, When, Then } from "./fixtures"

function webOrigin(): string {
  return process.env.PUBLIC_WEB_ORIGIN ?? "http://localhost:5173"
}

function apiOrigin(): string {
  return process.env.PUBLIC_API_ORIGIN ?? "http://localhost:8000"
}

function dashboardOrigin(): string {
  return process.env.PUBLIC_DASHBOARD_ORIGIN ?? "http://localhost:5174"
}

function backofficeOrigin(): string {
  return process.env.PUBLIC_BACKOFFICE_ORIGIN ?? "http://localhost:5175"
}

function superuserEmail(): string {
  const v = process.env.SUPERUSER_EMAIL
  if (!v) throw new Error("SUPERUSER_EMAIL is required for sign-in scenarios")
  return v
}

function superuserPassword(): string {
  const v = process.env.SUPERUSER_PASSWORD
  if (!v) throw new Error("SUPERUSER_PASSWORD is required for sign-in scenarios")
  return v
}

Given("the administrator has valid credentials from the environment", async () => {
  superuserEmail()
  superuserPassword()
})

Given("the administrator opens the sign-in page", async ({ page }) => {
  await page.goto(`${webOrigin()}/login`)
})

Given("the administrator opens the backoffice page", async ({ page }) => {
  await page.goto(`${backofficeOrigin()}/`)
})

When("they are redirected to login", async ({ page }) => {
  await page.waitForURL((url) => url.pathname === "/login")
})

Then("they see the backoffice page", async ({ page }) => {
  await page.waitForURL((url) => url.origin === backofficeOrigin())
  await expect(page.getByText("Backoffice")).toBeVisible()
})

When("they submit their email and password", async ({ page }) => {
  await page.getByLabel("Email").fill(superuserEmail())
  await page.getByLabel("Password").fill(superuserPassword())
  await page.getByRole("button", { name: /sign in/i }).click()
})

When("they submit their email and a wrong password", async ({ page }) => {
  await page.getByLabel("Email").fill(superuserEmail())
  await page.getByLabel("Password").fill("definitely-wrong-password")
  await page.getByRole("button", { name: /sign in/i }).click()
})

Then("they are signed in with full administrator access", async ({ page }) => {
  await page.waitForURL((url) => url.pathname === "/" || url.pathname === "/login/complete")

  const me = await page.request.get(`${apiOrigin()}/auth/me`)
  expect(me.ok()).toBeTruthy()
  const body = await me.json()
  expect(body.email).toBe(superuserEmail())
  expect(body.is_sysadmin).toBe(true)
})

Then("they see an authentication error", async ({ page }) => {
  await expect(page.getByText(/incorrect|inválid|credencial|error/i)).toBeVisible({
    timeout: 5_000,
  })
})
