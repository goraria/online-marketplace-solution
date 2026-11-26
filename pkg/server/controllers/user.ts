import type { NextFunction, Request, Response } from "@/lib/http"
import type { AuthContext } from "@/middlewares/auth"
import { findUserByExternalId } from "@/services/user"

export async function getCurrentUserController(
  _request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const auth = response.locals.auth as AuthContext
    const user = await findUserByExternalId(auth.user.id)

    if (!user) {
      return response.status(404).json({ error: "user_not_found" })
    }

    return response.status(200).json({ data: user })
  } catch (error) {
    return next(error)
  }
}
