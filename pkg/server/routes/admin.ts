import { Router } from "@/lib/http"
import { listAdminResource } from "@/controllers/admin"
import { requireMarketplaceAdmin } from "@/middlewares/admin"
import { requireAuth } from "@/middlewares/auth"

const router = Router()

router.get("/:resource", requireAuth(), requireMarketplaceAdmin(), listAdminResource)

export default router
