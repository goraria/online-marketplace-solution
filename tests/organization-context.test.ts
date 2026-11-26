import { beforeEach, expect, it, vi } from "vitest"
const state = vi.hoisted(() => ({
  request: vi.fn(),
  select: vi.fn(),
  save: vi.fn(),
}))
vi.mock("server-only", () => ({}))
vi.mock("@/utils/fetcher", () => ({ fetcher: state.request }))
vi.mock("@/utils/environment", () => ({
  authUrl: "https://sso.test",
  oauthClientId: "app-test",
  oauthClientSecret: "fixture-confidential-secret",
  oauthCommerceAudience: "https://commerce.test",
  isProduction: true,
}))
vi.mock("@/database", () => ({
  getDatabase: () => ({
    select: () => ({
      from: () => ({ where: () => ({ limit: state.select }) }),
    }),
    update: () => ({
      set: (value: unknown) => {
        state.save(value)
        return {
          where: () => ({
            returning: async () => [{ organizationId: org, teamId: team }],
          }),
        }
      },
    }),
  }),
}))
import {
  rawGetOrganizationContext,
  rawSetOrganizationContext,
} from "@/services/organization"
const org = "10000000-0000-4000-8000-000000000001",
  team = "20000000-0000-4000-8000-000000000001",
  other = "20000000-0000-4000-8000-000000000002"
let admin: boolean
beforeEach(() => {
  admin = false
  state.save.mockReset()
  state.select.mockResolvedValue([{ organizationId: org, teamId: other }])
  state.request.mockImplementation(async (p: { url: URL }) => ({
    status: 200,
    data: p.url.pathname.endsWith("/authorization")
      ? {
          subject: "u",
          audience: "https://commerce.test",
          authorization_details: admin
            ? [
                {
                  type: "commerce",
                  locations: ["https://commerce.test"],
                  organization_id: org,
                  actions: ["*"],
                },
              ]
            : [
                {
                  type: "commerce",
                  locations: ["https://commerce.test"],
                  organization_id: org,
                  team_id: team,
                  actions: ["profile:read"],
                },
              ],
        }
      : {
          data: p.url.pathname.endsWith("/list")
            ? [{ id: org, name: "Organization", slug: "org" }]
            : [
                { id: team, name: "Assigned" },
                { id: other, name: "Other branch" },
              ],
        },
  }))
})
it("limits members to assigned branches and masks a revoked stored preference", async () => {
  const result = await rawGetOrganizationContext("private-token", "u")
  expect(result.selected.teamId).toBeNull()
  expect(result.organizations[0]!.teams.map((t) => t.id)).toEqual([team])
  expect(result.organizations[0]!.canManage).toBe(false)
})
it("permits an org owner/admin to select any team without team assignment", async () => {
  admin = true
  expect(
    (await rawGetOrganizationContext("private-token", "u")).organizations[0]!.teams
  ).toHaveLength(2)
  await rawSetOrganizationContext("private-token", "u", {
    organizationId: org,
    teamId: other,
  })
  expect(state.save).toHaveBeenCalledWith(
    expect.objectContaining({ organizationId: org, teamId: other })
  )
})
it("never accepts a stored or caller-supplied team as proof of membership", async () => {
  await expect(
    rawSetOrganizationContext("private-token", "u", {
      organizationId: org,
      teamId: other,
    })
  ).rejects.toMatchObject({ status: 403 })
  expect(state.save).not.toHaveBeenCalled()
  await expect(
    rawSetOrganizationContext("private-token", "u", {
      organizationId: null,
      teamId: team,
    })
  ).rejects.toThrow()
})
it("allows personal context and prevents cross-subject authorization substitution", async () => {
  await rawSetOrganizationContext("private-token", "u", {
    organizationId: null,
    teamId: null,
  })
  expect(state.save).toHaveBeenCalledWith(
    expect.objectContaining({ organizationId: null, teamId: null })
  )
  await expect(
    rawGetOrganizationContext("private-token", "attacker")
  ).rejects.toMatchObject({ status: 403 })
})
it("calls only the fixed SSO endpoint, sends bearer server-side and does not forward cookies", async () => {
  await rawGetOrganizationContext("private-token", "u")
  for (const [p] of state.request.mock.calls) {
    expect(p.url.origin).toBe("https://sso.test")
    expect(p.headers).toMatchObject({
      authorization: "Bearer private-token",
      "x-oauth-client-id": "app-test",
    })
    expect(p.headers.cookie).toBeUndefined()
    expect(p.redirect).toBe("manual")
  }
})
it("fails closed without leaking upstream details when SSO is unreachable", async () => {
  state.request.mockRejectedValue(new Error("private upstream diagnostic"))
  await expect(
    rawGetOrganizationContext("private-token", "u")
  ).rejects.toMatchObject({ status: 503, message: "organization_unavailable" })
  expect(state.save).not.toHaveBeenCalled()
})
