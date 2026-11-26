import { Router } from "@/lib/http"
import {
  createSellerProduct,
  getSellerContext,
  listSellerProduct,
} from "@/controllers/seller"
import { requireAuth } from "@/middlewares/auth"

const router = Router()

router.get("/context", requireAuth(), getSellerContext)
router.get("/product", requireAuth(), listSellerProduct)
router.post("/product", requireAuth(), createSellerProduct)

export default router
