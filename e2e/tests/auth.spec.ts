import { test, expect, env } from "./fixtures"

test.describe("auth", () => {
  test("seeded superuser can log in via the UI and is recognized by /auth/me", async ({
    page,
    request,
  }) => {
    await page.goto(`${env.webOrigin}/login`)

    await page.getByLabel("Email").fill(env.superuser.email)
    await page.getByLabel("Contraseña").fill(env.superuser.password)
    await page.getByRole("button", { name: /iniciar sesión/i }).click()

    // The login flow ends with a 303 to /login/complete which then redirects to /.
    await page.waitForURL((url) => url.pathname === "/" || url.pathname === "/login/complete")

    const me = await page.request.get(`${env.apiOrigin}/auth/me`)
    expect(me.ok()).toBeTruthy()
    const body = await me.json()
    expect(body.email).toBe(env.superuser.email)
    expect(body.is_sysadmin).toBe(true)

    void request
  })

  test("invalid credentials surface an error", async ({ page }) => {
    await page.goto(`${env.webOrigin}/login`)

    await page.getByLabel("Email").fill(env.superuser.email)
    await page.getByLabel("Contraseña").fill("definitely-wrong-password")
    await page.getByRole("button", { name: /iniciar sesión/i }).click()

    await expect(page.getByText(/incorrect|inválid|credencial|error/i)).toBeVisible({
      timeout: 5_000,
    })
  })
})
