import type { Context } from "hono"
import type { SessionEnv } from "@/middlewares/session"
import {
  rawGetOrganizationContext as getOrganizationContextServices,
  rawSetOrganizationContext as setOrganizationContextServices,
  rawOrganizationRequest as organizationRequestServices,
} from "@/services/organization"
export async function actGetOrganizationContext(c: Context<SessionEnv>) {
  const actor = c.get("credentials")
  return c.json(
    {
      data: await getOrganizationContextServices(
        actor.credentials.accessToken,
        actor.subject
      ),
    },
    200
  )
}
export async function actSetOrganizationContext(c: Context<SessionEnv>) {
  const actor = c.get("credentials")
  return c.json(
    {
      data: await setOrganizationContextServices(
        actor.credentials.accessToken,
        actor.subject,
        await c.req.json()
      ),
    },
    200
  )
}
export async function actOrganizationRequest(c: Context<SessionEnv>) {
  return c.json(
    {
      data: await organizationRequestServices(
        c.get("credentials").credentials.accessToken,
        c.req.param("operation")!,
        c.req.method === "GET" ? c.req.query() : await c.req.json(),
        c.req.method as "GET" | "POST"
      ),
    },
    200
  )
}
