import "server-only"
import { rawCommerceRequest } from "@/services/commerce-client"
import type { CommercePage } from "@/utils/commerce-types"
import type {
  Cart,
  Address,
  OrderDetail,
  OrderSummary,
} from "@/utils/marketplace-types"
export async function rawGetCart(token: string) {
  return rawCommerceRequest<Cart>("/storefront/cart", { token })
}
export async function rawAddCartItem(token: string, body: unknown) {
  return rawCommerceRequest<Cart>("/storefront/cart/item", {
    token,
    body,
    method: "POST",
  })
}
export async function rawUpdateCartItem(token: string, id: string, body: unknown) {
  return rawCommerceRequest<Cart>(
    "/storefront/cart/item/" + encodeURIComponent(id),
    { token, body, method: "PATCH" }
  )
}
export async function rawRemoveCartItem(token: string, id: string) {
  return rawCommerceRequest<Cart>(
    "/storefront/cart/item/" + encodeURIComponent(id),
    { token, method: "DELETE" }
  )
}
export async function rawListAddress(token: string) {
  return rawCommerceRequest<Address[]>("/storefront/address", { token })
}
export async function rawCreateAddress(token: string, body: unknown) {
  return rawCommerceRequest<Address>("/storefront/address", {
    token,
    body,
    method: "POST",
  })
}
export async function rawUpdateAddress(token: string, id: string, body: unknown) {
  return rawCommerceRequest<Address>(
    "/storefront/address/" + encodeURIComponent(id),
    { token, body, method: "PATCH" }
  )
}
export async function rawDeleteAddress(token: string, id: string) {
  return rawCommerceRequest("/storefront/address/" + encodeURIComponent(id), {
    token,
    method: "DELETE",
  })
}
export async function rawCheckout(token: string, body: unknown) {
  return rawCommerceRequest<OrderSummary>("/storefront/checkout", {
    token,
    body,
    method: "POST",
  })
}
export async function rawQuote(token: string, body: unknown) {
  return rawCommerceRequest("/storefront/quote", { token, body, method: "POST" })
}
export async function rawListOrder(token: string, query: unknown) {
  return rawCommerceRequest<CommercePage<OrderSummary>>("/storefront/order", {
    token,
    query,
    raw: true,
  })
}
export async function rawGetOrder(token: string, id: string) {
  return rawCommerceRequest<OrderDetail>(
    "/storefront/order/" + encodeURIComponent(id),
    { token }
  )
}
export async function rawCancelOrder(token: string, id: string, body: unknown) {
  return rawCommerceRequest(
    "/storefront/order/" + encodeURIComponent(id) + "/cancel",
    { token, body, method: "POST" }
  )
}
