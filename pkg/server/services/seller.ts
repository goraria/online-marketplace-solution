import { and, asc, count, desc, eq, ilike, inArray, isNull, or } from "drizzle-orm"

import { database } from "@/database"
import {
  brandsTable,
  categoriesTable,
  inventoryBalancesTable,
  listingVariantsTable,
  listingsTable,
  productCategoriesTable,
  productMediaReferencesTable,
  productsTable,
  productVariantsTable,
  sellerMembersTable,
  sellersTable,
  storesTable,
  userTable,
  warehousesTable,
} from "@/database/schema"
import { MarketplaceError } from "@/lib/marketplace-error"
import { mediaStorageServerUrl } from "@/utils/environment"
import {
  createSellerProductSchema,
  sellerProductQuerySchema,
  type CreateSellerProductInput,
} from "@/schemas/seller"

const catalogRoles = ["owner", "admin", "catalog"] as const

function productSlug(title: string, id: string) {
  const base = title.toLowerCase().normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 190)
  return `${base || "product"}-${id.slice(0, 12)}`
}

export async function getSellerContext(externalUserId: string) {
  const [actor] = await database.select({
    id: userTable.id,
    status: userTable.status,
  }).from(userTable).where(eq(userTable.externalUserId, externalUserId)).limit(1)

  if (!actor || actor.status !== "active") {
    throw new MarketplaceError("seller_user_not_active", 403)
  }

  const stores = await database.select({
    id: storesTable.id,
    name: storesTable.name,
    slug: storesTable.slug,
    status: storesTable.status,
    currency: storesTable.defaultCurrency,
    sellerId: sellersTable.id,
  }).from(storesTable)
    .innerJoin(sellersTable, eq(sellersTable.id, storesTable.sellerId))
    .leftJoin(sellerMembersTable, and(
      eq(sellerMembersTable.sellerId, sellersTable.id),
      eq(sellerMembersTable.userId, actor.id),
      eq(sellerMembersTable.isActive, true),
    ))
    .where(and(
      or(
        eq(sellersTable.ownerUserId, actor.id),
        inArray(sellerMembersTable.role, catalogRoles),
      ),
      eq(sellersTable.status, "active"),
      inArray(storesTable.status, ["active", "draft"]),
      isNull(sellersTable.deletedAt),
      isNull(storesTable.deletedAt),
    ))
    .orderBy(asc(storesTable.name))

  const [categories, brands, warehouses] = await Promise.all([
    database.select({ id: categoriesTable.id, name: categoriesTable.name })
      .from(categoriesTable)
      .where(and(eq(categoriesTable.isActive, true), eq(categoriesTable.isLeaf, true)))
      .orderBy(asc(categoriesTable.name)),
    database.select({ id: brandsTable.id, name: brandsTable.name })
      .from(brandsTable).where(isNull(brandsTable.deletedAt))
      .orderBy(asc(brandsTable.name)),
    stores.length
      ? database.select({
          id: warehousesTable.id,
          name: warehousesTable.name,
          storeId: warehousesTable.storeId,
        }).from(warehousesTable).where(and(
          inArray(warehousesTable.storeId, stores.map((store) => store.id)),
          eq(warehousesTable.isActive, true),
          isNull(warehousesTable.deletedAt),
        )).orderBy(asc(warehousesTable.name))
      : Promise.resolve([]),
  ])

  return { stores, categories, brands, warehouses }
}

async function verifyProductImages(
  input: CreateSellerProductInput,
  authorization: string | undefined,
) {
  if (!input.images.length) return
  if (!mediaStorageServerUrl || !authorization?.startsWith("Bearer ")) {
    throw new MarketplaceError("media_service_unavailable", 502)
  }

  const url = new URL("/media/asset", mediaStorageServerUrl)
  url.search = new URLSearchParams({
    owner: "me",
    resourceType: "marketplace-product",
    resourceId: input.id,
    type: "image",
    status: "ready",
    visibility: "public",
    limit: "24",
  }).toString()

  let response: globalThis.Response
  try {
    response = await fetch(url, {
      headers: { authorization, accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    })
  } catch {
    throw new MarketplaceError("media_service_unavailable", 502)
  }
  if (!response.ok) throw new MarketplaceError("media_verification_failed", 502)

  const payload = await response.json() as { data?: Array<{ id: string }> }
  const ownedReadyIds = new Set(payload.data?.map((asset) => asset.id) ?? [])
  if (input.images.some((id) => !ownedReadyIds.has(id))) {
    throw new MarketplaceError("invalid_product_image", 422)
  }
}

export async function createSellerProduct(
  externalUserId: string,
  rawInput: unknown,
  authorization: string | undefined,
) {
  const input = createSellerProductSchema.parse(rawInput)
  const context = await getSellerContext(externalUserId)
  const store = context.stores.find((item) => item.id === input.storeId)
  if (!store) throw new MarketplaceError("seller_store_forbidden", 403)
  if (input.status === "active" && store.status !== "active") {
    throw new MarketplaceError("store_not_active", 409)
  }
  if (!context.categories.some((item) => item.id === input.categoryId)) {
    throw new MarketplaceError("category_not_available", 422)
  }
  if (input.brandId && !context.brands.some((item) => item.id === input.brandId)) {
    throw new MarketplaceError("brand_not_available", 422)
  }
  if (input.stock > 0 && !context.warehouses.some((item) =>
    item.id === input.warehouseId && item.storeId === store.id
  )) {
    throw new MarketplaceError("warehouse_not_available", 422)
  }

  const [existingId] = await database.select({ id: productsTable.id })
    .from(productsTable).where(eq(productsTable.id, input.id)).limit(1)
  if (existingId) throw new MarketplaceError("product_id_conflict", 409)

  const [existingSku] = await database.select({ id: listingVariantsTable.id })
    .from(listingVariantsTable).where(and(
      eq(listingVariantsTable.storeId, store.id),
      eq(listingVariantsTable.sellerSku, input.sku),
    )).limit(1)
  if (existingSku) throw new MarketplaceError("seller_sku_conflict", 409)

  await verifyProductImages(input, authorization)

  const status = input.status
  const price = input.price.toFixed(4)
  const now = new Date()
  const slug = productSlug(input.title, input.id)

  try {
    return await database.transaction(async (transaction) => {
      const [product] = await transaction.insert(productsTable).values({
        id: input.id,
        createdBySellerId: store.sellerId,
        brandId: input.brandId,
        kind: input.kind,
        status,
        title: input.title,
        slug,
        description: input.description,
        requiresShipping: input.kind === "physical",
        publishedAt: status === "active" ? now : null,
      }).returning({ id: productsTable.id, slug: productsTable.slug })
      if (!product) throw new MarketplaceError("product_create_failed", 500)

      await transaction.insert(productCategoriesTable).values({
        productId: product.id,
        categoryId: input.categoryId,
        isPrimary: true,
      })
      const [variant] = await transaction.insert(productVariantsTable).values({
        productId: product.id,
        code: "standard",
        title: "Standard",
        status,
      }).returning({ id: productVariantsTable.id })
      if (!variant) throw new MarketplaceError("product_variant_create_failed", 500)

      const [listing] = await transaction.insert(listingsTable).values({
        storeId: store.id,
        productId: product.id,
        code: `P-${input.id.slice(0, 12)}`,
        status,
        currency: store.currency,
        basePrice: price,
        fulfillmentKind: input.kind,
        publishedAt: status === "active" ? now : null,
      }).returning({ id: listingsTable.id })
      if (!listing) throw new MarketplaceError("listing_create_failed", 500)

      const [listingVariant] = await transaction.insert(listingVariantsTable).values({
        listingId: listing.id,
        storeId: store.id,
        productId: product.id,
        productVariantId: variant.id,
        sellerSku: input.sku,
        status,
        price,
      }).returning({ id: listingVariantsTable.id })
      if (!listingVariant) throw new MarketplaceError("listing_variant_create_failed", 500)

      if (input.images.length) {
        await transaction.insert(productMediaReferencesTable).values(
          input.images.map((mediaId, position) => ({
            productId: product.id,
            mediaId,
            role: position === 0 ? "thumbnail" as const : "gallery" as const,
            alt: input.title,
            position,
          }))
        )
      }
      if (input.stock > 0 && input.warehouseId) {
        await transaction.insert(inventoryBalancesTable).values({
          warehouseId: input.warehouseId,
          listingVariantId: listingVariant.id,
          storeId: store.id,
          onHand: input.stock,
        })
      }

      return { id: product.id, slug: product.slug, status, listingId: listing.id }
    })
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      throw new MarketplaceError("product_conflict", 409)
    }
    throw error
  }
}

export async function listSellerProduct(externalUserId: string, rawQuery: unknown) {
  const input = sellerProductQuerySchema.parse(rawQuery)
  const context = await getSellerContext(externalUserId)
  const storeIds = context.stores.map((store) => store.id)
  if (!storeIds.length) {
    return { data: [], pagination: { limit: input.limit, offset: input.offset, total: 0 } }
  }

  const where = and(
    inArray(listingsTable.storeId, storeIds),
    isNull(listingsTable.deletedAt),
    isNull(productsTable.deletedAt),
    ilike(productsTable.title, `%${input.query}%`),
  )
  const [rows, totals] = await Promise.all([
    database.select({
      id: productsTable.id,
      title: productsTable.title,
      slug: productsTable.slug,
      status: productsTable.status,
      storeName: storesTable.name,
      price: listingsTable.basePrice,
      currency: listingsTable.currency,
      createdAt: productsTable.createdAt,
    }).from(listingsTable)
      .innerJoin(productsTable, eq(productsTable.id, listingsTable.productId))
      .innerJoin(storesTable, eq(storesTable.id, listingsTable.storeId))
      .where(where)
      .orderBy(desc(productsTable.createdAt))
      .limit(input.limit).offset(input.offset),
    database.select({ total: count() }).from(listingsTable)
      .innerJoin(productsTable, eq(productsTable.id, listingsTable.productId))
      .where(where),
  ])
  return {
    data: rows.map((row) => ({
      ...row,
      price: Number(row.price),
      createdAt: row.createdAt.toISOString(),
    })),
    pagination: { limit: input.limit, offset: input.offset, total: totals[0]?.total ?? 0 },
  }
}
