import { createBdd, test as base } from "playwright-bdd"

export type InvitationRole = "sysadmin" | "admin" | "member"

export type InvitationWorld = {
  invitedEmail?: string
  invitedPassword?: string
  inviteToken?: string
  inviteUrl?: string
  organizationId?: string
  organizationName?: string
  organizationSlug?: string
  expectedRole?: InvitationRole
}

export const test = base.extend<{ invitationWorld: InvitationWorld }>({
  invitationWorld: async ({}, use) => {
    await use({})
  },
})

export const { Given, When, Then, Step } = createBdd(test)
