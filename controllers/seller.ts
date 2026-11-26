import {
  rawCreateSellerProduct as createSellerProductServices,
  rawGetSellerContext as getSellerContextServices,
  rawListSellerProduct as listSellerProductServices,
} from "@/services/seller"
import { delegatedToken } from "@/utils/controller"
import type { ApiEnv } from "@/utils/interface"
import type { Context } from "hono"
export async function actGetSellerContext(context: Context<ApiEnv>) {
  try {
    return context.json(
      { data: await getSellerContextServices(await delegatedToken(context)) },
      200
    )
  } catch (error) {
    throw error
  }
}
export async function actListSellerProduct(context: Context<ApiEnv>) {
  try {
    return context.json(
      await listSellerProductServices(
        await delegatedToken(context),
        context.req.query()
      ),
      200
    )
  } catch (error) {
    throw error
  }
}
export async function actCreateSellerProduct(context: Context<ApiEnv>) {
  try {
    return context.json(
      {
        data: await createSellerProductServices(
          await delegatedToken(context),
          await context.req.json()
        ),
      },
      201
    )
  } catch (error) {
    throw error
  }
}
