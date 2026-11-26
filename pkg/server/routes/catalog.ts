import { Router } from "@/lib/http"
import {
  getCatalog,
  getCategory,
  getProduct,
  getStore,
  listStore,
  listCategory,
  listProduct,
} from "@/controllers/marketplace"

const router = Router()

router.get("/", getCatalog)
router.get("/category", listCategory)
router.get("/category/:slug", getCategory)
router.get("/product", listProduct)
router.get("/product/:slug", getProduct)
router.get("/store", listStore)
router.get("/store/:slug", getStore)

export default router
