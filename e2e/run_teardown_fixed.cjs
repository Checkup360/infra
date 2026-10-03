const { request } = require('@playwright/test');
const PUBLIC_API_ORIGIN = "http://localhost:8000";
const SUPERUSER_EMAIL = "e2e-admin@example.com";
const SUPERUSER_PASSWORD = "E2E-Admin-123!";

async function globalTeardown() {
  const requestContext = await request.newContext();
  try {
    const formData = new URLSearchParams();
    formData.append("username", SUPERUSER_EMAIL);
    formData.append("password", SUPERUSER_PASSWORD);
    
    const loginRes = await requestContext.post(`${PUBLIC_API_ORIGIN}/auth/login`, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      data: formData.toString(),
      maxRedirects: 0,
    });
    
    if (!loginRes.ok() && loginRes.status() !== 303) {
      console.warn("Failed to login", loginRes.status(), await loginRes.text());
      return;
    }
    
    const orgsRes = await requestContext.get(`${PUBLIC_API_ORIGIN}/organizations`);
    if (!orgsRes.ok()) {
      console.warn("Failed to fetch orgs:", orgsRes.status(), await orgsRes.text());
      return;
    }
    const orgs = await orgsRes.json();
    const e2eOrgs = orgs.filter((org) => /\d{13}-[a-z0-9]+$/i.test(org.name));
    
    console.log(`Found ${e2eOrgs.length} orgs to clean`);
    for (const org of e2eOrgs) {
      await requestContext.delete(`${PUBLIC_API_ORIGIN}/organizations/${org.id}`);
      console.log("Deleted", org.name);
    }

    const sysInvitesRes = await requestContext.get(`${PUBLIC_API_ORIGIN}/invitations/sysadmin`);
    if (sysInvitesRes.ok()) {
      const invites = await sysInvitesRes.json();
      const e2eInvites = invites.filter((inv) => 
        inv.email?.toLowerCase().includes("e2e") || 
        inv.email?.toLowerCase().includes("test")
      );
      console.log(`Found ${e2eInvites.length} invites to clean`);
      for (const inv of e2eInvites) {
         await requestContext.delete(`${PUBLIC_API_ORIGIN}/invitations/sysadmin`, {
           data: { invite_ids: [inv.id] }
         });
         console.log("Deleted invite", inv.email);
      }
    }
  } finally {
    await requestContext.dispose();
  }
}
globalTeardown().catch(console.error);
