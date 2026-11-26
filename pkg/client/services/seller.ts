"use client"

/* eslint-disable react-hooks/rules-of-hooks -- Service definitions configure caller hooks at module scope. */

import {
  createMutationService,
  createQueryService,
  useMutation,
  useQuery,
} from "@/utils/caller"

export interface SellerStore {
  id: string
  name: string
  slug: string
  status: "active" | "draft"
  currency: string
  sellerId: string
}

export interface SellerOption { id: string; name: string }
export interface SellerWarehouse extends SellerOption { storeId: string }

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
  price: number
  currency: string
  createdAt: string
}

export interface SellerProductList {
  data: SellerProduct[]
  pagination: { limit: number; offset: number; total: number }
}

const sellerProductKey = ["seller", "product"] as const

export const useSellerContextQuery = createQueryService(
  useQuery<SellerContext, undefined>({
    queryKey: ["seller", "context"],
    query: { url: "/seller/context", method: "GET" },
    queryOptions: { staleTime: 60_000, retry: false },
  })
)

export const useSellerProductQuery = createQueryService(
  useQuery<SellerProductList, { limit: number; offset: number; query: string }>({
    queryKey: ({ limit, offset, query }) => [...sellerProductKey, limit, offset, query] as const,
    query: ({ limit, offset, query }) => ({
      url: "/seller/product",
      method: "GET",
      params: { limit, offset, query },
      unwrapData: false,
    }),
    queryOptions: { staleTime: 10_000, retry: false },
  })
)

export const useCreateSellerProductMutation = createMutationService(
  useMutation<{ id: string; slug: string; status: string; listingId: string }, CreateSellerProductInput>({
    query: (body) => ({
      url: "/seller/product",
      method: "POST",
      body,
      toast: { success: "Product saved", error: (error) => error.message },
    }),
    invalidates: [sellerProductKey, ["marketplace", "catalog"]],
  })
)
