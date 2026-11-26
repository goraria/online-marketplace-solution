"use client"

import { useRouter } from "next/navigation"
import { useMemo } from "react"

import { ChevronLeft, ChevronRight, Search } from "@gorth/primitive/cores/lucide"
import { Button } from "@gorth/primitive/custom/button"
import { Input } from "@gorth/primitive/default/input"
import { NativeSelect, NativeSelectOption } from "@gorth/primitive/default/native-select"
import { Skeleton } from "@gorth/primitive/default/skeleton"

import { EmptyState } from "@/components/marketplace/empty-state"
import { ProductCard } from "@/components/marketplace/product-card"
import type { DemoProduct } from "@/lib/marketplace/demo"
import type { StoreDetail } from "@/lib/marketplace/types"
import { useStoreProductQuery, type ProductQuery } from "@/services/marketplace"
import type { StoreViewProps } from "@/features/marketplace/store"

interface StoreProductsProps extends StoreViewProps {
  store: StoreDetail
  categories: readonly { slug: string; name: string }[]
  demoProducts: DemoProduct[]
}

function sortedDemoProducts(products: DemoProduct[], sort: NonNullable<ProductQuery["sort"]>) {
  return [...products].sort((a, b) => {
    if (sort === "price_asc") return a.price - b.price
    if (sort === "price_desc") return b.price - a.price
    if (sort === "popular") return b.popularity - a.popularity
    return b.id.localeCompare(a.id, undefined, { numeric: true })
  })
}

export function StoreProducts({ store, categories, demoProducts, slug, category, page, sort, query, minPrice, maxPrice }: StoreProductsProps) {
  const router = useRouter()
  const products = useStoreProductQuery({
    store: slug, category, sort, query, minPrice, maxPrice,
    limit: 24, offset: (page - 1) * 24,
  })
  const showDemo = Boolean(store.isDemo && store.productCount === 0 && !products.error && products.data?.pagination.total === 0)
  const demoFiltered = useMemo(() => {
    if (!showDemo) return []
    return sortedDemoProducts(demoProducts.filter((product) =>
      (!category || product.demoCategory === category) &&
      (!query || product.title.toLowerCase().includes(query.toLowerCase())) &&
      (minPrice === undefined || product.price >= minPrice) &&
      (maxPrice === undefined || product.price <= maxPrice)
    ), sort)
  }, [category, demoProducts, maxPrice, minPrice, query, showDemo, sort])

  const rows = showDemo ? demoFiltered.slice((page - 1) * 24, page * 24) : products.data?.data ?? []
  const total = showDemo ? demoFiltered.length : products.data?.pagination.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / 24))

  function navigate(overrides: Partial<StoreViewProps>) {
    const values = { category, page, sort, query, minPrice, maxPrice, ...overrides }
    const params = new URLSearchParams({ shop: slug, tab: "product" })
    if (values.category) params.set("category", values.category)
    if (values.sort !== "popular") params.set("sort", values.sort)
    if (values.query) params.set("query", values.query)
    if (values.minPrice !== undefined) params.set("minPrice", String(values.minPrice))
    if (values.maxPrice !== undefined) params.set("maxPrice", String(values.maxPrice))
    if (values.page > 1) params.set("page", String(values.page))
    router.push(`/store?${params}`)
  }

  return <div className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><h2 className="text-xl font-semibold">All products</h2><p className="text-sm text-muted-foreground">{total} items{showDemo ? " · demo previews, not for sale" : ""}</p></div>
      <div className="flex flex-wrap gap-2">
        <NativeSelect aria-label="Category" value={category ?? ""} onChange={(event) => navigate({ category: event.target.value || undefined, page: 1 })}>
          <NativeSelectOption value="">All categories</NativeSelectOption>
          {categories.map((item) => <NativeSelectOption key={item.slug} value={item.slug}>{item.name}</NativeSelectOption>)}
        </NativeSelect>
        <NativeSelect aria-label="Sort products" value={sort} onChange={(event) => navigate({ sort: event.target.value as StoreViewProps["sort"], page: 1 })}>
          <NativeSelectOption value="popular">Most popular</NativeSelectOption>
          <NativeSelectOption value="newest">Newest</NativeSelectOption>
          <NativeSelectOption value="price_asc">Price: low to high</NativeSelectOption>
          <NativeSelectOption value="price_desc">Price: high to low</NativeSelectOption>
        </NativeSelect>
      </div>
    </div>
    <form className="flex flex-wrap items-end gap-2" onSubmit={(event) => {
      event.preventDefault()
      const data = new FormData(event.currentTarget)
      const text = String(data.get("query") ?? "").trim()
      const min = String(data.get("minPrice") ?? "")
      const max = String(data.get("maxPrice") ?? "")
      navigate({ query: text || undefined, minPrice: min ? Number(min) : undefined, maxPrice: max ? Number(max) : undefined, page: 1 })
    }}>
      <Input key={`${query ?? ""}-search`} name="query" defaultValue={query ?? ""} placeholder="Search this store" aria-label="Search this store" className="min-w-44 flex-1" />
      <Input key={`${minPrice ?? ""}-min`} name="minPrice" type="number" min="0" defaultValue={minPrice} placeholder="Min price" aria-label="Minimum price" className="w-32" />
      <Input key={`${maxPrice ?? ""}-max`} name="maxPrice" type="number" min="0" defaultValue={maxPrice} placeholder="Max price" aria-label="Maximum price" className="w-32" />
      <Button type="submit"><Search className="size-4" /> Apply filters</Button>
    </form>
    {products.isPending ? <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <Skeleton key={index} className="aspect-[3/4] rounded-xl" />)}</div>
      : products.error ? <p role="alert" className="text-sm text-destructive">Could not load this store&apos;s products.</p>
      : rows.length ? <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">{rows.map((product) => <ProductCard key={product.listingVariantId} product={product} demo={showDemo} />)}</div>
      : <EmptyState title="No products found" description="Try another category, keyword, or price range." />}
    {total > 0 && <nav aria-label="Product pages" className="flex items-center justify-center gap-3 pt-3">
      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => navigate({ page: page - 1 })}><ChevronLeft className="size-4" />Previous</Button>
      <span className="text-sm text-muted-foreground">Page {page} of {pageCount}</span>
      <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => navigate({ page: page + 1 })}>Next<ChevronRight className="size-4" /></Button>
    </nav>}
  </div>
}
