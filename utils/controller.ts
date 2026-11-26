import type { Context } from "hono"
import { MarketplaceError } from "@/lib/marketplace-error"
import type { ApiEnv } from "@/utils/interface"
import { rawReadAppCredentials } from "@/models/session"
export async function delegatedToken(context:Context<ApiEnv>) {
  const authorization=context.req.header("authorization")
  if(authorization?.startsWith("Bearer ")) return authorization.slice(7)
  const session=await rawReadAppCredentials(context.req.raw.headers)
  if(!session) throw new MarketplaceError("unauthorized",401)
  return session.credentials.accessToken
}
export function externalUserId(context: Context<ApiEnv>) {
  const id = context.get("auth")?.user.id
  if (!id) throw new MarketplaceError("unauthorized", 401)
  return id
}
export function parameter(context: Context<ApiEnv>, name: string) {
  const value = context.req.param(name)
  if (!value) throw new MarketplaceError("invalid_route_parameter", 400)
  return value
}
export function getDatabaseError(error: unknown) {
  let current = error
  while (current && typeof current === "object") {
    if ("code" in current) {
      const code = String(current.code ?? "")
      if (code) return code
    }
    current = "cause" in current ? current.cause : null
  }
  return ""
}
