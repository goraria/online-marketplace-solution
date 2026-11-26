import { Hono } from "hono"
import {
  actGetCatalog,
  actListCategory,
  actGetCategory,
  actListProduct,
  actGetProduct,
  actListStore,
  actGetStore,
} from "@/controllers/catalog"
export const catalogRoutes = new Hono()
catalogRoutes.get("/", actGetCatalog)
catalogRoutes.get("/category", actListCategory)
catalogRoutes.get("/category/:slug", actGetCategory)
catalogRoutes.get("/product", actListProduct)
catalogRoutes.get("/product/:slug", actGetProduct)
catalogRoutes.get("/store", actListStore)
catalogRoutes.get("/store/:slug", actGetStore)
