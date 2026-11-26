import { Hono } from "hono"
import { actListAdminResource } from "@/controllers/admin"
import { requireAuth } from "@/middlewares/auth"
import { requireMarketplaceAdmin } from "@/middlewares/admin"
export const adminRoutes = new Hono()
adminRoutes.get(
  "/:resource",
  requireAuth({ freshProfile: true }),
  requireMarketplaceAdmin(),
  actListAdminResource
)
