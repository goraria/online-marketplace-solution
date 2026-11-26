import "server-only"
import {
  requestToResourceInput,
  verifyAccessTokenRequest,
  isInsufficientScopeError,
} from "better-auth/oauth2"
import { appUrl, authUrl, isProduction } from "@/utils/environment"
import { MarketplaceError } from "@/lib/marketplace-error"
// Better Auth verifies the token. The application authorizes this machine capability.
export async function verifyStorageReader(request: Request) {
  const scope = "storage:marketplace:credential"
  let audience: string, issuer: string, jwksUrl: string
  try {
    for (const raw of [appUrl, authUrl]) {
      const u = new URL(raw)
      if (
        u.username ||
        u.password ||
        u.hash ||
        u.search ||
        u.pathname !== "/" ||
        (u.protocol !== "https:" &&
          (isProduction ||
            u.protocol !== "http:" ||
            !["localhost", "127.0.0.1", "[::1]"].includes(u.hostname)))
      )
        throw Error()
    }
    audience = new URL("/internal/storage/credential", appUrl).href
    issuer = new URL("/auth", authUrl).href.replace(/\/$/, "")
    jwksUrl = new URL("/auth/jwks", authUrl).href
  } catch {
    throw new MarketplaceError("backend_oauth_not_configured", 503)
  }
  if (
    ["cookie", "origin", "sec-fetch-site"].some((h) => request.headers.has(h))
  )
    throw new MarketplaceError("machine_request_required", 403)
  const input = requestToResourceInput(request)
  if (
    !input.authorizationHeader ||
    !/^Bearer [^\s]+$/i.test(input.authorizationHeader)
  )
    throw new MarketplaceError("unauthorized", 401)
  input.authorizationHeader = "Bearer " + input.authorizationHeader.slice(7)
  let claims
  try {
    claims = await verifyAccessTokenRequest(input, {
      jwksUrl,
      requiredScopes: [scope],
      verifyOptions: {
        issuer,
        audience,
        typ: "at+jwt",
        algorithms: ["RS256", "ES256", "EdDSA"],
        requiredClaims: ["iss", "aud", "sub", "client_id", "iat", "exp"],
        maxTokenAge: 120,
      },
    })
  } catch (e) {
    if (isInsufficientScopeError(e))
      throw new MarketplaceError("insufficient_scope", 403)
    const code = e && typeof e === "object" && "code" in e ? String(e.code) : ""
    throw new MarketplaceError(
      "backend_token_verification_failed",
      /^(ERR_JWT|ERR_JWS|ERR_JOSE|ERR_JWKS_NO_MATCHING_KEY)/.test(code)
        ? 401
        : 503
    )
  }
  if (
    typeof claims.client_id !== "string" ||
    !claims.client_id ||
    claims.sub !== claims.client_id ||
    claims.sid !== undefined ||
    typeof claims.iat !== "number" ||
    typeof claims.exp !== "number" ||
    claims.exp <= claims.iat ||
    claims.exp - claims.iat > 120 ||
    typeof claims.scope !== "string" ||
    !claims.scope.split(" ").includes(scope) ||
    (claims.status !== undefined && claims.status !== "active")
  )
    throw new MarketplaceError("forbidden_machine_grant", 403)
  return claims
}
