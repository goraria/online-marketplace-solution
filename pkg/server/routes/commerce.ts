import { Router } from "@/lib/http"
import {
  addCartItem,
  cancelOrder,
  checkout,
  createAddress,
  deleteAddress,
  getCart,
  getOrder,
  listAddress,
  listOrder,
  removeCartItem,
  updateAddress,
  updateCartItem,
} from "@/controllers/marketplace"
import { requireAuth } from "@/middlewares/auth"

const router = Router()

router.use(requireAuth())
router.get("/cart", getCart)
router.post("/cart/item", addCartItem)
router.patch("/cart/item/:id", updateCartItem)
router.delete("/cart/item/:id", removeCartItem)
router.get("/address", listAddress)
router.post("/address", createAddress)
router.patch("/address/:id", updateAddress)
router.delete("/address/:id", deleteAddress)
router.post("/checkout", checkout)
router.get("/order", listOrder)
router.get("/order/:id", getOrder)
router.post("/order/:id/cancel", cancelOrder)

export default router
