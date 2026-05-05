import type { FullConfig } from "@playwright/test"

const PUBLIC_API_ORIGIN = process.env.PUBLIC_API_ORIGIN ?? "http://localhost:8000"

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

export default async function globalSetup(_config: FullConfig): Promise<void> {
  await waitForBackend()
}
