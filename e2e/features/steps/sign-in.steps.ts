import { expect } from "@playwright/test"
import { Given, When, Then } from "./fixtures"
import {
  backofficeOrigin,
  expectCurrentUser,
  submitSignInForm,
  superuserEmail,
  superuserPassword,
  webOrigin,
} from "./e2e-helpers"

Given("the administrator has valid credentials from the environment", async () => {
  superuserEmail("sign-in scenarios")
  superuserPassword("sign-in scenarios")
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
  await submitSignInForm(
    page,
    superuserEmail("sign-in scenarios"),
    superuserPassword("sign-in scenarios"),
  )
})

When("they submit their email and a wrong password", async ({ page }) => {
  await submitSignInForm(
    page,
    superuserEmail("sign-in scenarios"),
    "definitely-wrong-password",
  )
})

Then("they are signed in with full administrator access", async ({ page }) => {
  await page.waitForURL((url) => url.pathname === "/" || url.pathname === "/login/complete")

  const body = await expectCurrentUser(page)
  expect(body.email).toBe(superuserEmail("sign-in scenarios"))
  expect(body.is_sysadmin).toBe(true)
})

Then("they see an authentication error", async ({ page }) => {
  await expect(page.getByText(/incorrect|inválid|credencial|error/i)).toBeVisible({
    timeout: 5_000,
  })
})
