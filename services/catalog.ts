import "server-only"
import { rawCommerceRequest } from "@/services/commerce-client"
import type {
  CatalogHome,
  CategorySummary,
  ProductDetail,
  ProductSummary,
  StoreDetail,
  StoreSummary,
} from "@/utils/marketplace-types"
import type { CommercePage } from "@/utils/commerce-types"
export async function rawListCategory(parent?: string | null) {
  const data = await rawCommerceRequest<CategorySummary[]>("/storefront/category")
  return parent ? data.filter((c) => c.parentId === parent) : data
}
export async function rawListProduct(query: unknown) {
  return rawCommerceRequest<CommercePage<ProductSummary>>("/storefront/product", {
    query,
    raw: true,
  })
}
export async function rawGetCatalog() {
  return rawCommerceRequest<CatalogHome>("/storefront/catalog")
}
export async function rawGetCategory(id: string) {
  return rawCommerceRequest<
    (CategorySummary & { products: ProductSummary[] }) | null
  >("/storefront/category/" + encodeURIComponent(id))
}
export async function rawGetProduct(id: string) {
  return rawCommerceRequest<ProductDetail>(
    "/storefront/product/" + encodeURIComponent(id)
  )
}
export async function rawGetStore(id: string) {
  return rawCommerceRequest<StoreDetail>(
    "/storefront/store/" + encodeURIComponent(id)
  )
}
export async function rawListStore() {
  return rawCommerceRequest<StoreSummary[]>("/storefront/store")
}
