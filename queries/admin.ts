"use client"
import { createAccountQueryService } from "@/utils/account-query"


import type { AdminResource } from "@/lib/marketplace/admin"
import { defineQuery } from "@/utils/caller"

export interface AdminRow {
  id: string
  name: string
  slug: string
  status: string
  detail: string | null
  itemCount: number
  price: number | null
  currency: string | null
  createdAt: string|null
}

export interface AdminListInput {
  resource: AdminResource
  limit: number
  offset: number
  query: string
}

export interface AdminListResponse {
  data: AdminRow[]
  pagination: { limit: number; offset: number; total: number }
}

export const useAdminListQuery = createAccountQueryService(
  defineQuery<AdminListResponse, AdminListInput>({
    queryKey: ({ resource, limit, offset, query }) =>
      ["admin", resource, limit, offset, query] as const,
    query: ({ resource, limit, offset, query }) => ({
      url: `/internal/marketplace/admin/${resource}`,
      method: "GET",
      params: { limit, offset, query },
      unwrapData: false,
    }),
    queryOptions: { staleTime: 10_000, retry: false },
  })
)
