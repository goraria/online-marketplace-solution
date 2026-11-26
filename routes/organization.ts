import { Hono } from "hono"
import { requireAppSession } from "@/middlewares/session"
import * as controller from "@/controllers/organization"
export const organizationRoutes = new Hono()
organizationRoutes.get(
  "/context",
  requireAppSession(),
  controller.actGetOrganizationContext
)
organizationRoutes.put(
  "/context",
  requireAppSession(),
  controller.actSetOrganizationContext
)
organizationRoutes.get(
  "/organization/:operation",
  requireAppSession(),
  controller.actOrganizationRequest
)
organizationRoutes.post(
  "/organization/:operation",
  requireAppSession(),
  controller.actOrganizationRequest
)
