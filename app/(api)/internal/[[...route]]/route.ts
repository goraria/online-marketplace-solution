import { handle } from "@hono/vercel"
import { Hono } from "hono"
import { http, httpError, httpNotFound, httpMethods } from "@/middlewares/http"
import { catalogRoutes } from "@/routes/catalog"
import { commerceRoutes } from "@/routes/commerce"
import { sellerRoutes } from "@/routes/seller"
import { adminRoutes } from "@/routes/admin"
import { userRoutes } from "@/routes/user"
import { organizationRoutes } from "@/routes/organization"
import { sharedRoutes } from "@/routes/shared"
const router = new Hono()
router.use(http)
router.onError(httpError)
router.notFound(httpNotFound)
router.use(httpMethods(router))
router.route("/internal/marketplace/catalog", catalogRoutes)
router.route("/internal/marketplace", commerceRoutes)
router.route("/internal/marketplace/seller", sellerRoutes)
router.route("/internal/marketplace/admin", adminRoutes)
router.route("/internal/marketplace/user", userRoutes)
router.route("/internal/marketplace", organizationRoutes)
router.route("/internal", sharedRoutes)
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const GET = handle(router)
export const HEAD = handle(router)
export const POST = handle(router)
export const PUT = handle(router)
export const PATCH = handle(router)
export const DELETE = handle(router)
export const OPTIONS = handle(router)
