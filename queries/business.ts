"use client"
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@gorth-com/primitive/cores/tanstack/query"
import { caller } from "@/utils/caller"
import { useAuth } from "@/hooks/use-auth"
import { useOrganizationContext } from "@/queries/organization"
export interface BusinessRow {
  [key: string]: unknown
  id?: string
}
export function useBusinessQuery<T>(
  url: string,
  params: Record<string, unknown> = {},
  enabled = true,
  raw = false
) {
  const auth = useAuth()
  return useQuery<T>({
    queryKey: ["business", auth.account?.id, url, params],
    queryFn: () => caller({ url, params, auth: true, unwrapData: !raw }),
    enabled: auth.authenticated && enabled,
    retry: false,
    staleTime: 0,
  })
}
export function useBusinessMutation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (p: {
      url: string
      method?: "POST" | "PUT" | "PATCH" | "DELETE"
      body?: unknown
    }) => caller({ ...p, method: p.method ?? "POST", auth: true }),
    onSuccess: async (_data, input) => {
      // Client activity is telemetry, never an authoritative audit trail.
      if (input.url.startsWith("/external/commerce/"))
        await caller({
          url: "/external/insight/event",
          method: "POST",
          auth: true,
          body: {
            name: "commerce.operation.completed",
            idempotencyKey: crypto.randomUUID(),
            resourceType: "commerce",
            properties: { method: input.method ?? "POST" },
          },
        }).catch(() => undefined)
      await Promise.all([
        client.invalidateQueries({ queryKey: ["business"] }),
        client.invalidateQueries({ queryKey: ["seller"] }),
        client.invalidateQueries({ queryKey: ["restaurant-domain"] }),
        client.invalidateQueries({ queryKey: ["organization-context"] }),
      ])
    },
  })
}
export function useBusinessContext() {
  const context = useOrganizationContext()
  const org = context.data?.organizations.find(
    (o) => o.id === context.data?.selected.organizationId
  )
  const team = org?.teams.find((t) => t.id === context.data?.selected.teamId)
  const merchants = useBusinessQuery<
    Array<{
      id: string
      sso_organization_id: string
      name: string
      currency: string
    }>
  >("/external/commerce/merchant", { organizationId: org?.id }, !!org)
  const merchant = merchants.data?.find(
    (m) => m.sso_organization_id === org?.id
  )
  const stores = useBusinessQuery<
    Array<{
      id: string
      sso_team_id: string
      name: string
      business_kind: string
    }>
  >(
    "/external/commerce/merchant/" + merchant?.id + "/store",
    { limit: 100, teamId: team?.id },
    !!merchant
  )
  const store = stores.data?.find((s) => s.sso_team_id === team?.id)
  return {
    org,
    team,
    merchant,
    store,
    merchantId: merchant?.id ?? "",
    storeId: store?.id ?? "",
    stores: stores.data ?? [],
    error: context.error ?? merchants.error ?? stores.error,
    loading: context.isLoading || merchants.isFetching || stores.isFetching,
  }
}
