import "server-only"
import { rawGetOrganizationAuthority } from "@/services/organization"
import { rawCommerceRequest } from "@/services/commerce-client"
import {
  createSellerProductSchema,
  sellerProductQuerySchema,
} from "@/schemas/seller"
import { toMinorAmount } from "@/utils/marketplace"
import { MarketplaceError } from "@/lib/marketplace-error"
import type {
  CommerceMerchant,
  CommerceStore,
  CommerceCategory,
  CommerceWarehouse,
  CommercePage,
  StudioRow,
} from "@/utils/commerce-types"
interface SellerStore extends CommerceStore {
  slug: string
  currency: string
  sellerId: string
  status: string
}
export async function rawGetSellerContext(token: string) {
  const merchants = (
    await rawCommerceRequest<CommerceMerchant[]>("/merchant", { token })
  ).filter((m) => m.status === "active")
  const authority = await rawGetOrganizationAuthority(token)
  const stores: SellerStore[] = [],
    categories: CommerceCategory[] = [],
    warehouses: Array<CommerceWarehouse & { storeId: string }> = []
  for (const m of merchants) {
    const [ss, cc, ww] = await Promise.all([
      rawCommerceRequest<CommerceStore[]>("/merchant/" + m.id + "/store", {
        token,
      }),
      rawCommerceRequest<CommerceCategory[]>("/merchant/" + m.id + "/category", {
        token,
      }),
      authority.authorization_details.some(g => g.organization_id === m.sso_organization_id && g.actions.some(a => ["*", "manage", "inventory:read", "read"].includes(a)))
        ? rawCommerceRequest<CommerceWarehouse[]>(
            "/merchant/" + m.id + "/warehouse",
            { token }
          )
        : Promise.resolve([]),
    ])
    stores.push(
      ...ss
        .filter((s) => s.active)
        .map((s) => ({
          ...s,
          slug: s.code,
          currency: m.currency,
          sellerId: m.id,
          status: "active",
        }))
    )
    categories.push(...cc)
    warehouses.push(...ww.map((w) => ({ ...w, storeId: w.store_id })))
  }
  return { stores, categories, warehouses, brands: [] }
}
export async function rawListSellerProduct(token: string, raw: unknown) {
  const q = sellerProductQuerySchema.parse(raw)
  const result = await rawCommerceRequest<CommercePage<StudioRow>>(
    "/studio/product",
    {
      token,
      query: { limit: q.limit, offset: q.offset, q: q.query },
      raw: true,
    }
  )
  return {
    data: result.data.map((p) => ({
      id: p.id,
      title: p.name,
      slug: p.slug,
      status: p.status,
      storeName: p.detail ?? "",
      createdAt: p.createdAt,
      price: p.price,
      currency: p.currency,
    })),
    pagination: result.pagination,
  }
}
export async function rawCreateSellerProduct(token: string, raw: unknown) {
  const p = createSellerProductSchema.parse(raw),
    c = await rawGetSellerContext(token),
    store = c.stores.find((s) => s.id === p.storeId)
  if (!store) throw new MarketplaceError("store_not_found", 404)
  return rawCommerceRequest("/merchant/" + store.sellerId + "/product-draft", {
    token,
    method: "POST",
    body: {
      id: p.id,
      storeId: p.storeId,
      warehouseId: p.warehouseId,
      categoryId: p.categoryId,
      title: p.title,
      description: p.description,
      kind: p.kind,
      priceMinor: toMinorAmount(p.price, store.currency),
      sku: p.sku,
      stock: p.stock,
      status: p.status,
      mediaAssetIds: p.images,
    },
  })
}
