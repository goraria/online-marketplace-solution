import type { Context } from "hono"
import type { ApiEnv } from "@/utils/interface"
import { externalUserId } from "@/utils/controller"
import { rawGetCurrentUser as getCurrentUserServices } from "@/models/user"
export async function actGetCurrentUser(context: Context<ApiEnv>) {
  try {
    const user = await getCurrentUserServices(externalUserId(context))
    return user
      ? context.json({ data: user }, 200)
      : context.json({ error: "user_not_found" }, 404)
  } catch (error) {
    throw error
  }
}
