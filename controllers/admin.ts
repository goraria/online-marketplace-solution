import { rawListResourceManagement as listAdminResourceServices } from "@/services/management"
import { parameter, delegatedToken } from "@/utils/controller"
import type { ApiEnv } from "@/utils/interface"
import type { Context } from "hono"
export async function actListAdminResource(context: Context<ApiEnv>) {
  try {
    return context.json(
      await listAdminResourceServices(
        parameter(context, "resource"),
        context.req.query(),
        await delegatedToken(context)
      ),
      200
    )
  } catch (error) {
    throw error
  }
}
