import type { FullConfig } from "@playwright/test"
import { request } from "@playwright/test"

const PUBLIC_API_ORIGIN = process.env.PUBLIC_API_ORIGIN ?? "http://localhost:8000"
const SUPERUSER_EMAIL = process.env.SUPERUSER_EMAIL ?? "e2e-admin@example.com"
const SUPERUSER_PASSWORD = process.env.SUPERUSER_PASSWORD ?? "E2E-Admin-123!"

export default async function globalTeardown(_config: FullConfig): Promise<void> {
  const requestContext = await request.newContext()

  try {
    // 1. Authenticate as superuser
    const formData = new URLSearchParams()
    formData.append("username", SUPERUSER_EMAIL)
    formData.append("password", SUPERUSER_PASSWORD)

    const loginRes = await requestContext.post(`${PUBLIC_API_ORIGIN}/auth/login`, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      data: formData.toString(),
      maxRedirects: 0,
    })

    if (!loginRes.ok() && loginRes.status() !== 303) {
      console.warn("Teardown: Failed to login as superuser. Skipping cleanup.")
      return
    }

    // 2. Fetch all organizations
    const orgsRes = await requestContext.get(`${PUBLIC_API_ORIGIN}/organizations`)
    if (!orgsRes.ok()) {
      console.warn("Teardown: Failed to fetch organizations. Skipping cleanup.")
      return
    }

    const orgs = await orgsRes.json()

    // 3. Filter garbage E2E organizations
    const e2eOrgs = orgs.filter((org: any) => /\d{13}-[a-z0-9]+$/i.test(org.name))

    if (e2eOrgs.length > 0) {
      console.log(`Teardown: Found ${e2eOrgs.length} E2E organizations to clean up.`)

      // 4. Delete each E2E organization sequentially to avoid rate limits or DB locks
      for (const org of e2eOrgs) {
        const delRes = await requestContext.delete(`${PUBLIC_API_ORIGIN}/organizations/${org.id}`)
        if (!delRes.ok()) {
          console.warn(`Teardown: Failed to delete org ${org.name} (${org.id})`)
        } else {
          console.log(`Teardown: Deleted org ${org.name}`)
        }
      }
    } else {
      console.log("Teardown: No E2E organizations found for cleanup.")
    }

    // 5. Cleanup Sysadmin Invitations
    const sysInvitesRes = await requestContext.get(`${PUBLIC_API_ORIGIN}/invitations/sysadmin`)
    if (sysInvitesRes.ok()) {
      const invites = await sysInvitesRes.json()
      // Usually E2E test invites have e2e or test in email, or they are just left over
      const e2eInvites = invites.filter((inv: any) => 
        inv.email?.toLowerCase().includes("e2e") || 
        inv.email?.toLowerCase().includes("test")
      )
      
      for (const inv of e2eInvites) {
         await requestContext.delete(`${PUBLIC_API_ORIGIN}/invitations/sysadmin`, {
           data: { invite_ids: [inv.id] }
         })
      }
    }

  } catch (err) {
    console.error("Teardown script encountered an error:", err)
  } finally {
    await requestContext.dispose()
  }
}
