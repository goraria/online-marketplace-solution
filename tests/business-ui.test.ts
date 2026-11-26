import { createElement, type ReactNode } from "react"
import { renderToString } from "react-dom/server"
import {
  QueryClient,
  QueryClientProvider,
} from "@gorth-com/primitive/cores/tanstack/query"
import { ProgressProvider } from "@gorth-com/primitive/cores/progress/react"
import { expect, it, vi } from "vitest"
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/business",
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    account: {
      id: "11111111-1111-4111-8111-111111111111",
      name: "Fixture",
      email: "fixture@example.invalid",
    },
    authenticated: true,
    loading: false,
    login: vi.fn(),
  }),
}))
vi.mock("@/queries/business", () => ({
  useBusinessContext: () => ({
    org: { id: "org", name: "Organization", canManage: true },
    team: { id: "team", name: "Branch", actions: ["*", "manage"] },
    merchantId: "merchant",
    storeId: "store",
    merchant: { id: "merchant", name: "Profile", currency: "VND" },
    stores: [],
    loading: false,
    error: null,
  }),
  useBusinessQuery: () => ({
    data: [],
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  }),
  useBusinessMutation: () => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}))
vi.mock("@/queries/organization", () => ({
  useOrganizationContext: () => ({
    data: {
      selected: { organizationId: "org", teamId: "team" },
      organizations: [
        {
          id: "org",
          name: "Organization",
          slug: "org",
          canManage: true,
          teams: [{ id: "team", name: "Branch", actions: ["*"] }],
        },
      ],
    },
    isFetching: false,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useOrganizationQuery: () => ({
    data: [],
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  }),
  useOrganizationMutation: () => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}))
import * as businessService from "@/queries/business"
import { BusinessWorkspace } from "@/features/business"
import { BusinessServicePanel } from "@/features/business/service"
import { OrganizationWorkspace } from "@/features/organization"
import { businessEntities } from "@/features/business/entity"
function render(component: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  try {
    return renderToString(
      createElement(
        QueryClientProvider,
        { client },
        createElement(ProgressProvider, {}, component)
      )
    )
  } finally {
    client.clear()
  }
}
it("keeps organization-shared catalog writes out of a team manager's controls", () => {
  expect(
    render(createElement(BusinessWorkspace, { resource: "product" }))
  ).toContain('aria-label="Add"')
  const base = businessService.useBusinessContext()
  const spy = vi.spyOn(businessService, "useBusinessContext").mockReturnValue({
    ...base,
    org: { ...base.org!, canManage: false },
    team: { ...base.team!, actions: ["manage"] },
  })
  try {
    expect(
      render(createElement(BusinessWorkspace, { resource: "product" }))
    ).not.toContain('aria-label="Add"')
  } finally {
    spy.mockRestore()
  }
})
it("retains authorized branch warehouse operations for a team manager", () => {
  const base = businessService.useBusinessContext()
  const spy = vi.spyOn(businessService, "useBusinessContext").mockReturnValue({
    ...base,
    org: { ...base.org!, canManage: false },
    team: { ...base.team!, actions: ["manage"] },
  })
  try {
    expect(
      render(createElement(BusinessWorkspace, { resource: "warehouse" }))
    ).toContain('aria-label="Add"')
  } finally {
    spy.mockRestore()
  }
})
it.each(Object.keys(businessEntities))(
  "renders the %s business module using installed Primitive",
  (resource) => {
    const html = render(createElement(BusinessWorkspace, { resource }))
    expect(html).toContain(
      businessEntities[resource].title.replaceAll("&", "&amp;")
    )
    expect(html).not.toContain("Unknown business module")
  }
)
it.each([
  "notification",
  "resource",
  "discovery",
  "media",
  "payment",
  "billing",
  "insight",
])("renders the %s platform integration screen", (domain) => {
  expect(render(createElement(BusinessServicePanel, { domain }))).not.toContain(
    "Unknown service"
  )
})
it("renders SSO organization management without app-local organization tables", () => {
  expect(render(createElement(OrganizationWorkspace, {}))).toContain(
    "Organization &amp; branch"
  )
})
