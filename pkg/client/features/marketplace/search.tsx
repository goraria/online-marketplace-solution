"use client"

import { useRouter } from "next/navigation"
import { SlidersHorizontal } from "@gorth/primitive/cores/lucide"
import {
  NativeSelect,
  NativeSelectOption,
} from "@gorth/primitive/default/native-select"
import { Skeleton } from "@gorth/primitive/default/skeleton"

import { EmptyState } from "@/components/marketplace/empty-state"
import { ProductCard } from "@/components/marketplace/product-card"
import { useProductListQuery, type ProductQuery } from "@/services/marketplace"

export function ProductSearch({ input }: { input: ProductQuery }) {
  const router = useRouter()
  const products = useProductListQuery(input)

  function changeSort(sort: ProductQuery["sort"]) {
    const params = new URLSearchParams()
    if (input.query) params.set("query", input.query)
    if (input.category) params.set("category", input.category)
    if (sort) params.set("sort", sort)
    router.push(`/search?${params}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-muted-foreground">Marketplace search</p>
          <h1 className="text-3xl font-semibold tracking-tight">
            {input.query ? `Results for “${input.query}”` : "All products"}
          </h1>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <SlidersHorizontal className="size-4" />
          <NativeSelect
            value={input.sort ?? "newest"}
            onChange={(event) =>
              changeSort(event.target.value as ProductQuery["sort"])
            }
          >
            <NativeSelectOption value="newest">Newest</NativeSelectOption>
            <NativeSelectOption value="price_asc">
              Price: low to high
            </NativeSelectOption>
            <NativeSelectOption value="price_desc">
              Price: high to low
            </NativeSelectOption>
          </NativeSelect>
        </label>
      </div>
      {products.isPending ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="aspect-[3/4] rounded-2xl" />
          ))}
        </div>
      ) : products.data?.length ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {products.data.map((product) => (
            <ProductCard key={product.listingVariantId} product={product} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Nothing matched your search"
          description="Try another keyword or browse a different category."
        />
      )}
    </div>
  )
}
