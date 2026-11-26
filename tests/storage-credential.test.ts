import { it, expect, vi, beforeEach } from "vitest"
const verify = vi.hoisted(() => vi.fn())
vi.mock("better-auth/oauth2", async (original) => ({
  ...(await original<object>()),
  verifyAccessTokenRequest: verify,
}))
vi.mock("@/utils/environment", () => ({
  appUrl: "https://restaurant.fixture.test",
  authUrl: "https://sso.fixture.test",
  isProduction: true,
  awsEndpointUrlS3: "https://storage.fixture.test",
  awsAccessKeyId: "fixture-id",
  awsSecretAccessKey: "fixture-private-secret",
  awsRegion: "ap-southeast-1",
  awsBucket: "restaurant-fixture",
}))
import { Hono } from "hono"
import { storageCredentialRoutes } from "@/routes/storage-credential"
import { MarketplaceError } from "@/lib/marketplace-error"
import { verifyStorageReader } from "@/lib/backend-oauth"
const grant = () => ({
  sub: "existing-media-client",
  client_id: "existing-media-client",
  scope: "storage:marketplace:credential",
  iat: 1000,
  exp: 1120,
})
beforeEach(() => {
  verify.mockReset()
  verify.mockResolvedValue(grant())
})
const req = (headers: Record<string, string> = {}) =>
  new Request("https://restaurant.fixture.test/internal/storage/credential", {
    method: "POST",
    headers: { authorization: "Bearer fixture", ...headers },
  })
it.each(["cookie", "origin", "sec-fetch-site"])(
  "rejects browser-shaped credentials requests carrying %s",
  async (name) => {
    await expect(
      verifyStorageReader(
        req({
          [name]:
            name === "origin" ? "https://restaurant.fixture.test" : "fixture",
        })
      )
    ).rejects.toMatchObject({ status: 403 })
    expect(verify).not.toHaveBeenCalled()
  }
)
it("delegates exact issuer/audience/scope verification to Better Auth", async () => {
  await verifyStorageReader(req())
  expect(verify).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      jwksUrl: "https://sso.fixture.test/auth/jwks",
      requiredScopes: ["storage:marketplace:credential"],
      verifyOptions: expect.objectContaining({
        audience: "https://restaurant.fixture.test/internal/storage/credential",
        issuer: "https://sso.fixture.test/auth",
        maxTokenAge: 120,
      }),
    })
  )
})
it.each([
  { sub: "normal-user" },
  { sid: "browser-session" },
  { scope: "restaurant:write" },
  { exp: 1600 },
  { status: "suspended" },
])(
  "does not confuse an app user/borrowed scope with Media machine authority %j",
  async (extra) => {
    verify.mockResolvedValue({ ...grant(), ...extra })
    await expect(verifyStorageReader(req())).rejects.toMatchObject({
      status: 403,
    })
  }
)
it("returns credentials only through the machine route with private no-store headers", async () => {
  const app = new Hono()
  app.route("/internal/storage", storageCredentialRoutes)
  app.onError((e, c) =>
    c.json(
      { error: e instanceof MarketplaceError ? e.code : "error" },
      e instanceof MarketplaceError ? (e.status as 403) : 500
    )
  )
  const r = await app.request(
    "https://restaurant.fixture.test/internal/storage/credential",
    {
      method: "POST",
      headers: {
        authorization: "Bearer fixture",
        "content-type": "application/json",
      },
      body: JSON.stringify({ bucketName: "restaurant-fixture" }),
    }
  )
  expect(r.status).toBe(200)
  expect(r.headers.get("cache-control")).toBe("private, no-store")
  expect(await r.json()).toMatchObject({
    bucketName: "restaurant-fixture",
    accessKeyId: "fixture-id",
    secretAccessKey: "fixture-private-secret",
  })
  const denied = await app.request(
    "https://restaurant.fixture.test/internal/storage/credential",
    {
      method: "POST",
      headers: {
        authorization: "Bearer fixture",
        "content-type": "application/json",
      },
      body: JSON.stringify({ bucketName: "another-bucket" }),
    }
  )
  expect(denied.status).toBe(403)
  expect(await denied.text()).not.toContain("fixture-private-secret")
})
