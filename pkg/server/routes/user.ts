import { Router } from "@/lib/http"
import { getCurrentUserController } from "@/controllers/user"
import { requireAuth } from "@/middlewares/auth"

const router = Router()

router.get("/me", requireAuth(), getCurrentUserController)

export default router

