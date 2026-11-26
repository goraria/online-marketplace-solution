import type {
  AuthUser,
  AuthUserStatus,
  SsoAuthUserClaims,
  SsoAuthUser,
} from "@/utils/interface"

export function resolveInternalPath(value: unknown, fallback = "/") {
  return typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//")
    ? value
    : fallback
}

export function isRouteMatch(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`)
}

export function isPublicRoute(
  pathname: string,
  publicPrefixes: readonly string[]
) {
  return (
    pathname === "/" ||
    publicPrefixes.some((prefix) => isRouteMatch(pathname, prefix))
  )
}

export const authUserStatuses = [
  "active",
  "inactive",
  "suspended",
  "deleted",
] as const

export function normalizeUrl(value: string) {
  return new URL(value).toString().replace(/\/$/, "")
}

export function getRecordString(
  record: Record<string, unknown> | undefined,
  key: string
) {
  const value = record?.[key]
  return typeof value === "string" ? value : null
}

export function getAuthUserStatus(value: unknown): AuthUserStatus {
  return authUserStatuses.includes(value as AuthUserStatus)
    ? (value as AuthUserStatus)
    : "active"
}

export function formatSsoAuthUser(
  payload: SsoAuthUserClaims
): SsoAuthUser | null {
  if (!payload.sub || !payload.email) return null

  return {
    id: payload.sub,
    email: payload.email,
    name: payload.name ?? getRecordString(payload.user_metadata, "name"),
    username:
      payload.preferred_username ??
      getRecordString(payload.user_metadata, "username"),
    image:
      payload.picture ??
      getRecordString(payload.user_metadata, "avatar_url") ??
      getRecordString(payload.user_metadata, "picture"),
    status: getAuthUserStatus(payload.status),
  }
}

export function getAppClaim(payload: SsoAuthUserClaims, claimName: string) {
  const claim = payload[claimName]

  if (claim && typeof claim === "object") {
    return claim as Record<string, unknown>
  }

  return payload.gorth_app ?? null
}

export function formatPublicSession(record: {
  subject: string
  expiresAt: number
  user: {
    name: string
    email: string
    username: string | null
    image: string | null
  }
}) {
  const { name, email, username, image } = record.user
  return {
    user: { id: record.subject, name, email, username, image },
    expiresAt: record.expiresAt,
  }
}

export function formatAuthUser(user: {
  externalUserId: string
  name: string
  email: string
  username?: string | null
  image?: string | null
}): AuthUser {
  return {
    id: user.externalUserId,
    name: user.name,
    email: user.email,
    username: user.username ?? null,
    image: user.image ?? null,
  }
}

export function formatLocalUser(user: import("@/database/schema").User) {
  return {
    id: user.id,
    externalUserId: user.externalUserId,
    name: user.name,
    username: user.username,
    role: user.role,
    status: user.status,
    email: user.email,
    image: user.image,
    metadata: user.metadata,
    lastSeenAt: user.lastSeenAt?.toISOString() ?? null,
    syncedAt: user.syncedAt.toISOString(),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  }
}

const internalApiDomains = new Set(["marketplace", "health"])

const externalApiDomains = new Set([
  "billing",
  "discovery",
  "insight",
  "media",
  "notification",
  "payment",
  "resource",
  "commerce",
])

// Canonicalize dynamic same-origin query and mutation paths.
export function formatApiPath(path: string) {
  const domain = /^\/([a-z-]+)(?:[/?#]|$)/.exec(path)?.[1]
  if (!domain) return path
  if (internalApiDomains.has(domain)) return "/internal" + path
  if (externalApiDomains.has(domain)) return "/external" + path
  return path
}
