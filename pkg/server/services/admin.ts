import { sql } from "drizzle-orm"

import { database } from "@/database"
import {
  brandsTable,
  categoriesTable,
  fulfillmentsTable,
  inventoryBalancesTable,
  listingVariantsTable,
  listingsTable,
  ordersTable,
  productsTable,
  returnRequestsTable,
  sellersTable,
  storesTable,
  userTable,
  warehousesTable,
} from "@/database/schema"
import { adminListQuerySchema, adminResourceSchema } from "@/schemas/admin"

export interface AdminListRow extends Record<string, unknown> {
  id: string
  name: string
  slug: string
  status: string
  detail: string | null
  itemCount: number
  price: number | null
  currency: string | null
  createdAt: string
}

export async function listAdminResource(rawResource: unknown, rawQuery: unknown) {
  const resource = adminResourceSchema.parse(rawResource)
  const input = adminListQuerySchema.parse(rawQuery)
  const pattern = `%${input.query}%`
  const limit = input.limit
  const offset = input.offset

  let rowsQuery
  let countQuery

  switch (resource) {
    case "category":
      rowsQuery = sql`SELECT ${categoriesTable.id} AS id, ${categoriesTable.name} AS name,
        ${categoriesTable.slug} AS slug,
        CASE WHEN ${categoriesTable.isActive} THEN 'active' ELSE 'inactive' END AS status,
        ${categoriesTable.description} AS detail,
        (SELECT count(*)::int FROM product_category pc WHERE pc.category_id = ${categoriesTable.id}) AS "itemCount",
        NULL::float AS price, NULL::text AS currency, ${categoriesTable.createdAt} AS "createdAt"
        FROM ${categoriesTable}
        WHERE ${categoriesTable.name} ILIKE ${pattern} OR ${categoriesTable.slug} ILIKE ${pattern}
        ORDER BY ${categoriesTable.position}, ${categoriesTable.name} LIMIT ${limit} OFFSET ${offset}`
      countQuery = sql`SELECT count(*)::int AS total FROM ${categoriesTable}
        WHERE ${categoriesTable.name} ILIKE ${pattern} OR ${categoriesTable.slug} ILIKE ${pattern}`
      break
    case "product":
      rowsQuery = sql`SELECT ${productsTable.id} AS id, ${productsTable.title} AS name,
        ${productsTable.slug} AS slug, ${productsTable.status} AS status,
        ${productsTable.kind} AS detail,
        (SELECT count(*)::int FROM listing l WHERE l.product_id = ${productsTable.id}) AS "itemCount",
        (SELECT min(l.base_price)::float FROM listing l WHERE l.product_id = ${productsTable.id}) AS price,
        (SELECT l.currency FROM listing l WHERE l.product_id = ${productsTable.id}
          ORDER BY l.base_price ASC LIMIT 1) AS currency,
        ${productsTable.createdAt} AS "createdAt"
        FROM ${productsTable} WHERE ${productsTable.deletedAt} IS NULL
        AND (${productsTable.title} ILIKE ${pattern} OR ${productsTable.slug} ILIKE ${pattern})
        ORDER BY ${productsTable.createdAt} DESC LIMIT ${limit} OFFSET ${offset}`
      countQuery = sql`SELECT count(*)::int AS total FROM ${productsTable}
        WHERE ${productsTable.deletedAt} IS NULL
        AND (${productsTable.title} ILIKE ${pattern} OR ${productsTable.slug} ILIKE ${pattern})`
      break
    case "brand":
      rowsQuery = sql`SELECT ${brandsTable.id} AS id, ${brandsTable.name} AS name,
        ${brandsTable.slug} AS slug,
        CASE WHEN ${brandsTable.isVerified} THEN 'verified' ELSE 'unverified' END AS status,
        ${brandsTable.description} AS detail,
        (SELECT count(*)::int FROM product p WHERE p.brand_id = ${brandsTable.id} AND p.deleted_at IS NULL) AS "itemCount",
        NULL::float AS price, NULL::text AS currency, ${brandsTable.createdAt} AS "createdAt"
        FROM ${brandsTable} WHERE ${brandsTable.deletedAt} IS NULL
        AND (${brandsTable.name} ILIKE ${pattern} OR ${brandsTable.slug} ILIKE ${pattern})
        ORDER BY ${brandsTable.name} LIMIT ${limit} OFFSET ${offset}`
      countQuery = sql`SELECT count(*)::int AS total FROM ${brandsTable}
        WHERE ${brandsTable.deletedAt} IS NULL
        AND (${brandsTable.name} ILIKE ${pattern} OR ${brandsTable.slug} ILIKE ${pattern})`
      break
    case "store":
      rowsQuery = sql`SELECT ${storesTable.id} AS id, ${storesTable.name} AS name,
        ${storesTable.slug} AS slug, ${storesTable.status} AS status,
        ${sellersTable.displayName} AS detail,
        (SELECT count(*)::int FROM listing l WHERE l.store_id = ${storesTable.id} AND l.deleted_at IS NULL) AS "itemCount",
        NULL::float AS price, ${storesTable.defaultCurrency} AS currency, ${storesTable.createdAt} AS "createdAt"
        FROM ${storesTable} LEFT JOIN ${sellersTable} ON ${sellersTable.id} = ${storesTable.sellerId}
        WHERE ${storesTable.deletedAt} IS NULL
        AND (${storesTable.name} ILIKE ${pattern} OR ${storesTable.slug} ILIKE ${pattern})
        ORDER BY ${storesTable.createdAt} DESC LIMIT ${limit} OFFSET ${offset}`
      countQuery = sql`SELECT count(*)::int AS total FROM ${storesTable}
        WHERE ${storesTable.deletedAt} IS NULL
        AND (${storesTable.name} ILIKE ${pattern} OR ${storesTable.slug} ILIKE ${pattern})`
      break
    case "seller":
      rowsQuery = sql`SELECT ${sellersTable.id} AS id, ${sellersTable.displayName} AS name,
        ${sellersTable.slug} AS slug, ${sellersTable.status} AS status,
        ${sellersTable.legalName} AS detail,
        (SELECT count(*)::int FROM store s WHERE s.seller_id = ${sellersTable.id} AND s.deleted_at IS NULL) AS "itemCount",
        NULL::float AS price, NULL::text AS currency, ${sellersTable.createdAt} AS "createdAt"
        FROM ${sellersTable} WHERE ${sellersTable.deletedAt} IS NULL
        AND (${sellersTable.displayName} ILIKE ${pattern} OR ${sellersTable.slug} ILIKE ${pattern})
        ORDER BY ${sellersTable.createdAt} DESC LIMIT ${limit} OFFSET ${offset}`
      countQuery = sql`SELECT count(*)::int AS total FROM ${sellersTable}
        WHERE ${sellersTable.deletedAt} IS NULL
        AND (${sellersTable.displayName} ILIKE ${pattern} OR ${sellersTable.slug} ILIKE ${pattern})`
      break
    case "listing":
      rowsQuery = sql`SELECT ${listingsTable.id} AS id,
        coalesce(${listingsTable.titleOverride}, ${productsTable.title}) AS name,
        ${listingsTable.code} AS slug, ${listingsTable.status} AS status,
        ${storesTable.name} AS detail,
        (SELECT count(*)::int FROM listing_variant lv WHERE lv.listing_id = ${listingsTable.id} AND lv.deleted_at IS NULL) AS "itemCount",
        ${listingsTable.basePrice}::float AS price,
        ${listingsTable.currency} AS currency, ${listingsTable.createdAt} AS "createdAt"
        FROM ${listingsTable}
        JOIN ${productsTable} ON ${productsTable.id} = ${listingsTable.productId}
        JOIN ${storesTable} ON ${storesTable.id} = ${listingsTable.storeId}
        WHERE ${listingsTable.deletedAt} IS NULL
        AND (coalesce(${listingsTable.titleOverride}, ${productsTable.title}) ILIKE ${pattern} OR ${listingsTable.code} ILIKE ${pattern})
        ORDER BY ${listingsTable.createdAt} DESC LIMIT ${limit} OFFSET ${offset}`
      countQuery = sql`SELECT count(*)::int AS total FROM ${listingsTable}
        JOIN ${productsTable} ON ${productsTable.id} = ${listingsTable.productId}
        WHERE ${listingsTable.deletedAt} IS NULL
        AND (coalesce(${listingsTable.titleOverride}, ${productsTable.title}) ILIKE ${pattern} OR ${listingsTable.code} ILIKE ${pattern})`
      break
    case "order":
      rowsQuery = sql`SELECT ${ordersTable.id} AS id, ${ordersTable.orderNumber} AS name,
        ${ordersTable.orderNumber} AS slug, ${ordersTable.status} AS status,
        ${userTable.email} AS detail,
        (SELECT count(*)::int FROM store_order so WHERE so.order_id = ${ordersTable.id}) AS "itemCount",
        ${ordersTable.grandTotal}::float AS price, ${ordersTable.currency} AS currency,
        ${ordersTable.createdAt} AS "createdAt"
        FROM ${ordersTable} JOIN ${userTable} ON ${userTable.id} = ${ordersTable.buyerUserId}
        WHERE ${ordersTable.orderNumber} ILIKE ${pattern} OR ${userTable.email} ILIKE ${pattern}
        ORDER BY ${ordersTable.createdAt} DESC LIMIT ${limit} OFFSET ${offset}`
      countQuery = sql`SELECT count(*)::int AS total FROM ${ordersTable}
        JOIN ${userTable} ON ${userTable.id} = ${ordersTable.buyerUserId}
        WHERE ${ordersTable.orderNumber} ILIKE ${pattern} OR ${userTable.email} ILIKE ${pattern}`
      break
    case "customer":
      rowsQuery = sql`SELECT ${userTable.id} AS id, ${userTable.name} AS name,
        ${userTable.email} AS slug, ${userTable.status} AS status,
        ${userTable.username} AS detail,
        (SELECT count(*)::int FROM "order" o WHERE o.buyer_user_id = ${userTable.id}) AS "itemCount",
        NULL::float AS price, NULL::text AS currency, ${userTable.createdAt} AS "createdAt"
        FROM ${userTable} WHERE ${userTable.externalUserId} <> 'marketplace-demo-catalog'
        AND (${userTable.name} ILIKE ${pattern} OR ${userTable.email} ILIKE ${pattern})
        ORDER BY ${userTable.createdAt} DESC LIMIT ${limit} OFFSET ${offset}`
      countQuery = sql`SELECT count(*)::int AS total FROM ${userTable}
        WHERE ${userTable.externalUserId} <> 'marketplace-demo-catalog'
        AND (${userTable.name} ILIKE ${pattern} OR ${userTable.email} ILIKE ${pattern})`
      break
    case "warehouse":
      rowsQuery = sql`SELECT ${warehousesTable.id} AS id, ${warehousesTable.name} AS name,
        ${warehousesTable.code} AS slug,
        CASE WHEN ${warehousesTable.isActive} THEN 'active' ELSE 'inactive' END AS status,
        ${storesTable.name} AS detail,
        (SELECT count(*)::int FROM inventory_balance ib WHERE ib.warehouse_id = ${warehousesTable.id}) AS "itemCount",
        NULL::float AS price, NULL::text AS currency, ${warehousesTable.createdAt} AS "createdAt"
        FROM ${warehousesTable} JOIN ${storesTable} ON ${storesTable.id} = ${warehousesTable.storeId}
        WHERE ${warehousesTable.deletedAt} IS NULL
        AND (${warehousesTable.name} ILIKE ${pattern} OR ${warehousesTable.code} ILIKE ${pattern})
        ORDER BY ${warehousesTable.createdAt} DESC LIMIT ${limit} OFFSET ${offset}`
      countQuery = sql`SELECT count(*)::int AS total FROM ${warehousesTable}
        WHERE ${warehousesTable.deletedAt} IS NULL
        AND (${warehousesTable.name} ILIKE ${pattern} OR ${warehousesTable.code} ILIKE ${pattern})`
      break
    case "inventory":
      rowsQuery = sql`SELECT (${inventoryBalancesTable.warehouseId}::text || ':' || ${inventoryBalancesTable.listingVariantId}::text) AS id,
        ${productsTable.title} AS name, ${listingVariantsTable.sellerSku} AS slug,
        CASE WHEN ${inventoryBalancesTable.onHand} - ${inventoryBalancesTable.reserved} > 0 THEN 'in_stock' ELSE 'out_of_stock' END AS status,
        ${warehousesTable.name} AS detail, ${inventoryBalancesTable.onHand} AS "itemCount",
        NULL::float AS price, NULL::text AS currency, ${inventoryBalancesTable.updatedAt} AS "createdAt"
        FROM ${inventoryBalancesTable}
        JOIN ${listingVariantsTable} ON ${listingVariantsTable.id} = ${inventoryBalancesTable.listingVariantId}
        JOIN ${productsTable} ON ${productsTable.id} = ${listingVariantsTable.productId}
        JOIN ${warehousesTable} ON ${warehousesTable.id} = ${inventoryBalancesTable.warehouseId}
        WHERE ${productsTable.title} ILIKE ${pattern} OR ${listingVariantsTable.sellerSku} ILIKE ${pattern}
        ORDER BY ${inventoryBalancesTable.updatedAt} DESC LIMIT ${limit} OFFSET ${offset}`
      countQuery = sql`SELECT count(*)::int AS total FROM ${inventoryBalancesTable}
        JOIN ${listingVariantsTable} ON ${listingVariantsTable.id} = ${inventoryBalancesTable.listingVariantId}
        JOIN ${productsTable} ON ${productsTable.id} = ${listingVariantsTable.productId}
        WHERE ${productsTable.title} ILIKE ${pattern} OR ${listingVariantsTable.sellerSku} ILIKE ${pattern}`
      break
    case "fulfillment":
      rowsQuery = sql`SELECT ${fulfillmentsTable.id} AS id,
        coalesce(${fulfillmentsTable.trackingNumber}, ${fulfillmentsTable.id}::text) AS name,
        ${fulfillmentsTable.id}::text AS slug, ${fulfillmentsTable.status} AS status,
        ${storesTable.name} AS detail,
        (SELECT count(*)::int FROM fulfillment_item fi WHERE fi.fulfillment_id = ${fulfillmentsTable.id}) AS "itemCount",
        NULL::float AS price, NULL::text AS currency, ${fulfillmentsTable.createdAt} AS "createdAt"
        FROM ${fulfillmentsTable} JOIN ${storesTable} ON ${storesTable.id} = ${fulfillmentsTable.storeId}
        WHERE ${fulfillmentsTable.trackingNumber} ILIKE ${pattern} OR ${fulfillmentsTable.id}::text ILIKE ${pattern}
        ORDER BY ${fulfillmentsTable.createdAt} DESC LIMIT ${limit} OFFSET ${offset}`
      countQuery = sql`SELECT count(*)::int AS total FROM ${fulfillmentsTable}
        WHERE ${fulfillmentsTable.trackingNumber} ILIKE ${pattern} OR ${fulfillmentsTable.id}::text ILIKE ${pattern}`
      break
    case "return":
      rowsQuery = sql`SELECT ${returnRequestsTable.id} AS id,
        ${returnRequestsTable.returnNumber} AS name, ${returnRequestsTable.returnNumber} AS slug,
        ${returnRequestsTable.status} AS status, ${returnRequestsTable.reasonCode} AS detail,
        (SELECT count(*)::int FROM return_item ri WHERE ri.return_request_id = ${returnRequestsTable.id}) AS "itemCount",
        NULL::float AS price, NULL::text AS currency, ${returnRequestsTable.createdAt} AS "createdAt"
        FROM ${returnRequestsTable}
        WHERE ${returnRequestsTable.returnNumber} ILIKE ${pattern} OR ${returnRequestsTable.reasonCode} ILIKE ${pattern}
        ORDER BY ${returnRequestsTable.createdAt} DESC LIMIT ${limit} OFFSET ${offset}`
      countQuery = sql`SELECT count(*)::int AS total FROM ${returnRequestsTable}
        WHERE ${returnRequestsTable.returnNumber} ILIKE ${pattern} OR ${returnRequestsTable.reasonCode} ILIKE ${pattern}`
      break
  }

  const [rows, count] = await Promise.all([
    database.execute<AdminListRow>(rowsQuery),
    database.execute<{ total: number }>(countQuery),
  ])

  return {
    data: rows.rows,
    pagination: { limit, offset, total: count.rows[0]?.total ?? 0 },
  }
}
