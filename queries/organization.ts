"use client"
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@gorth-com/primitive/cores/tanstack/query"
import { caller } from "@/utils/caller"
import { useAuth } from "@/hooks/use-auth"
import type { OrganizationContext } from "@/schemas/organization"
export type { OrganizationContext }
export function useOrganizationContext() {
  const auth = useAuth()
  return useQuery<OrganizationContext>({
    queryKey: ["organization-context", auth.account?.id],
    queryFn: () => caller({ url: "/internal/marketplace/context", auth: true }),
    enabled: auth.authenticated,
    staleTime: 0,
    refetchOnWindowFocus: true,
    retry: false,
  })
}
export function useOrganizationQuery<T>(
  operation: string,
  params: Record<string, unknown> = {},
  enabled = true
) {
  const auth = useAuth()
  return useQuery<T>({
    queryKey: ["organization", auth.account?.id, operation, params],
    queryFn: () =>
      caller({
        url: "/internal/marketplace/organization/" + operation,
        params,
        auth: true,
      }),
    enabled: auth.authenticated && enabled,
    retry: false,
    staleTime: 0,
  })
}
export function useOrganizationMutation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (p: { operation: string; body: unknown }) =>
      caller({
        url:
          p.operation === "context"
            ? "/internal/marketplace/context"
            : "/internal/marketplace/organization/" + p.operation,
        method: p.operation === "context" ? "PUT" : "POST",
        body: p.body,
        auth: true,
        toast: { error: (e) => e.message },
      }),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["organization"] }),
        client.invalidateQueries({ queryKey: ["organization-context"] }),
        client.invalidateQueries({ queryKey: ["business"] }),
        client.invalidateQueries({ queryKey: ["restaurant-domain"] }),
        client.invalidateQueries({ queryKey: ["seller"] }),
      ])
    },
  })
}
