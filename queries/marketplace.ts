"use client"
import { createAccountQueryService } from "@/utils/account-query"


import {
  createMutationService,
  createQueryService,
  defineMutation,
  defineQuery,
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
} from "@/utils/marketplace-types"

export const catalogKey = ["marketplace", "catalog"] as const
export const cartKey = ["marketplace", "cart"] as const
export const addressKey = ["marketplace", "address"] as const
export const orderKey = ["marketplace", "order"] as const

export const useCatalogQuery = createQueryService(
  defineQuery<CatalogHome, undefined>({
    queryKey: catalogKey,
    query: { url: "/internal/marketplace/catalog", method: "GET", auth: false },
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
  defineQuery<ProductSummary[], ProductQuery>({
    queryKey: (input) => [...catalogKey, "product", input] as const,
    query: (input) => ({
      url: "/internal/marketplace/catalog/product",
      method: "GET",
      params: input,
      auth: false,
    }),
    queryOptions: { staleTime: 30_000 },
  })
)

export const useStoreProductQuery = createQueryService(
  defineQuery<ProductPage, ProductQuery>({
    queryKey: (input) => [...catalogKey, "store-product", input] as const,
    query: (input) => ({
      url: "/internal/marketplace/catalog/product",
      method: "GET",
      params: { ...input, limit: 24 },
      auth: false,
      unwrapData: false,
    }),
    queryOptions: { staleTime: 30_000 },
  })
)

export const useProductQuery = createQueryService(
  defineQuery<ProductDetail, string>({
    queryKey: (slug) => [...catalogKey, "product", slug] as const,
    query: (slug) => ({
      url: `/internal/marketplace/catalog/product/${encodeURIComponent(slug)}`,
      method: "GET",
      auth: false,
    }),
    queryOptions: (slug) => ({ enabled: Boolean(slug), staleTime: 30_000 }),
  })
)

export const useCategoryQuery = createQueryService(
  defineQuery<
    {
      category: CategorySummary
      children: CategorySummary[]
      products: ProductSummary[]
    },
    string
  >({
    queryKey: (slug) => [...catalogKey, "category", slug] as const,
    query: (slug) => ({
      url: `/internal/marketplace/catalog/category/${encodeURIComponent(slug)}`,
      method: "GET",
      auth: false,
    }),
    queryOptions: (slug) => ({ enabled: Boolean(slug), staleTime: 60_000 }),
  })
)

export const useStoreQuery = createQueryService(
  defineQuery<StoreDetail, string>({
    queryKey: (slug) => [...catalogKey, "store", slug] as const,
    query: (slug) => ({
      url: `/internal/marketplace/catalog/store/${encodeURIComponent(slug)}`,
      method: "GET",
      auth: false,
    }),
    queryOptions: (slug) => ({ enabled: Boolean(slug), staleTime: 30_000 }),
  })
)

export const useStoreListQuery = createQueryService(
  defineQuery<StoreSummary[], undefined>({
    queryKey: [...catalogKey, "store"] as const,
    query: { url: "/internal/marketplace/catalog/store", method: "GET", auth: false },
    queryOptions: { staleTime: 60_000 },
  })
)

export const useCartQuery = createAccountQueryService(
  defineQuery<Cart, boolean>({
    queryKey: cartKey,
    query: { url: "/internal/marketplace/cart", method: "GET" },
    queryOptions: (enabled) => ({ enabled, staleTime: 10_000, retry: false }),
  })
)

export const useAddCartItemMutation = createMutationService(
  defineMutation<Cart, { listingVariantId: string;storeId:string; quantity: number }>({
    query: (body) => ({
      url: "/internal/marketplace/cart/item",
      method: "POST",
      body,
      toast: { success: "Added to cart", error: (error) => error.message },
    }),
    invalidates: [cartKey],
  })
)

export const useUpdateCartItemMutation = createMutationService(
  defineMutation<Cart, { id: string; quantity: number }>({
    query: ({ id, quantity }) => ({
      url: `/internal/marketplace/cart/item/${id}`,
      method: "PATCH",
      body: { quantity },
      toast: { error: (error) => error.message },
    }),
    invalidates: [cartKey],
  })
)

export const useRemoveCartItemMutation = createMutationService(
  defineMutation<Cart, string>({
    query: (id) => ({
      url: `/internal/marketplace/cart/item/${id}`,
      method: "DELETE",
      toast: { success: "Removed from cart", error: (error) => error.message },
    }),
    invalidates: [cartKey],
  })
)

export const useAddressQuery = createAccountQueryService(
  defineQuery<Address[], boolean>({
    queryKey: addressKey,
    query: { url: "/internal/marketplace/address", method: "GET" },
    queryOptions: (enabled) => ({ enabled, retry: false }),
  })
)

export const useCreateAddressMutation = createMutationService(
  defineMutation<Address, AddressInput>({
    query: (body) => ({
      url: "/internal/marketplace/address",
      method: "POST",
      body,
      toast: { success: "Address saved", error: (error) => error.message },
    }),
    invalidates: [addressKey],
  })
)

export const useCheckoutMutation = createMutationService(
  defineMutation<
    OrderSummary,
    { shippingAddressId: string; expectedTotalMinor:number;version:number;idempotencyKey:string; note?: string }
  >({
    query: (body) => ({
      url: "/internal/marketplace/checkout",
      method: "POST",
      body,
      toast: { success: "Order placed", error: (error) => error.message },
    }),
    invalidates: [cartKey, orderKey],
  })
)

export const useOrderListQuery = createAccountQueryService(
  defineQuery<OrderSummary[], boolean>({
    queryKey: orderKey,
    query: { url: "/internal/marketplace/order", method: "GET" },
    queryOptions: (enabled) => ({ enabled, retry: false }),
  })
)

export const useOrderQuery = createAccountQueryService(
  defineQuery<OrderDetail, { id: string; enabled: boolean }>({
    queryKey: ({ id }) => [...orderKey, id] as const,
    query: ({ id }) => ({ url: `/internal/marketplace/order/${id}`, method: "GET" }),
    queryOptions: ({ id, enabled }) => ({
      enabled: enabled && Boolean(id),
      retry: false,
      refetchInterval: (query) => query.state.data?.status === "awaiting_payment" ? 5000 : false,
    }),
  })
)

export const useCancelOrderMutation = createMutationService(
  defineMutation<OrderDetail, { id: string; reason: string;version:number }>({
    query: ({ id, version,reason }) => ({
      url: `/internal/marketplace/order/${id}/cancel`,
      method: "POST",
      body: { version,reason },
      toast: { success: "Order cancelled", error: (error) => error.message },
    }),
    invalidates: (_data, { id }) => [orderKey, [...orderKey, id]],
  })
)
export const useQuoteMutation=createMutationService(defineMutation<{totalMinor:number;currency:string;version:number},{shippingAddressId:string}>({query:body=>({url:"/internal/marketplace/quote",method:"POST",body})}))
