import "server-only"
import { fetcher } from "@/utils/fetcher"
import { oauthCommerceAudience, isProduction } from "@/utils/environment"
import { MarketplaceError } from "@/lib/marketplace-error"
export async function rawCommerceRequest<T = unknown>(
  path: string,
  options: {
    token?: string
    body?: unknown
    query?: unknown
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
    raw?: boolean
  } = {}
): Promise<T> {
  if (!oauthCommerceAudience)
    throw new MarketplaceError("commerce_not_configured", 503)
  const base = new URL(oauthCommerceAudience)
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
    throw new MarketplaceError("invalid_commerce_configuration", 503)
  const url = new URL("/commerce" + path, base)
  if (options.query && typeof options.query === "object")
    for (const [k, v] of Object.entries(options.query))
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v))
  try {
    const response = await fetcher<unknown>({
      url,
      method: options.method ?? "GET",
      headers: options.token
        ? { authorization: "Bearer " + options.token }
        : {},
      body: options.body,
      cache: "no-store",
      redirect: "manual",
      validateStatus: () => true,
    })
    const body = response.data as { data?: T; error?: string }
    if (response.status < 200 || response.status >= 300)
      throw new MarketplaceError(
        body?.error ?? "commerce_request_failed",
        response.status
      )
    return (
      options.raw
        ? body
        : body && typeof body === "object" && Object.hasOwn(body, "data")
          ? body.data
          : body
    ) as T
  } catch (e) {
    if (e instanceof MarketplaceError) throw e
    throw new MarketplaceError("commerce_unavailable", 503)
  }
}
