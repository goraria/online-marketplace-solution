import { StoreView } from "@/features/marketplace/store"
import { StoreDirectory } from "@/features/marketplace/store-directory"
import type { ProductQuery } from "@/queries/marketplace"

interface StoreSearchParams {
  shop?: string
  tab?: string
  category?: string
  page?: string
  sort?: string
  query?: string
  minPrice?: string
  maxPrice?: string
}

export default async function StorePage({
  searchParams,
}: {
  searchParams: Promise<StoreSearchParams>
}) {
  const params = await searchParams
  const slug = params.shop?.trim()
  if (!slug) return <StoreDirectory />

  const page = Number.parseInt(params.page ?? "1", 10)
  const sort: NonNullable<ProductQuery["sort"]> = [
    "newest",
    "popular",
    "price_asc",
    "price_desc",
  ].includes(params.sort ?? "")
    ? (params.sort as NonNullable<ProductQuery["sort"]>)
    : "popular"
  const tab =
    params.tab === "review" || params.tab === "product" || params.tab === "home"
      ? params.tab
      : params.category
        ? "product"
        : "home"
  const minPrice =
    params.minPrice === undefined ? undefined : Number(params.minPrice)
  const maxPrice =
    params.maxPrice === undefined ? undefined : Number(params.maxPrice)

  return (
    <StoreView
      slug={slug}
      tab={tab}
      category={params.category || undefined}
      page={Number.isFinite(page) && page > 0 ? page : 1}
      sort={sort}
      query={params.query || undefined}
      minPrice={
        Number.isFinite(minPrice) && minPrice! >= 0 ? minPrice : undefined
      }
      maxPrice={
        Number.isFinite(maxPrice) && maxPrice! >= 0 ? maxPrice : undefined
      }
    />
  )
}
