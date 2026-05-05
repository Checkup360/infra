import { expect } from "@playwright/test"
import { When, Then } from "./fixtures"

function apiOrigin(): string {
  return process.env.PUBLIC_API_ORIGIN ?? "http://localhost:8000"
}

function portalOrigins(): string[] {
  return [
    process.env.PUBLIC_WEB_ORIGIN ?? "http://localhost:5173",
    process.env.PUBLIC_DASHBOARD_ORIGIN ?? "http://localhost:5174",
    process.env.PUBLIC_BACKOFFICE_ORIGIN ?? "http://localhost:5175",
  ]
}

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
