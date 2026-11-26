import "server-only"
import type { Context } from "hono"
import type { SessionEnv } from "@/middlewares/session"
import {
  oauthDiscoveryAudience,
  oauthNotifyAudience,
  oauthResourceAudience,
  oauthMediaAudience,
  oauthPaymentAudience,
  oauthBillingAudience,
  oauthInsightAudience,
  oauthCommerceAudience,
  isProduction,
} from "@/utils/environment"
import { rawForwardRouteRequest } from "@/services/route"

export async function actForwardPlatform(context: Context<SessionEnv>) {
  return forwardPlatformRequest(context, false)
}
export async function actForwardPublicPlatform(context: Context<SessionEnv>) {
  return forwardPlatformRequest(context, true)
}
async function forwardPlatformRequest(
  context: Context<SessionEnv>,
  publicRequest: boolean
) {
  const source = new URL(context.req.url)
  const pathname = source.pathname.slice("/external".length)
  const domain = pathname.split("/")[1]
  const upstream =
    domain === "commerce"
      ? oauthCommerceAudience
      : domain === "resource"
        ? oauthResourceAudience
        : domain === "discovery"
          ? oauthDiscoveryAudience
          : domain === "notification"
            ? oauthNotifyAudience
            : domain === "media"
              ? oauthMediaAudience
              : domain === "payment"
                ? oauthPaymentAudience
                : domain === "billing"
                  ? oauthBillingAudience
                  : domain === "insight"
                    ? oauthInsightAudience
                    : ""
  if (!upstream) return context.json({ error: "service_unavailable" }, 503)
  const base = new URL(upstream)
  if (
    base.username ||
    base.password ||
    base.search ||
    base.hash ||
    base.pathname !== "/" ||
    (base.protocol !== "https:" &&
      (isProduction ||
        base.protocol !== "http:" ||
        !["localhost", "127.0.0.1", "[::1]"].includes(base.hostname)))
  )
    return context.json({ error: "service_unavailable" }, 503)
  const target = new URL(base)
  // Assign the pathname, never resolve browser input as an absolute URL.
  target.pathname = pathname
  target.search = source.search
  if (domain === "discovery" && ["GET", "HEAD"].includes(context.req.method))
    target.searchParams.set("application", "marketplace")
  const headers = new Headers()
  for (const name of [
    "accept",
    "content-type",
    "if-match",
    "if-none-match",
    "idempotency-key",
    "x-request-id",
  ]) {
    const value = context.req.header(name)
    if (value) headers.set(name, value)
  }
  if (!publicRequest) {
    const credentials = context.get("credentials")
    if (!credentials) return context.json({ error: "missing_app_session" }, 401)
    headers.set(
      "authorization",
      `Bearer ${credentials.credentials.accessToken}`
    )
  }
  if (publicRequest && domain === "billing")
    target.searchParams.set("application", "marketplace")
  const authCookies = context.res.headers.getSetCookie()
  try {
    const result = await rawForwardRouteRequest({
      url: target,
      method: context.req.method,
      headers,
      body: ["GET", "HEAD"].includes(context.req.method)
        ? undefined
        : await context.req.arrayBuffer(),
    })
    // A platform response must not overwrite this application's session cookies.
    result.headers.delete("set-cookie")
    for (const cookie of authCookies)
      result.headers.append("Set-Cookie", cookie)
    if (!publicRequest || domain !== "media") result.headers.delete("location")
    else if (result.headers.has("location")) {
      const location = new URL(result.headers.get("location")!, target)
      const local = ["localhost", "127.0.0.1", "[::1]"].includes(
        location.hostname
      )
      if (
        location.username ||
        location.password ||
        (location.protocol !== "https:" &&
          !(location.protocol === "http:" && !isProduction && local))
      )
        return context.json({ error: "invalid_media_redirect" }, 502)
      result.headers.set("location", location.href)
    }
    return result
  } catch {
    return context.json({ error: "service_unavailable" }, 502)
  }
}
