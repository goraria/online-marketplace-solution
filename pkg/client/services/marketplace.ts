"use client"

/* eslint-disable react-hooks/rules-of-hooks -- Service definitions build hooks without executing them. */

import {
  createMutationService,
  createQueryService,
  useMutation,
  useQuery,
} from "@/utils/caller"
import type {
  Address,
  AddressInput,
  Cart,
  CatalogHome,
  CategorySummary,
  OrderDetail,
  OrderSummary,
  ProductDetail,
  ProductSummary,
  StoreDetail,
  StoreSummary,
} from "@/lib/marketplace/types"

export const catalogKey = ["marketplace", "catalog"] as const
export const cartKey = ["marketplace", "cart"] as const
export const addressKey = ["marketplace", "address"] as const
export const orderKey = ["marketplace", "order"] as const

export const useCatalogQuery = createQueryService(
  useQuery<CatalogHome, undefined>({
    queryKey: catalogKey,
    query: { url: "/catalog", method: "GET", auth: false },
    queryOptions: { staleTime: 60_000 },
  })
)

export interface ProductQuery {
  [key: string]: string | number | undefined
  query?: string
  category?: string
  store?: string
  sort?: "newest" | "popular" | "price_asc" | "price_desc"
  minPrice?: number
  maxPrice?: number
  limit?: number
  offset?: number
}

export interface ProductPage {
  data: ProductSummary[]
  pagination: {
    limit: number
    offset: number
    returned: number
    total: number
    hasMore: boolean
  }
}

export const useProductListQuery = createQueryService(
  useQuery<ProductSummary[], ProductQuery>({
    queryKey: (input) => [...catalogKey, "product", input] as const,
    query: (input) => ({
      url: "/catalog/product",
      method: "GET",
      params: input,
      auth: false,
    }),
    queryOptions: { staleTime: 30_000 },
  })
)

export const useStoreProductQuery = createQueryService(
  useQuery<ProductPage, ProductQuery>({
    queryKey: (input) => [...catalogKey, "store-product", input] as const,
    query: (input) => ({
      url: "/catalog/product",
      method: "GET",
      params: { ...input, limit: 24 },
      auth: false,
      unwrapData: false,
    }),
    queryOptions: { staleTime: 30_000 },
  })
)

export const useProductQuery = createQueryService(
  useQuery<ProductDetail, string>({
    queryKey: (slug) => [...catalogKey, "product", slug] as const,
    query: (slug) => ({
      url: `/catalog/product/${encodeURIComponent(slug)}`,
      method: "GET",
      auth: false,
    }),
    queryOptions: (slug) => ({ enabled: Boolean(slug), staleTime: 30_000 }),
  })
)

export const useCategoryQuery = createQueryService(
  useQuery<
    {
      category: CategorySummary
      children: CategorySummary[]
      products: ProductSummary[]
    },
    string
  >({
    queryKey: (slug) => [...catalogKey, "category", slug] as const,
    query: (slug) => ({
      url: `/catalog/category/${encodeURIComponent(slug)}`,
      method: "GET",
      auth: false,
    }),
    queryOptions: (slug) => ({ enabled: Boolean(slug), staleTime: 60_000 }),
  })
)

export const useStoreQuery = createQueryService(
  useQuery<StoreDetail, string>({
    queryKey: (slug) => [...catalogKey, "store", slug] as const,
    query: (slug) => ({
      url: `/catalog/store/${encodeURIComponent(slug)}`,
      method: "GET",
      auth: false,
    }),
    queryOptions: (slug) => ({ enabled: Boolean(slug), staleTime: 30_000 }),
  })
)

export const useStoreListQuery = createQueryService(
  useQuery<StoreSummary[], undefined>({
    queryKey: [...catalogKey, "store"] as const,
    query: { url: "/catalog/store", method: "GET", auth: false },
    queryOptions: { staleTime: 60_000 },
  })
)

export const useCartQuery = createQueryService(
  useQuery<Cart, boolean>({
    queryKey: cartKey,
    query: { url: "/cart", method: "GET" },
    queryOptions: (enabled) => ({ enabled, staleTime: 10_000, retry: false }),
  })
)

export const useAddCartItemMutation = createMutationService(
  useMutation<Cart, { listingVariantId: string; quantity: number }>({
    query: (body) => ({
      url: "/cart/item",
      method: "POST",
      body,
      toast: { success: "Added to cart", error: (error) => error.message },
    }),
    invalidates: [cartKey],
  })
)

export const useUpdateCartItemMutation = createMutationService(
  useMutation<Cart, { id: string; quantity: number }>({
    query: ({ id, quantity }) => ({
      url: `/cart/item/${id}`,
      method: "PATCH",
      body: { quantity },
      toast: { error: (error) => error.message },
    }),
    invalidates: [cartKey],
  })
)

export const useRemoveCartItemMutation = createMutationService(
  useMutation<Cart, string>({
    query: (id) => ({
      url: `/cart/item/${id}`,
      method: "DELETE",
      toast: { success: "Removed from cart", error: (error) => error.message },
    }),
    invalidates: [cartKey],
  })
)

export const useAddressQuery = createQueryService(
  useQuery<Address[], boolean>({
    queryKey: addressKey,
    query: { url: "/address", method: "GET" },
    queryOptions: (enabled) => ({ enabled, retry: false }),
  })
)

export const useCreateAddressMutation = createMutationService(
  useMutation<Address, AddressInput>({
    query: (body) => ({
      url: "/address",
      method: "POST",
      body,
      toast: { success: "Address saved", error: (error) => error.message },
    }),
    invalidates: [addressKey],
  })
)

export const useCheckoutMutation = createMutationService(
  useMutation<
    OrderDetail,
    { shippingAddressId: string; billingAddressId?: string; note?: string }
  >({
    query: (body) => ({
      url: "/checkout",
      method: "POST",
      body,
      toast: { success: "Order placed", error: (error) => error.message },
    }),
    invalidates: [cartKey, orderKey],
  })
)

export const useOrderListQuery = createQueryService(
  useQuery<OrderSummary[], boolean>({
    queryKey: orderKey,
    query: { url: "/order", method: "GET" },
    queryOptions: (enabled) => ({ enabled, retry: false }),
  })
)

export const useOrderQuery = createQueryService(
  useQuery<OrderDetail, { id: string; enabled: boolean }>({
    queryKey: ({ id }) => [...orderKey, id] as const,
    query: ({ id }) => ({ url: `/order/${id}`, method: "GET" }),
    queryOptions: ({ id, enabled }) => ({
      enabled: enabled && Boolean(id),
      retry: false,
    }),
  })
)

export const useCancelOrderMutation = createMutationService(
  useMutation<OrderDetail, { id: string; reason: string }>({
    query: ({ id, reason }) => ({
      url: `/order/${id}/cancel`,
      method: "POST",
      body: { reason },
      toast: { success: "Order cancelled", error: (error) => error.message },
    }),
    invalidates: (_data, { id }) => [orderKey, [...orderKey, id]],
  })
)
