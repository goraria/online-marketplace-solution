import { Hono } from "hono"
import { actGetCurrentUser } from "@/controllers/user"
import { requireAuth } from "@/middlewares/auth"
export const userRoutes = new Hono()
userRoutes.get("/me", requireAuth(), actGetCurrentUser)
