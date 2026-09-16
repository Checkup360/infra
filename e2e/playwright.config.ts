import { defineConfig, devices } from "@playwright/test"
import { defineBddConfig } from "playwright-bdd"

const PUBLIC_WEB_ORIGIN = process.env.PUBLIC_WEB_ORIGIN ?? "http://localhost:5173"
const PUBLIC_DASHBOARD_ORIGIN =
  process.env.PUBLIC_DASHBOARD_ORIGIN ?? "http://localhost:5174"
const PUBLIC_BACKOFFICE_ORIGIN =
  process.env.PUBLIC_BACKOFFICE_ORIGIN ?? "http://localhost:5175"
const PUBLIC_API_ORIGIN = process.env.PUBLIC_API_ORIGIN ?? "http://localhost:8000"
const PUBLIC_CMS_ORIGIN = process.env.PUBLIC_CMS_ORIGIN ?? "http://localhost:3000"

const bddTestDir = defineBddConfig({
  features: "features/**/*.feature",
  steps: "features/steps/**/*.ts",
})

export default defineConfig({
  testDir: bddTestDir,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["html", { open: "never" }],
    ["list"],
    ...(process.env.CI ? [["github"] as const] : []),
  ],

  use: {
    baseURL: PUBLIC_WEB_ORIGIN,
    trace: "on-first-retry",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  globalSetup: "./global-setup.ts",

  metadata: {
    apiOrigin: PUBLIC_API_ORIGIN,
    webOrigin: PUBLIC_WEB_ORIGIN,
    dashboardOrigin: PUBLIC_DASHBOARD_ORIGIN,
    backofficeOrigin: PUBLIC_BACKOFFICE_ORIGIN,
    cmsOrigin: PUBLIC_CMS_ORIGIN,
  },
})
