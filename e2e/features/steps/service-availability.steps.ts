import { expect } from "@playwright/test"
import { When, Then } from "./fixtures"
import { apiOrigin, portalOrigins } from "./e2e-helpers"

When("the operator checks the core API heartbeat", async ({ request }) => {
  const res = await request.get(`${apiOrigin()}/`)
  expect(res.ok()).toBeTruthy()
})

Then("the heartbeat confirms the service is up", async ({ request }) => {
  const res = await request.get(`${apiOrigin()}/`)
  expect(await res.json()).toMatchObject({ ok: true })
})

When("the operator checks each web portal readiness page", async ({ request }) => {
  for (const origin of portalOrigins()) {
    const res = await request.get(`${origin}/healthz`)
    expect(res.ok(), `${origin}/healthz`).toBeTruthy()
  }
})

Then("every portal reports ready", async ({ request }) => {
  for (const origin of portalOrigins()) {
    const res = await request.get(`${origin}/healthz`)
    expect(res.ok(), `${origin}/healthz`).toBeTruthy()
  }
})
