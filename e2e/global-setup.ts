import type { FullConfig } from "@playwright/test"
import { execSync } from "node:child_process"
import path from "node:path"

const PUBLIC_API_ORIGIN = process.env.PUBLIC_API_ORIGIN ?? "http://localhost:8000"
const SUPERUSER_EMAIL = process.env.SUPERUSER_EMAIL ?? "e2e-admin@example.com"
const SUPERUSER_PASSWORD = process.env.SUPERUSER_PASSWORD ?? "E2E-Admin-123!"

async function waitForBackend(timeoutMs = 60_000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  let lastError: unknown = null

  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${PUBLIC_API_ORIGIN}/`)
      if (res.ok) return
      lastError = new Error(`backend responded with ${res.status}`)
    } catch (err) {
      lastError = err
    }
    await new Promise((r) => setTimeout(r, 1_000))
  }

  throw new Error(
    `Timed out waiting for backend at ${PUBLIC_API_ORIGIN}: ${String(lastError)}`,
  )
}

async function ensureSuperuserSeeded(): Promise<void> {
  try {
    const formData = new URLSearchParams()
    formData.append("username", SUPERUSER_EMAIL)
    formData.append("password", SUPERUSER_PASSWORD)

    const res = await fetch(`${PUBLIC_API_ORIGIN}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
      redirect: "manual",
    })

    if (res.ok || res.status === 303) {
      return
    }
  } catch {
    // If login check fails, proceed to seed
  }

  const backendDir = path.resolve(process.cwd(), "../../backend")
  const pythonBin = path.join(backendDir, ".venv/bin/python")

  try {
    execSync(
      `SUPERUSER_EMAIL="${SUPERUSER_EMAIL}" SUPERUSER_PASSWORD="${SUPERUSER_PASSWORD}" PYTHONPATH=. "${pythonBin}" scripts/seed_superuser.py`,
      { cwd: backendDir, stdio: "inherit" },
    )
  } catch (err) {
    console.warn("Could not seed superuser via python script:", err)
  }
}

export default async function globalSetup(_config: FullConfig): Promise<void> {
  await waitForBackend()
  await ensureSuperuserSeeded()
}
