import { beforeEach, expect, it, vi } from "vitest"
const fixture = vi.hoisted(() => ({
  subject: "first" as string | undefined,
  query: vi.fn(),
}))
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    account: fixture.subject ? { id: fixture.subject } : null,
  }),
}))
vi.mock("@/utils/caller", () => ({ useCallerQuery: fixture.query }))
import { createAccountQueryService } from "@/utils/account-query"
const usePrivateQuery = createAccountQueryService<
  { ok: true },
  { id: string; enabled: boolean }
>({
  queryKey: ({ id }) => ["private", id],
  query: ({ id }) => ({ url: "/marketplace/order/" + id, method: "GET" }),
  queryOptions: ({ enabled }) => ({ enabled, retry: false }),
})
beforeEach(() => {
  fixture.subject = "first"
  fixture.query.mockReset()
})
it("keys private records by the current immutable SSO subject", () => {
  usePrivateQuery({ id: "order", enabled: true })
  expect(fixture.query.mock.calls[0][0].queryKey).toEqual([
    "private",
    "order",
    "first",
  ])
  fixture.subject = "second"
  usePrivateQuery({ id: "order", enabled: true })
  expect(fixture.query.mock.calls[1][0].queryKey).toEqual([
    "private",
    "order",
    "second",
  ])
  expect(fixture.query.mock.calls[1][0].url).toBe("/marketplace/order/order")
})
it("disables private reads immediately when Better Auth observes logout", () => {
  fixture.subject = undefined
  usePrivateQuery({ id: "order", enabled: true })
  const options = fixture.query.mock.calls[0][0].queryOptions
  expect(options.enabled({})).toBe(false)
})
it("preserves the caller's disabled query policy", () => {
  usePrivateQuery({ id: "order", enabled: false })
  expect(fixture.query.mock.calls[0][0].queryOptions.enabled({})).toBe(false)
})
