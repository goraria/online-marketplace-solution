import { and, asc, countDistinct, desc, eq, ilike, isNull, or, sql } from "drizzle-orm"

import { database } from "@/database"
import {
  attributesTable,
  brandsTable,
  categoriesTable,
  categoryAttributesTable,
  inventoryBalancesTable,
  listingVariantsTable,
  listingsTable,
  productAttributeValuesTable,
  productCategoriesTable,
  productMediaReferencesTable,
  productsTable,
  productVariantsTable,
  storesTable,
  variantAttributeValuesTable,
} from "@/database/schema"
import { MarketplaceError } from "@/lib/marketplace-error"
import { productQuerySchema } from "@/schemas/marketplace"

const availableStock = sql<number>`coalesce(sum(${inventoryBalancesTable.onHand} - ${inventoryBalancesTable.reserved}), 0)`

function serializeMoney(value: string | null) {
  return value === null ? null : Number(value)
}

async function getProductMedia(productId: string) {
  return database
    .select({
      id: productMediaReferencesTable.id,
      mediaId: productMediaReferencesTable.mediaId,
      role: productMediaReferencesTable.role,
      alt: productMediaReferencesTable.alt,
      position: productMediaReferencesTable.position,
    })
    .from(productMediaReferencesTable)
    .where(eq(productMediaReferencesTable.productId, productId))
    .orderBy(asc(productMediaReferencesTable.position))
}

export async function listCategories(parentId?: string | null) {
  return database
    .select({
      id: categoriesTable.id,
      parentId: categoriesTable.parentId,
      code: categoriesTable.code,
      name: categoriesTable.name,
      slug: categoriesTable.slug,
      description: categoriesTable.description,
      iconMediaId: categoriesTable.iconMediaId,
      level: categoriesTable.level,
      isLeaf: categoriesTable.isLeaf,
    })
    .from(categoriesTable)
    .where(
      and(
        eq(categoriesTable.isActive, true),
        parentId === undefined
          ? undefined
          : parentId === null
            ? isNull(categoriesTable.parentId)
            : eq(categoriesTable.parentId, parentId)
      )
    )
    .orderBy(asc(categoriesTable.position), asc(categoriesTable.name))
}

export async function listProducts(rawQuery: unknown) {
  const input = productQuerySchema.parse(rawQuery)
  const filters = [
    eq(productsTable.status, "active"),
    isNull(productsTable.deletedAt),
    eq(listingsTable.status, "active"),
    isNull(listingsTable.deletedAt),
    eq(storesTable.status, "active"),
    isNull(storesTable.deletedAt),
  ]

  if (input.query) {
    filters.push(
      or(
        ilike(productsTable.title, `%${input.query}%`),
        ilike(productsTable.description, `%${input.query}%`),
        ilike(listingsTable.titleOverride, `%${input.query}%`)
      )!
    )
  }
  if (input.store) filters.push(eq(storesTable.slug, input.store))
  if (input.minPrice !== undefined) filters.push(sql`${listingVariantsTable.price} >= ${input.minPrice}`)
  if (input.maxPrice !== undefined) filters.push(sql`${listingVariantsTable.price} <= ${input.maxPrice}`)

  let base = database
    .select({
      id: productsTable.id,
      slug: productsTable.slug,
      title: productsTable.title,
      description: productsTable.description,
      kind: productsTable.kind,
      brandName: brandsTable.name,
      listingId: listingsTable.id,
      listingVariantId: listingVariantsTable.id,
      price: listingVariantsTable.price,
      compareAtPrice: listingVariantsTable.compareAtPrice,
      currency: listingsTable.currency,
      storeId: storesTable.id,
      storeName: storesTable.name,
      storeSlug: storesTable.slug,
      mediaId: productMediaReferencesTable.mediaId,
      mediaAlt: productMediaReferencesTable.alt,
      publishedAt: listingsTable.publishedAt,
    })
    .from(listingsTable)
    .innerJoin(productsTable, eq(productsTable.id, listingsTable.productId))
    .innerJoin(storesTable, eq(storesTable.id, listingsTable.storeId))
    .innerJoin(
      listingVariantsTable,
      and(
        eq(listingVariantsTable.listingId, listingsTable.id),
        eq(listingVariantsTable.status, "active"),
        isNull(listingVariantsTable.deletedAt)
      )
    )
    .leftJoin(brandsTable, eq(brandsTable.id, productsTable.brandId))
    .leftJoin(
      productMediaReferencesTable,
      and(
        eq(productMediaReferencesTable.productId, productsTable.id),
        eq(productMediaReferencesTable.role, "thumbnail")
      )
    )
    .$dynamic()

  if (input.category) {
    base = base
      .innerJoin(
        productCategoriesTable,
        eq(productCategoriesTable.productId, productsTable.id)
      )
      .innerJoin(
        categoriesTable,
        and(
          eq(categoriesTable.id, productCategoriesTable.categoryId),
          eq(categoriesTable.slug, input.category)
        )
      )
  }

  let totalsQuery = database
    .select({ total: countDistinct(listingVariantsTable.id) })
    .from(listingsTable)
    .innerJoin(productsTable, eq(productsTable.id, listingsTable.productId))
    .innerJoin(storesTable, eq(storesTable.id, listingsTable.storeId))
    .innerJoin(listingVariantsTable, and(
      eq(listingVariantsTable.listingId, listingsTable.id),
      eq(listingVariantsTable.status, "active"),
      isNull(listingVariantsTable.deletedAt)
    ))
    .$dynamic()

  if (input.category) {
    totalsQuery = totalsQuery
      .innerJoin(productCategoriesTable, eq(productCategoriesTable.productId, productsTable.id))
      .innerJoin(categoriesTable, and(
        eq(categoriesTable.id, productCategoriesTable.categoryId),
        eq(categoriesTable.slug, input.category)
      ))
  }

  const popularOrder = sql<number>`(
    select coalesce(sum(oi.quantity), 0)::int
    from order_item oi
    where oi.listing_variant_id = ${listingVariantsTable.id}
  )`

  const order =
    input.sort === "price_asc"
      ? asc(listingVariantsTable.price)
      : input.sort === "price_desc"
        ? desc(listingVariantsTable.price)
        : input.sort === "popular"
          ? desc(popularOrder)
        : desc(listingsTable.publishedAt)

  const [rows, totals] = await Promise.all([
    base.where(and(...filters))
      .orderBy(order, desc(listingsTable.publishedAt), asc(productsTable.title))
      .limit(input.limit).offset(input.offset),
    totalsQuery.where(and(...filters)),
  ])

  const unique = Array.from(
    new Map(rows.map((row) => [row.listingVariantId, row])).values()
  )

  return {
    data: unique.map((row) => ({
      ...row,
      price: serializeMoney(row.price),
      compareAtPrice: serializeMoney(row.compareAtPrice),
      publishedAt: row.publishedAt?.toISOString() ?? null,
    })),
    pagination: {
      limit: input.limit,
      offset: input.offset,
      returned: unique.length,
      total: totals[0]?.total ?? 0,
      hasMore: input.offset + rows.length < (totals[0]?.total ?? 0),
    },
  }
}

export async function getCatalogHome() {
  const [categories, products] = await Promise.all([
    listCategories(null),
    listProducts({ limit: 12, offset: 0, sort: "newest" }),
  ])
  return { categories, featured: products.data }
}

export async function getCategoryBySlug(slug: string) {
  const [category] = await database
    .select()
    .from(categoriesTable)
    .where(
      and(eq(categoriesTable.slug, slug), eq(categoriesTable.isActive, true))
    )
    .limit(1)
  if (!category) throw new MarketplaceError("category_not_found", 404)
  const [children, products] = await Promise.all([
    listCategories(category.id),
    listProducts({ category: slug, limit: 24, offset: 0 }),
  ])
  return { category, children, products: products.data }
}

export async function getProductBySlug(slug: string) {
  const [product] = await database
    .select({
      id: productsTable.id,
      slug: productsTable.slug,
      title: productsTable.title,
      description: productsTable.description,
      kind: productsTable.kind,
      modelNumber: productsTable.modelNumber,
      manufacturer: productsTable.manufacturer,
      requiresShipping: productsTable.requiresShipping,
      brand: brandsTable.name,
      brandSlug: brandsTable.slug,
      metadata: productsTable.metadata,
    })
    .from(productsTable)
    .leftJoin(brandsTable, eq(brandsTable.id, productsTable.brandId))
    .where(
      and(
        eq(productsTable.slug, slug),
        eq(productsTable.status, "active"),
        isNull(productsTable.deletedAt)
      )
    )
    .limit(1)
  if (!product) throw new MarketplaceError("product_not_found", 404)

  const [media, offers, attributes] = await Promise.all([
    getProductMedia(product.id),
    database
      .select({
        listingId: listingsTable.id,
        listingVariantId: listingVariantsTable.id,
        variantId: productVariantsTable.id,
        variantTitle: productVariantsTable.title,
        sellerSku: listingVariantsTable.sellerSku,
        price: listingVariantsTable.price,
        compareAtPrice: listingVariantsTable.compareAtPrice,
        currency: listingsTable.currency,
        minimumQuantity: listingsTable.minimumQuantity,
        maximumQuantity: listingsTable.maximumQuantity,
        storeId: storesTable.id,
        storeName: storesTable.name,
        storeSlug: storesTable.slug,
        stock: availableStock,
      })
      .from(listingVariantsTable)
      .innerJoin(
        listingsTable,
        eq(listingsTable.id, listingVariantsTable.listingId)
      )
      .innerJoin(storesTable, eq(storesTable.id, listingsTable.storeId))
      .innerJoin(
        productVariantsTable,
        eq(productVariantsTable.id, listingVariantsTable.productVariantId)
      )
      .leftJoin(
        inventoryBalancesTable,
        eq(inventoryBalancesTable.listingVariantId, listingVariantsTable.id)
      )
      .where(
        and(
          eq(listingVariantsTable.productId, product.id),
          eq(listingVariantsTable.status, "active"),
          eq(listingsTable.status, "active"),
          eq(storesTable.status, "active"),
          isNull(listingVariantsTable.deletedAt),
          isNull(listingsTable.deletedAt),
          isNull(storesTable.deletedAt)
        )
      )
      .groupBy(
        listingsTable.id,
        listingVariantsTable.id,
        productVariantsTable.id,
        storesTable.id
      )
      .orderBy(asc(listingVariantsTable.price)),
    database
      .select({
        attributeId: attributesTable.id,
        code: attributesTable.code,
        name: attributesTable.name,
        dataType: attributesTable.dataType,
        unit: attributesTable.unit,
        valueText: productAttributeValuesTable.valueText,
        valueNumber: productAttributeValuesTable.valueNumber,
        valueBoolean: productAttributeValuesTable.valueBoolean,
        valueDate: productAttributeValuesTable.valueDate,
        valueJson: productAttributeValuesTable.valueJson,
      })
      .from(productAttributeValuesTable)
      .innerJoin(
        attributesTable,
        eq(attributesTable.id, productAttributeValuesTable.attributeId)
      )
      .where(eq(productAttributeValuesTable.productId, product.id))
      .orderBy(asc(productAttributeValuesTable.position)),
  ])

  return {
    ...product,
    media,
    offers: offers.map((offer) => ({
      ...offer,
      price: Number(offer.price),
      compareAtPrice: serializeMoney(offer.compareAtPrice),
      stock: Number(offer.stock),
    })),
    attributes,
  }
}

export async function getStoreBySlug(slug: string) {
  const [store] = await database
    .select({
      id: storesTable.id,
      name: storesTable.name,
      slug: storesTable.slug,
      description: storesTable.description,
      logoMediaId: storesTable.logoMediaId,
      bannerMediaId: storesTable.bannerMediaId,
      countryCode: storesTable.countryCode,
      type: storesTable.type,
      badge: storesTable.badge,
      createdAt: storesTable.createdAt,
      metadata: storesTable.metadata,
      policies: storesTable.policies,
    })
    .from(storesTable)
    .where(
      and(
        eq(storesTable.slug, slug),
        eq(storesTable.status, "active"),
        isNull(storesTable.deletedAt)
      )
    )
    .limit(1)
  if (!store) throw new MarketplaceError("store_not_found", 404)
  const [featured, categories] = await Promise.all([
    listProducts({ store: slug, sort: "popular", limit: 8, offset: 0 }),
    database.selectDistinct({
      id: categoriesTable.id,
      parentId: categoriesTable.parentId,
      code: categoriesTable.code,
      name: categoriesTable.name,
      slug: categoriesTable.slug,
      description: categoriesTable.description,
      iconMediaId: categoriesTable.iconMediaId,
      level: categoriesTable.level,
      isLeaf: categoriesTable.isLeaf,
    }).from(categoriesTable)
      .innerJoin(productCategoriesTable, eq(productCategoriesTable.categoryId, categoriesTable.id))
      .innerJoin(productsTable, eq(productsTable.id, productCategoriesTable.productId))
      .innerJoin(listingsTable, eq(listingsTable.productId, productsTable.id))
      .where(and(
        eq(listingsTable.storeId, store.id),
        eq(listingsTable.status, "active"),
        isNull(listingsTable.deletedAt),
        eq(productsTable.status, "active"),
        isNull(productsTable.deletedAt),
        eq(categoriesTable.isActive, true),
      )).orderBy(asc(categoriesTable.name)),
  ])
  const { metadata, ...publicStore } = store
  return {
    ...publicStore,
    isDemo: Boolean((metadata as { demo?: boolean }).demo),
    createdAt: store.createdAt.toISOString(),
    categories,
    products: featured.data,
    productCount: featured.pagination.total,
  }
}

export async function listStores() {
  const rows = await database.select({
    id: storesTable.id,
    name: storesTable.name,
    slug: storesTable.slug,
    description: storesTable.description,
    badge: storesTable.badge,
    type: storesTable.type,
    countryCode: storesTable.countryCode,
    logoMediaId: storesTable.logoMediaId,
    metadata: storesTable.metadata,
  }).from(storesTable)
    .where(and(eq(storesTable.status, "active"), isNull(storesTable.deletedAt)))
    .orderBy(sql`CASE ${storesTable.badge} WHEN 'official_brand' THEN 0 WHEN 'verified' THEN 1 ELSE 2 END`, asc(storesTable.name))
    .limit(50)

  return rows.map(({ metadata, ...store }) => ({
    ...store,
    isDemo: Boolean((metadata as { demo?: boolean }).demo),
  }))
}
