import type { NextFunction, Request, Response } from "@/lib/http"
import type { AuthContext } from "@/middlewares/auth"
import { findUserByExternalId } from "@/services/user"

const adminRoles = new Set(["admin", "master"])

export function requireMarketplaceAdmin() {
  return async (_request: Request, response: Response, next: NextFunction) => {
    const auth = response.locals.auth as AuthContext | undefined
    if (!auth) return response.status(401).json({ error: "unauthorized" })

    const user = await findUserByExternalId(auth.user.id)
    if (!user || !adminRoles.has(user.role)) {
      return response.status(403).json({ error: "forbidden" })
    }

    return next()
  }
}
