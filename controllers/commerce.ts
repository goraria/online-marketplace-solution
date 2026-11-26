import type { Context } from "hono"
import type { ApiEnv } from "@/utils/interface"
import { rawQuote as quoteServices } from "@/services/commerce"
export async function actQuote(context: Context<ApiEnv>) {
  return context.json(
    {
      data: await quoteServices(
        await delegatedToken(context),
        await context.req.json()
      ),
    },
    200
  )
}
import { delegatedToken, parameter } from "@/utils/controller"
import {
  rawGetCart as getCartServices,
  rawAddCartItem as addCartItemServices,
  rawUpdateCartItem as updateCartItemServices,
  rawRemoveCartItem as removeCartItemServices,
  rawListAddress as listAddressServices,
  rawCreateAddress as createAddressServices,
  rawUpdateAddress as updateAddressServices,
  rawDeleteAddress as deleteAddressServices,
  rawCheckout as checkoutServices,
  rawListOrder as listOrderServices,
  rawGetOrder as getOrderServices,
  rawCancelOrder as cancelOrderServices,
} from "@/services/commerce"
export async function actGetCart(context: Context<ApiEnv>) {
  try {
    return context.json(
      { data: await getCartServices(await delegatedToken(context)) },
      200
    )
  } catch (error) {
    throw error
  }
}
export async function actAddCartItem(context: Context<ApiEnv>) {
  try {
    return context.json(
      {
        data: await addCartItemServices(
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
export async function actUpdateCartItem(context: Context<ApiEnv>) {
  try {
    return context.json(
      {
        data: await updateCartItemServices(
          await delegatedToken(context),
          parameter(context, "id"),
          await context.req.json()
        ),
      },
      200
    )
  } catch (error) {
    throw error
  }
}
export async function actRemoveCartItem(context: Context<ApiEnv>) {
  try {
    return context.json(
      {
        data: await removeCartItemServices(
          await delegatedToken(context),
          parameter(context, "id")
        ),
      },
      200
    )
  } catch (error) {
    throw error
  }
}
export async function actListAddress(context: Context<ApiEnv>) {
  try {
    return context.json(
      { data: await listAddressServices(await delegatedToken(context)) },
      200
    )
  } catch (error) {
    throw error
  }
}
export async function actCreateAddress(context: Context<ApiEnv>) {
  try {
    return context.json(
      {
        data: await createAddressServices(
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
export async function actUpdateAddress(context: Context<ApiEnv>) {
  try {
    return context.json(
      {
        data: await updateAddressServices(
          await delegatedToken(context),
          parameter(context, "id"),
          await context.req.json()
        ),
      },
      200
    )
  } catch (error) {
    throw error
  }
}
export async function actDeleteAddress(context: Context<ApiEnv>) {
  try {
    return context.json(
      {
        data: await deleteAddressServices(
          await delegatedToken(context),
          parameter(context, "id")
        ),
      },
      200
    )
  } catch (error) {
    throw error
  }
}
export async function actCheckout(context: Context<ApiEnv>) {
  try {
    return context.json(
      {
        data: await checkoutServices(
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
export async function actListOrder(context: Context<ApiEnv>) {
  try {
    return context.json(
      await listOrderServices(
        await delegatedToken(context),
        context.req.query()
      ),
      200
    )
  } catch (error) {
    throw error
  }
}
export async function actGetOrder(context: Context<ApiEnv>) {
  try {
    return context.json(
      {
        data: await getOrderServices(
          await delegatedToken(context),
          parameter(context, "id")
        ),
      },
      200
    )
  } catch (error) {
    throw error
  }
}
export async function actCancelOrder(context: Context<ApiEnv>) {
  try {
    return context.json(
      {
        data: await cancelOrderServices(
          await delegatedToken(context),
          parameter(context, "id"),
          await context.req.json()
        ),
      },
      200
    )
  } catch (error) {
    throw error
  }
}
