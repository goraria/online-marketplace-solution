"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo } from "react"

import { ChevronRight, Package } from "@gorth-com/primitive/cores/lucide"
import { Button } from "@gorth-com/primitive/custom/button"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@gorth-com/primitive/custom/tabs"
import { Skeleton } from "@gorth-com/primitive/default/skeleton"

import { EmptyState } from "@/components/marketplace/empty-state"
import { ProductCard } from "@/components/marketplace/product-card"
import { demoStoreCategories, demoStoreProducts } from "@/lib/marketplace/demo"
import { useStoreQuery, type ProductQuery } from "@/queries/marketplace"
import { StoreHeader } from "@/features/marketplace/store-header"
import { StoreProducts } from "@/features/marketplace/store-products"
import { StoreReviews } from "@/features/marketplace/store-reviews"

export type StoreTab = "home" | "product" | "review"

export interface StoreViewProps {
  slug: string
  tab: StoreTab
  category?: string
  page: number
  sort: NonNullable<ProductQuery["sort"]>
  query?: string
  minPrice?: number
  maxPrice?: number
}

export function StoreView(props: StoreViewProps) {
  const { slug, tab } = props
  const router = useRouter()
  const result = useStoreQuery(slug)
  const store = result.data
  const demoProducts = useMemo(
    () => demoStoreProducts(slug, store?.name ?? slug),
    [slug, store?.name]
  )

  if (result.isPending)
    return <Skeleton className="min-h-[520px] rounded-3xl" />
  if (result.error || !store)
    return (
      <EmptyState
        title="Store unavailable"
        description="This storefront is not active or could not be found."
      />
    )

  const categories = store.categories.length
    ? store.categories.map(({ slug: categorySlug, name }) => ({
        slug: categorySlug,
        name,
      }))
    : store.isDemo
      ? demoStoreCategories
      : []
  const recommended = store.products.length
    ? store.products
    : store.isDemo
      ? demoProducts.slice(0, 8)
      : []

  return (
    <div className="space-y-7">
      <StoreHeader store={store} />
      <Tabs
        value={tab}
        onValueChange={(value) =>
          router.push(
            `/store?shop=${encodeURIComponent(slug)}${value === "home" ? "" : `&tab=${value}`}`
          )
        }
        className="w-full"
      >
        <div className="overflow-x-auto">
          <TabsList className="w-max justify-start">
            <TabsTrigger value="home">Home</TabsTrigger>
            <TabsTrigger value="product">All products</TabsTrigger>
            <TabsTrigger value="review">Rating &amp; review</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="home" className="space-y-9 pt-5">
          <section>
            <h2 className="mb-4 text-xl font-semibold">Shop by category</h2>
            {categories.length ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {categories.map((item) => (
                  <Link
                    key={item.slug}
                    href={`/store?shop=${encodeURIComponent(slug)}&category=${encodeURIComponent(item.slug)}`}
                    className="rounded-xl border bg-card p-5 transition hover:border-primary/60 hover:bg-primary/5"
                  >
                    <Package className="mb-4 size-6 text-primary" />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Categories will appear after products are published.
              </p>
            )}
          </section>
          <section>
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <p className="text-sm text-primary">From this store</p>
                <h2 className="text-xl font-semibold">Recommended products</h2>
              </div>
              <Button
                nativeButton={false}
                variant="ghost"
                render={
                  <Link
                    href={`/store?shop=${encodeURIComponent(slug)}&tab=product`}
                  />
                }
              >
                View all <ChevronRight className="size-4" />
              </Button>
            </div>
            {recommended.length ? (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                {recommended.map((product) => (
                  <ProductCard
                    key={product.listingVariantId}
                    product={product}
                    demo={store.isDemo && store.productCount === 0}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No products yet"
                description="Published products will appear here."
              />
            )}
          </section>
        </TabsContent>

        <TabsContent value="product" className="pt-5">
          <StoreProducts
            store={store}
            categories={categories}
            demoProducts={demoProducts}
            {...props}
          />
        </TabsContent>
        <TabsContent value="review" className="pt-5">
          <StoreReviews store={store} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
