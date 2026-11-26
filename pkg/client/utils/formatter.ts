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

export function normalizeIssuer(value: string | null | undefined) {
  if (!value) return null

  try {
    return new URL(value).toString().replace(/\/$/, "")
  } catch {
    return null
  }
}

export function getErrorStatus(error: unknown) {
  return error instanceof Error &&
    "status" in error &&
    typeof error.status === "number"
    ? error.status
    : null
}

export function getPayloadValue(
  payload: FormData | Record<string, unknown>,
  key: string
) {
  const value = payload instanceof FormData ? payload.get(key) : payload[key]
  return typeof value === "string" ? value.trim() : ""
}

export function getSafeHeaders(
  headers: Headers,
  hiddenHeaders: readonly string[] = ["authorization", "cookie"]
) {
  const hidden = new Set(hiddenHeaders.map((header) => header.toLowerCase()))

  return Object.fromEntries(
    Array.from(headers.entries()).filter(
      ([key]) => !hidden.has(key.toLowerCase())
    )
  )
}

export function buildEndSessionUrl({
  issuer,
  idToken,
  clientId,
  postLogoutRedirectUri,
}: {
  issuer: string
  idToken?: string
  clientId: string
  postLogoutRedirectUri: string
}) {
  if (!idToken) return null

  const url = new URL("/auth/oauth2/end-session", issuer)
  url.searchParams.set("id_token_hint", idToken)
  url.searchParams.set("client_id", clientId)
  url.searchParams.set("post_logout_redirect_uri", postLogoutRedirectUri)
  return url.toString()
}

export function isTimestampRecent(
  value: number | undefined,
  maxAgeMs: number,
  now = Date.now()
) {
  return Boolean(value && now - value < maxAgeMs)
}

export function parseBoolean(value: string | undefined, fallback: boolean) {
  return value === undefined ? fallback : value === "true"
}

export function getStringSeed(value: string) {
  return Array.from(value).reduce(
    (seed, character) => (seed * 31 + character.charCodeAt(0)) >>> 0,
    17
  )
}
