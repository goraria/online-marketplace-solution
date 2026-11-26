"use client"

/* eslint-disable react-hooks/rules-of-hooks -- Service definitions configure caller hooks at module scope. */

import { createQueryService, useQuery } from "@/utils/caller"
import type { AdminResource } from "@/lib/marketplace/admin"

export interface AdminRow {
  id: string
  name: string
  slug: string
  status: string
  detail: string | null
  itemCount: number
  price: number | null
  currency: string | null
  createdAt: string
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

export const useAdminListQuery = createQueryService(
  useQuery<AdminListResponse, AdminListInput>({
    queryKey: ({ resource, limit, offset, query }) =>
      ["admin", resource, limit, offset, query] as const,
    query: ({ resource, limit, offset, query }) => ({
      url: `/admin/${resource}`,
      method: "GET",
      params: { limit, offset, query },
      unwrapData: false,
    }),
    queryOptions: { staleTime: 10_000, retry: false },
  })
)
