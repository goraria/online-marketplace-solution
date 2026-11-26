"use client"
import { createAccountQueryService } from "@/utils/account-query"


import { createMutationService, defineMutation, defineQuery } from "@/utils/caller"

export interface SellerStore {
  id: string
  name: string
  slug: string
  status: "active" | "draft"
  currency: string
  sellerId: string
}

export interface SellerOption {
  id: string
  name: string
}
export interface SellerWarehouse extends SellerOption {
  storeId: string
}

export interface SellerContext {
  stores: SellerStore[]
  categories: SellerOption[]
  brands: SellerOption[]
  warehouses: SellerWarehouse[]
}

export interface CreateSellerProductInput {
  id: string
  storeId: string
  warehouseId: string | null
  categoryId: string
  brandId: string | null
  title: string
  description: string
  kind: "physical" | "digital" | "service"
  price: number
  sku: string
  stock: number
  status: "draft" | "active"
  images: string[]
}

export interface SellerProduct {
  id: string
  title: string
  slug: string
  status: string
  storeName: string
  price: number|null
  currency: string
  createdAt: string|null
}

export interface SellerProductList {
  data: SellerProduct[]
  pagination: { limit: number; offset: number; total: number }
}

const sellerProductKey = ["seller", "product"] as const

export const useSellerContextQuery = createAccountQueryService(
  defineQuery<SellerContext, undefined>({
    queryKey: ["seller", "context"],
    query: { url: "/internal/marketplace/seller/context", method: "GET" },
    queryOptions: { staleTime: 60_000, retry: false },
  })
)

export const useSellerProductQuery = createAccountQueryService(
  defineQuery<SellerProductList, { limit: number; offset: number; query: string }>(
    {
      queryKey: ({ limit, offset, query }) =>
        [...sellerProductKey, limit, offset, query] as const,
      query: ({ limit, offset, query }) => ({
        url: "/internal/marketplace/seller/product",
        method: "GET",
        params: { limit, offset, query },
        unwrapData: false,
      }),
      queryOptions: { staleTime: 10_000, retry: false },
    }
  )
)

export const useCreateSellerProductMutation = createMutationService(
  defineMutation<
    { id: string; slug: string; status: string; listingId: string },
    CreateSellerProductInput
  >({
    query: (body) => ({
      url: "/internal/marketplace/seller/product",
      method: "POST",
      body,
      toast: { success: "Product saved", error: (error) => error.message },
    }),
    invalidates: [sellerProductKey, ["marketplace", "catalog"]],
  })
)
