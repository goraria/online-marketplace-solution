"use client"

import { EmptyState } from "@/components/marketplace/empty-state"
import { ProductCard } from "@/components/marketplace/product-card"
import { useCategoryQuery } from "@/services/marketplace"
import { Skeleton } from "@gorth/primitive/default/skeleton"

export function CategoryView({ slug }: { slug: string }) {
  const result = useCategoryQuery(slug)
  if (result.isPending)
    return <Skeleton className="min-h-[520px] rounded-3xl" />
  if (!result.data)
    return (
      <EmptyState
        title="Category unavailable"
        description="The category does not exist or is not published."
      />
    )
  return (
    <div className="space-y-7">
      <div className="rounded-3xl border bg-muted/30 p-8">
        <p className="text-sm font-medium text-primary">Category</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">
          {result.data.category.name}
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          {result.data.category.description ??
            "Browse products in this category."}
        </p>
      </div>
      {result.data.products.length ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {result.data.products.map((product) => (
            <ProductCard key={product.listingVariantId} product={product} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No products"
          description="There are no active listings in this category yet."
        />
      )}
    </div>
  )
}
