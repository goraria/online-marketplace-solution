import type { MiddlewareHandler } from "hono"
import { verifyStorageReader } from "@/lib/backend-oauth"
import type { ApiEnv } from "@/utils/interface"
export function requireMediaStorageReader(): MiddlewareHandler<ApiEnv> {
  return async (c, next) => {
    await verifyStorageReader(c.req.raw)
    await next()
  }
}
