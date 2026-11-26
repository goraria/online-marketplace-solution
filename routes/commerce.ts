import { Hono } from "hono"
import {
  actGetCart,
  actAddCartItem,
  actUpdateCartItem,
  actRemoveCartItem,
  actListAddress,
  actCreateAddress,
  actUpdateAddress,
  actDeleteAddress,
  actCheckout,
  actListOrder,
  actGetOrder,
  actCancelOrder,
  actQuote,
} from "@/controllers/commerce"
import { requireAuth } from "@/middlewares/auth"
export const commerceRoutes = new Hono()
commerceRoutes.get("/cart", requireAuth(), actGetCart)
commerceRoutes.post("/cart/item", requireAuth(), actAddCartItem)
commerceRoutes.patch("/cart/item/:id", requireAuth(), actUpdateCartItem)
commerceRoutes.delete("/cart/item/:id", requireAuth(), actRemoveCartItem)
commerceRoutes.get("/address", requireAuth(), actListAddress)
commerceRoutes.post("/address", requireAuth(), actCreateAddress)
commerceRoutes.patch("/address/:id", requireAuth(), actUpdateAddress)
commerceRoutes.delete("/address/:id", requireAuth(), actDeleteAddress)
commerceRoutes.post("/checkout", requireAuth({ freshProfile: true }), actCheckout)
commerceRoutes.post("/quote", requireAuth(), actQuote)
commerceRoutes.get("/order", requireAuth(), actListOrder)
commerceRoutes.get("/order/:id", requireAuth(), actGetOrder)
commerceRoutes.post(
  "/order/:id/cancel",
  requireAuth({ freshProfile: true }),
  actCancelOrder
)
