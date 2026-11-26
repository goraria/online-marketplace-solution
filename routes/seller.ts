import { Hono } from "hono"
import {
  actGetSellerContext,
  actListSellerProduct,
  actCreateSellerProduct,
} from "@/controllers/seller"
import { requireAuth } from "@/middlewares/auth"
export const sellerRoutes = new Hono()
sellerRoutes.get("/context", requireAuth(), actGetSellerContext)
sellerRoutes.get("/product", requireAuth(), actListSellerProduct)
sellerRoutes.post("/product", requireAuth(), actCreateSellerProduct)
