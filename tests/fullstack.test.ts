import { beforeEach, expect, it, vi } from "vitest"
const fixture = vi.hoisted(() => ({
  database: vi.fn(),
  credentials: vi.fn(),
  forward: vi.fn(),
  verify: vi.fn(),
  profile: vi.fn(),
  local: vi.fn(),
  cart: vi.fn(),
  addCart: vi.fn(),
  catalog: vi.fn(),
  admin: vi.fn(),
  seller: vi.fn(),
}))
vi.mock("@/utils/environment", () => ({
  oauthCookiePrefix: "gorth",
  appUrl: "http://localhost:3035",
  authUrl: "http://localhost:3000",
  oauthClientId: "marketplace",
  oauthClientSecret: "fixture-confidential-secret",
  oauthAudience: "http://localhost:3035",
  sessionSecret: "fixture-only-secret-at-least-32-bytes",
  isProduction: false,
  rateLimitEnabled: false,
  oauthReadScope: "marketplace:read",
  oauthWriteScope: "marketplace:write",
  oauthNotifyAudience: "http://localhost:5052",
  oauthResourceAudience: "http://localhost:5053",
  oauthDiscoveryAudience: "http://localhost:5054",
  oauthPaymentAudience: "http://localhost:5055",
  oauthBillingAudience: "http://localhost:5056",
  oauthMediaAudience: "http://localhost:5057",
  oauthInsightAudience: "",
  oauthCommerceAudience: "http://localhost:5059",
}))
vi.mock("@/database", () => ({ getDatabase: fixture.database }))
vi.mock("@/lib/auth/server", () => ({
  authServer: {
    handler: () => Response.json({ status: "native-better-auth" }),
  },
}))
vi.mock("@/models/session", () => ({
  rawReadAppIdentity: fixture.credentials,
  rawReadAppCredentials: fixture.credentials,
}))
vi.mock("@/services/route", () => ({ rawForwardRouteRequest: fixture.forward }))
vi.mock("@/services/sso", async (original) => ({
  ...(await original()),
  rawVerifySsoAccessTokenRequest: fixture.verify,
  rawGetVerifiedSsoUserInfo: fixture.profile,
}))
vi.mock("@/models/user", () => ({
  rawGetUserByExternalId: fixture.local,
  rawGetCurrentUser: fixture.local,
  rawSyncUser: vi.fn(),
}))
vi.mock("@/services/catalog", () => ({
  rawGetCatalog: fixture.catalog,
  rawListCategory: vi.fn(),
  rawGetCategory: vi.fn(),
  rawListProduct: vi.fn(),
  rawGetProduct: vi.fn(),
  rawGetStore: vi.fn(),
  rawListStore: vi.fn(),
}))
vi.mock("@/services/commerce", () => ({
  rawGetCart: fixture.cart,
  rawAddCartItem: fixture.addCart,
  rawUpdateCartItem: vi.fn(),
  rawRemoveCartItem: vi.fn(),
  rawListAddress: vi.fn(),
  rawCreateAddress: vi.fn(),
  rawUpdateAddress: vi.fn(),
  rawDeleteAddress: vi.fn(),
  rawCheckout: vi.fn(),
  rawListOrder: vi.fn(),
  rawGetOrder: vi.fn(),
  rawCancelOrder: vi.fn(),
}))
vi.mock("@/services/management", () => ({ rawListResourceManagement: fixture.admin }))
vi.mock("@/services/seller", () => ({
  rawGetSellerContext: vi.fn(),
  rawListSellerProduct: vi.fn(),
  rawCreateSellerProduct: fixture.seller,
}))
import { createApp } from "./http-app"
const localUser = (role = "user") => ({
  syncedAt: new Date(),
  id: "local-user",
  externalUserId: "central-sub",
  name: "Fixture",
  email: "fixture@example.test",
  username: null,
  image: null,
  status: "active",
  role,
  bannedAt: null,
  banExpires: null,
  deletedAt: null,
})
const session = (role = "user") => ({
  credentials: { accessToken: "backend-access-token" },
  user: localUser(role),
  subject: "central-sub",
  sid: "central-sid",
  id: "native-session",
  createdAt: Date.now(),
  expiresAt: Date.now() + 600000,
})
const headers = {
  Cookie: "gorth.session_token=fixture",
  Origin: "http://localhost:3035",
}
beforeEach(() => {
  vi.resetAllMocks()
  fixture.database.mockImplementation(() => {
    throw new Error("Unexpected DB access")
  })
  fixture.credentials.mockResolvedValue(null)
  fixture.verify.mockResolvedValue({
    sub: "central-sub",
    sid: "central-sid",
    scope: "marketplace:read marketplace:write",
  })
  fixture.profile.mockResolvedValue({
    sub: "central-sub",
    email: "fixture@example.test",
    name: "Fixture",
    status: "active",
    gorth_app: { role: "master" },
  })
  fixture.local.mockResolvedValue(localUser())
  fixture.forward.mockResolvedValue(
    Response.json(
      { ok: true },
      {
        headers: {
          "Set-Cookie": "foreign=value",
          Location: "https://foreign.test",
        },
      }
    )
  )
})
it("serves native auth/health/metadata in process without the retired server", async () => {
  const app = createApp()
  expect((await app.request("/health")).status).toBe(200)
  expect(await (await app.request("/auth/ok")).json()).toEqual({
    status: "native-better-auth",
  })
  expect(
    await (await app.request("/.well-known/oauth-protected-resource")).json()
  ).toMatchObject({
    resource: "http://localhost:3035",
    scopes_supported: ["marketplace:read", "marketplace:write"],
  })
  expect(fixture.database).not.toHaveBeenCalled()
})
it("keeps the storefront catalog public without initializing auth", async () => {
  fixture.catalog.mockResolvedValue({ categories: [], featured: [] })
  expect(
    await (await createApp().request("/marketplace/catalog")).json()
  ).toEqual({ data: { categories: [], featured: [] } })
  expect(fixture.credentials).not.toHaveBeenCalled()
  expect(fixture.database).not.toHaveBeenCalled()
})
it("protects all private namespaces even without the UI guard", async () => {
  const app = createApp()
  for (const path of [
    "/marketplace/cart",
    "/marketplace/address",
    "/marketplace/order",
    "/marketplace/user/me",
    "/marketplace/seller/context",
    "/marketplace/admin/product",
    "/resource/state",
    "/payment",
    "/billing/subscription",
    "/media/bucket",
    "/notification",
    "/discovery/search",
  ])
    expect((await app.request(path)).status, path).toBe(401)
  expect(fixture.cart).not.toHaveBeenCalled()
  expect(fixture.forward).not.toHaveBeenCalled()
})
it("does not trust an SSO admin claim as a Marketplace admin", async () => {
  fixture.credentials.mockResolvedValue(session("user"))
  expect(
    (await createApp().request("/marketplace/admin/product", { headers }))
      .status
  ).toBe(403)
  expect(fixture.admin).not.toHaveBeenCalled()
})
it("allows a verified local Marketplace admin", async () => {
  fixture.credentials.mockResolvedValue(session("admin"))
  fixture.admin.mockResolvedValue({ data: [], pagination: { total: 0 } })
  expect(
    (await createApp().request("/marketplace/admin/product", { headers }))
      .status
  ).toBe(200)
  expect(fixture.admin).toHaveBeenCalledWith(
    "product",
    {},
    "backend-access-token"
  )
  expect(fixture.credentials).toHaveBeenCalledWith(expect.any(Headers))
})
it("derives the cart actor from verified SSO identity, never the body", async () => {
  fixture.credentials.mockResolvedValue(session())
  fixture.addCart.mockResolvedValue({ id: "cart" })
  const body = {
    listingVariantId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    quantity: 1,
    userId: "forged",
    externalUserId: "forged",
  }
  const response = await createApp().request(
    "http://localhost:3035/marketplace/cart/item",
    {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  )
  expect(response.status).toBe(201)
  expect(fixture.addCart).toHaveBeenCalledWith("backend-access-token", body)
  expect(fixture.credentials).toHaveBeenCalledWith(expect.any(Headers))
})
it("checks mutation origin before calling business services", async () => {
  fixture.credentials.mockResolvedValue(session())
  const response = await createApp().request(
    "http://localhost:3035/marketplace/cart/item",
    {
      method: "POST",
      headers: {
        ...headers,
        Origin: "https://evil.test",
        "Content-Type": "application/json",
      },
      body: "{}",
    }
  )
  expect(response.status).toBe(403)
  expect(fixture.addCart).not.toHaveBeenCalled()
})
it("forwards only the backend bearer and blocks proxies after local logout", async () => {
  fixture.credentials.mockResolvedValue(session())
  const app = createApp()
  const response = await app.request(
    "http://localhost:3035/discovery/search?query=fixture",
    { headers: { ...headers, Authorization: "Bearer untrusted" } }
  )
  expect(response.status).toBe(200)
  const options = fixture.forward.mock.calls[0][0]
  expect(options.url.origin).toBe("http://localhost:5054")
  expect(options.url.searchParams.get("application")).toBe("marketplace")
  expect(options.headers.get("authorization")).toBe(
    "Bearer backend-access-token"
  )
  expect(options.headers.get("cookie")).toBeNull()
  expect(response.headers.get("set-cookie")).toBeNull()
  expect(response.headers.get("location")).toBeNull()
  fixture.credentials.mockResolvedValue(null)
  expect((await app.request("/payment", { headers })).status).toBe(401)
  expect(fixture.forward).toHaveBeenCalledTimes(1)
})
it("keeps public media and billing catalog usable anonymously without forwarding cookies/tokens", async () => {
  const app = createApp()
  for (const path of ["/media/public/image-id", "/billing/catalog"]) {
    const response = await app.request("http://localhost:3035" + path, {
      headers: { Cookie: "foreign=secret", Authorization: "Bearer attacker" },
    })
    expect(response.status).toBe(200)
    const options = fixture.forward.mock.calls.at(-1)![0]
    expect(options.headers.get("authorization")).toBeNull()
    expect(options.headers.get("cookie")).toBeNull()
    expect(response.headers.get("set-cookie")).toBeNull()
  }
  expect(fixture.credentials).not.toHaveBeenCalled()
})
it("keeps the current backend token for seller media verification", async () => {
  fixture.credentials.mockResolvedValue(session())
  fixture.seller.mockResolvedValue({ id: "product" })
  const response = await createApp().request(
    "http://localhost:3035/marketplace/seller/product",
    {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: "{}",
    }
  )
  expect(response.status).toBe(201)
  expect(fixture.seller).toHaveBeenCalledWith("backend-access-token", {})
})
it("maps validation and business failures without turning them into auth failures", async () => {
  const { MarketplaceError } = await import("@/lib/marketplace-error")
  fixture.credentials.mockResolvedValue(session())
  fixture.cart.mockRejectedValue(new MarketplaceError("cart_not_found", 404))
  expect(
    (await createApp().request("/marketplace/cart", { headers })).status
  ).toBe(404)
})
