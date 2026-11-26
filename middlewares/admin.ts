import type { MiddlewareHandler } from "hono"
import type { ApiEnv } from "@/utils/interface"
export function requireMarketplaceAdmin(): MiddlewareHandler<ApiEnv> {
  return async (context, next) => {
    const auth = context.get("auth")
    if (!auth) return context.json({ error: "unauthorized" }, 401)
    // requireAuth populated this from the fresh local DB row, not the SSO role.
    if (!auth.localRole || !["admin", "master"].includes(auth.localRole))
      return context.json({ error: "forbidden" }, 403)
    await next()
  }
}
