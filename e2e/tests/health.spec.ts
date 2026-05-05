import { test, expect, env } from "./fixtures"

test.describe("smoke", () => {
  test("backend responds on /", async ({ request }) => {
    const res = await request.get(`${env.apiOrigin}/`)
    expect(res.ok()).toBeTruthy()
    expect(await res.json()).toMatchObject({ ok: true })
  })

  test("each frontend serves /healthz", async ({ request }) => {
    for (const origin of [env.webOrigin, env.dashboardOrigin, env.backofficeOrigin]) {
      const res = await request.get(`${origin}/healthz`)
      expect(res.ok(), `${origin}/healthz should be 200`).toBeTruthy()
    }
  })
})
