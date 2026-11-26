import "server-only"
import { eq } from "drizzle-orm"
import { getDatabase } from "@/database"
import { userTable } from "@/database/auth"
import { fetcher } from "@/utils/fetcher"
import {
  authUrl,
  oauthClientId,
  oauthCommerceAudience,
  isProduction,
} from "@/utils/environment"
import { MarketplaceError } from "@/lib/marketplace-error"
import {
  commerceAuthorizationInput,
  selectedOrganizationInput,
  type OrganizationContext,
} from "@/schemas/organization"

export async function rawOrganizationRequest<T = unknown>(
  token: string,
  operation: string,
  input: unknown = {},
  method: "GET" | "POST" = "GET"
): Promise<T> {
  if (!authUrl || !oauthCommerceAudience || !oauthClientId)
    throw new MarketplaceError("organization_not_configured", 503)
  let base: URL
  try {
    base = new URL(authUrl)
  } catch {
    throw new MarketplaceError("invalid_auth_configuration", 503)
  }
  if (
    base.username ||
    base.password ||
    base.pathname !== "/" ||
    base.search ||
    base.hash ||
    (base.protocol !== "https:" &&
      (isProduction ||
        base.protocol !== "http:" ||
        !["localhost", "127.0.0.1", "[::1]"].includes(base.hostname)))
  )
    throw new MarketplaceError("invalid_auth_configuration", 503)
  const url = new URL(
    operation === "authorization"
      ? "/external/organization/authorization"
      : "/external/organization/" + encodeURIComponent(operation),
    base
  )
  if (method === "GET")
    for (const [key, value] of Object.entries(
      (input ?? {}) as Record<string, unknown>
    ))
      if (value !== undefined && value !== null)
        url.searchParams.set(key, String(value))
  const response = await fetcher<{ data?: T; error?: string }>({
    url,
    method,
    headers: {
      authorization: "Bearer " + token,
      "x-oauth-resource": oauthCommerceAudience,
      "x-oauth-client-id": oauthClientId,
    },
    ...(method === "POST" ? { body: input } : {}),
    timeout: 10000,
    cache: "no-store",
    redirect: "manual",
    validateStatus: () => true,
  }).catch(() => {
    throw new MarketplaceError("organization_unavailable", 503)
  })
  if (response.status < 200 || response.status >= 300)
    throw new MarketplaceError(
      response.data?.error ?? "organization_request_failed",
      response.status
    )
  return (
    operation === "authorization" ? response.data : response.data?.data
  ) as T
}
export async function rawGetOrganizationAuthority(
  token: string,
  subject?: string
) {
  const result = commerceAuthorizationInput.parse(
    await rawOrganizationRequest(token, "authorization")
  )
  if (
    result.audience !== oauthCommerceAudience ||
    (subject && result.subject !== subject) ||
    result.authorization_details.some(
      (g) => !g.locations.includes(oauthCommerceAudience)
    )
  )
    throw new MarketplaceError("invalid_organization_authority", 403)
  return result
}
export async function rawGetOrganizationContext(
  token: string,
  subject: string
): Promise<OrganizationContext> {
  const [organizations, authority, users] = await Promise.all([
    rawOrganizationRequest<Array<{ id: string; name: string; slug: string }>>(
      token,
      "list"
    ),
    rawGetOrganizationAuthority(token, subject),
    getDatabase()
      .select({
        organizationId: userTable.organizationId,
        teamId: userTable.teamId,
      })
      .from(userTable)
      .where(eq(userTable.externalUserId, subject))
      .limit(1),
  ])
  const items = await Promise.all(
    organizations.map(async (org) => {
      const grants = authority.authorization_details.filter(
        (g) => g.organization_id === org.id
      )
      const canManage = grants.some(
        (g) => !g.team_id && g.actions.some((a) => a === "*" || a === "manage")
      )
      const teams = await rawOrganizationRequest<
        Array<{ id: string; name: string }>
      >(token, "team", { organizationId: org.id })
      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        canManage,
        teams: teams
          .filter((t) => canManage || grants.some((g) => g.team_id === t.id))
          .map((t) => ({
            id: t.id,
            name: t.name,
            actions: canManage
              ? ["*"]
              : [
                  ...new Set(
                    grants
                      .filter((g) => g.team_id === t.id)
                      .flatMap((g) => g.actions)
                  ),
                ],
          })),
      }
    })
  )
  const selected = users[0] ?? { organizationId: null, teamId: null }
  const org = items.find((o) => o.id === selected.organizationId)
  // Stale preferences never restore revoked access, even before another save.
  return {
    organizations: items,
    selected: {
      organizationId: org?.id ?? null,
      teamId: org?.teams.some((t) => t.id === selected.teamId)
        ? selected.teamId
        : null,
    },
  }
}
export async function rawSetOrganizationContext(
  token: string,
  subject: string,
  raw: unknown
) {
  const input = selectedOrganizationInput.parse(raw)
  const current = await rawGetOrganizationContext(token, subject)
  const org = current.organizations.find((o) => o.id === input.organizationId)
  if (input.organizationId && !org)
    throw new MarketplaceError("organization_access_denied", 403)
  if (input.teamId && !org?.teams.some((t) => t.id === input.teamId))
    throw new MarketplaceError("team_access_denied", 403)
  const [saved] = await getDatabase()
    .update(userTable)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(userTable.externalUserId, subject))
    .returning({
      organizationId: userTable.organizationId,
      teamId: userTable.teamId,
    })
  if (!saved) throw new MarketplaceError("user_not_found", 404)
  return saved
}
