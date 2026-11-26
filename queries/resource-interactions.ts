"use client"
import { createAccountQueryService } from "@/utils/account-query"


import { createMutationService, defineMutation, defineQuery } from "@/utils/caller"

export interface MarketplaceResourceTarget {
  resourceId: string
  resourceType: "product" | "listing"
}

export interface MarketplaceResourceState {
  followed: { notificationLevel: string } | null
  subscribed: { notificationLevel: string } | null
  saves: Array<"bookmark" | "favorite">
  reaction: string | null
  rating: number | null
}

interface MarketplaceResourceStateInput extends MarketplaceResourceTarget {
  enabled: boolean
}

export const marketplaceResourceQueryKey = ["marketplace-resource"] as const

function resourcePath(action: string, resourceType: string) {
  return `/external/resource/${action}/${encodeURIComponent(resourceType)}`
}

const resourceStateService = defineQuery<
  MarketplaceResourceState,
  MarketplaceResourceStateInput
>({
  queryKey: ({ resourceId, resourceType }) =>
    [
      ...marketplaceResourceQueryKey,
      "state",
      resourceType,
      resourceId,
    ] as const,
  query: ({ resourceId, resourceType }) => ({
    url: resourcePath("state", resourceType),
    method: "GET",
    params: { id: resourceId },
  }),
  queryOptions: ({ resourceId, enabled }) => ({
    enabled: enabled && Boolean(resourceId),
    retry: false,
    staleTime: 15_000,
  }),
})

const bookmarkMutationService = defineMutation<unknown, MarketplaceResourceTarget>(
  {
    query: ({ resourceId, resourceType }) => ({
      url: resourcePath("bookmark", resourceType),
      method: "PUT",
      body: {},
      params: { id: resourceId, list: "bookmark" },
      toast: { error: (error) => error.message },
    }),
    invalidates: (_data, { resourceId, resourceType }) => [
      [...marketplaceResourceQueryKey, "state", resourceType, resourceId],
    ],
  }
)

const removeBookmarkMutationService = defineMutation<
  unknown,
  MarketplaceResourceTarget
>({
  query: ({ resourceId, resourceType }) => ({
    url: resourcePath("bookmark", resourceType),
    method: "DELETE",
    params: { id: resourceId, list: "bookmark" },
    toast: { error: (error) => error.message },
  }),
  invalidates: (_data, { resourceId, resourceType }) => [
    [...marketplaceResourceQueryKey, "state", resourceType, resourceId],
  ],
})

export const useMarketplaceResourceStateQuery =
  createAccountQueryService(resourceStateService)
export const useMarketplaceBookmarkMutation = createMutationService(
  bookmarkMutationService
)
export const useMarketplaceRemoveBookmarkMutation = createMutationService(
  removeBookmarkMutationService
)
