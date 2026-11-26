import { randomUUID } from "node:crypto"

import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm"

import { database } from "@/database"
import {
  cartItemsTable,
  cartsTable,
  customerAddressesTable,
  inventoryBalancesTable,
  inventoryReservationsTable,
  listingVariantsTable,
  listingsTable,
  orderAddressesTable,
  orderItemsTable,
  ordersTable,
  orderStatusEventsTable,
  productMediaReferencesTable,
  productsTable,
  productVariantsTable,
  storeOrdersTable,
  storesTable,
  userTable,
} from "@/database/schema"
import { MarketplaceError } from "@/lib/marketplace-error"
import {
  addressInputSchema,
  cancelOrderSchema,
  cartItemCreateSchema,
  cartItemUpdateSchema,
  checkoutSchema,
  paginationSchema,
} from "@/schemas/marketplace"

type Transaction = Parameters<Parameters<typeof database.transaction>[0]>[0]
type DatabaseExecutor = typeof database | Transaction

function money(value: string | null | undefined) {
  return Number(value ?? 0)
}

function orderNumber(prefix = "GOR") {
  const stamp = new Date().toISOString().replace(/\D/g, "").slice(2, 14)
  return `${prefix}-${stamp}-${randomUUID().slice(0, 8).toUpperCase()}`
}

export async function getLocalUser(externalUserId: string) {
  const [user] = await database
    .select({ id: userTable.id, status: userTable.status })
    .from(userTable)
    .where(eq(userTable.externalUserId, externalUserId))
    .limit(1)
  if (!user) throw new MarketplaceError("user_not_synced", 409)
  if (user.status !== "active")
    throw new MarketplaceError("user_not_active", 403)
  return user
}

async function findActiveCart(
  userId: string,
  executor: DatabaseExecutor = database
) {
  const [cart] = await executor
    .select()
    .from(cartsTable)
    .where(and(eq(cartsTable.userId, userId), eq(cartsTable.status, "active")))
    .orderBy(desc(cartsTable.updatedAt))
    .limit(1)
  return cart ?? null
}

async function getOrCreateCart(
  userId: string,
  currency: string,
  tx?: Transaction
) {
  const executor = tx ?? database
  const current = await findActiveCart(userId, executor)
  if (current) {
    if (current.currency !== currency) {
      throw new MarketplaceError("cart_currency_conflict", 409)
    }
    return current
  }
  const [created] = await executor
    .insert(cartsTable)
    .values({ userId, currency })
    .returning()
  if (!created) throw new MarketplaceError("cart_create_failed", 500)
  return created
}

async function cartRows(cartId: string, executor: DatabaseExecutor = database) {
  return executor
    .select({
      id: cartItemsTable.id,
      quantity: cartItemsTable.quantity,
      unitPrice: cartItemsTable.unitPriceSnapshot,
      currency: cartItemsTable.currency,
      listingVariantId: cartItemsTable.listingVariantId,
      listingId: listingsTable.id,
      productId: productsTable.id,
      productSlug: productsTable.slug,
      productTitle: productsTable.title,
      variantId: productVariantsTable.id,
      variantTitle: productVariantsTable.title,
      sellerSku: listingVariantsTable.sellerSku,
      storeId: storesTable.id,
      storeName: storesTable.name,
      storeSlug: storesTable.slug,
      mediaId: productMediaReferencesTable.mediaId,
    })
    .from(cartItemsTable)
    .innerJoin(
      listingVariantsTable,
      eq(listingVariantsTable.id, cartItemsTable.listingVariantId)
    )
    .innerJoin(
      listingsTable,
      eq(listingsTable.id, listingVariantsTable.listingId)
    )
    .innerJoin(productsTable, eq(productsTable.id, listingsTable.productId))
    .innerJoin(
      productVariantsTable,
      eq(productVariantsTable.id, listingVariantsTable.productVariantId)
    )
    .innerJoin(storesTable, eq(storesTable.id, listingsTable.storeId))
    .leftJoin(
      productMediaReferencesTable,
      and(
        eq(productMediaReferencesTable.productId, productsTable.id),
        eq(productMediaReferencesTable.role, "thumbnail")
      )
    )
    .where(eq(cartItemsTable.cartId, cartId))
    .orderBy(asc(cartItemsTable.createdAt))
}

function serializeCart(
  cart: Awaited<ReturnType<typeof findActiveCart>>,
  rows: Awaited<ReturnType<typeof cartRows>>
) {
  if (!cart)
    return { id: null, currency: "VND", items: [], subtotal: 0, quantity: 0 }
  const uniqueRows = Array.from(
    new Map(rows.map((row) => [row.id, row])).values()
  )
  const items = uniqueRows.map((row) => ({
    ...row,
    unitPrice: money(row.unitPrice),
    lineTotal: money(row.unitPrice) * row.quantity,
  }))
  return {
    id: cart.id,
    currency: cart.currency,
    items,
    subtotal: items.reduce((total, item) => total + item.lineTotal, 0),
    quantity: items.reduce((total, item) => total + item.quantity, 0),
  }
}

export async function getCart(externalUserId: string) {
  const user = await getLocalUser(externalUserId)
  const cart = await findActiveCart(user.id)
  const rows = cart ? await cartRows(cart.id) : []
  return serializeCart(cart, rows)
}

export async function addCartItem(externalUserId: string, rawInput: unknown) {
  const user = await getLocalUser(externalUserId)
  const input = cartItemCreateSchema.parse(rawInput)
  const [variant] = await database
    .select({
      id: listingVariantsTable.id,
      price: listingVariantsTable.price,
      currency: listingsTable.currency,
      minimumQuantity: listingsTable.minimumQuantity,
      maximumQuantity: listingsTable.maximumQuantity,
    })
    .from(listingVariantsTable)
    .innerJoin(
      listingsTable,
      eq(listingsTable.id, listingVariantsTable.listingId)
    )
    .innerJoin(storesTable, eq(storesTable.id, listingsTable.storeId))
    .where(
      and(
        eq(listingVariantsTable.id, input.listingVariantId),
        eq(listingVariantsTable.status, "active"),
        eq(listingsTable.status, "active"),
        eq(storesTable.status, "active"),
        isNull(listingVariantsTable.deletedAt),
        isNull(listingsTable.deletedAt)
      )
    )
    .limit(1)
  if (!variant) throw new MarketplaceError("listing_variant_not_found", 404)
  if (input.quantity < variant.minimumQuantity) {
    throw new MarketplaceError("minimum_quantity_not_met", 422)
  }
  if (variant.maximumQuantity && input.quantity > variant.maximumQuantity) {
    throw new MarketplaceError("maximum_quantity_exceeded", 422)
  }

  await database.transaction(async (tx) => {
    const cart = await getOrCreateCart(user.id, variant.currency, tx)
    const [existing] = await tx
      .select()
      .from(cartItemsTable)
      .where(
        and(
          eq(cartItemsTable.cartId, cart.id),
          eq(cartItemsTable.listingVariantId, variant.id)
        )
      )
      .limit(1)
    const quantity = (existing?.quantity ?? 0) + input.quantity
    if (variant.maximumQuantity && quantity > variant.maximumQuantity) {
      throw new MarketplaceError("maximum_quantity_exceeded", 422)
    }
    if (existing) {
      await tx
        .update(cartItemsTable)
        .set({
          quantity,
          unitPriceSnapshot: variant.price,
          updatedAt: new Date(),
        })
        .where(eq(cartItemsTable.id, existing.id))
    } else {
      await tx.insert(cartItemsTable).values({
        cartId: cart.id,
        listingVariantId: variant.id,
        quantity,
        unitPriceSnapshot: variant.price,
        currency: variant.currency,
      })
    }
    await tx
      .update(cartsTable)
      .set({ updatedAt: new Date() })
      .where(eq(cartsTable.id, cart.id))
  })
  return getCart(externalUserId)
}

export async function updateCartItem(
  externalUserId: string,
  itemId: string,
  rawInput: unknown
) {
  const user = await getLocalUser(externalUserId)
  const input = cartItemUpdateSchema.parse(rawInput)
  const cart = await findActiveCart(user.id)
  if (!cart) throw new MarketplaceError("cart_not_found", 404)
  const [updated] = await database
    .update(cartItemsTable)
    .set({ quantity: input.quantity, updatedAt: new Date() })
    .where(
      and(eq(cartItemsTable.id, itemId), eq(cartItemsTable.cartId, cart.id))
    )
    .returning({ id: cartItemsTable.id })
  if (!updated) throw new MarketplaceError("cart_item_not_found", 404)
  return getCart(externalUserId)
}

export async function removeCartItem(externalUserId: string, itemId: string) {
  const user = await getLocalUser(externalUserId)
  const cart = await findActiveCart(user.id)
  if (!cart) throw new MarketplaceError("cart_not_found", 404)
  const [removed] = await database
    .delete(cartItemsTable)
    .where(
      and(eq(cartItemsTable.id, itemId), eq(cartItemsTable.cartId, cart.id))
    )
    .returning({ id: cartItemsTable.id })
  if (!removed) throw new MarketplaceError("cart_item_not_found", 404)
  return getCart(externalUserId)
}

export async function listAddresses(externalUserId: string) {
  const user = await getLocalUser(externalUserId)
  return database
    .select()
    .from(customerAddressesTable)
    .where(
      and(
        eq(customerAddressesTable.userId, user.id),
        isNull(customerAddressesTable.deletedAt)
      )
    )
    .orderBy(
      desc(customerAddressesTable.isDefaultShipping),
      desc(customerAddressesTable.updatedAt)
    )
}

export async function createAddress(externalUserId: string, rawInput: unknown) {
  const user = await getLocalUser(externalUserId)
  const input = addressInputSchema.parse(rawInput)
  return database.transaction(async (tx) => {
    if (input.isDefaultShipping) {
      await tx
        .update(customerAddressesTable)
        .set({ isDefaultShipping: false })
        .where(eq(customerAddressesTable.userId, user.id))
    }
    if (input.isDefaultBilling) {
      await tx
        .update(customerAddressesTable)
        .set({ isDefaultBilling: false })
        .where(eq(customerAddressesTable.userId, user.id))
    }
    const [created] = await tx
      .insert(customerAddressesTable)
      .values({ userId: user.id, ...input })
      .returning()
    if (!created) throw new MarketplaceError("address_create_failed", 500)
    return created
  })
}

export async function updateAddress(
  externalUserId: string,
  addressId: string,
  rawInput: unknown
) {
  const user = await getLocalUser(externalUserId)
  const input = addressInputSchema.partial().parse(rawInput)
  return database.transaction(async (tx) => {
    if (input.isDefaultShipping) {
      await tx
        .update(customerAddressesTable)
        .set({ isDefaultShipping: false })
        .where(eq(customerAddressesTable.userId, user.id))
    }
    if (input.isDefaultBilling) {
      await tx
        .update(customerAddressesTable)
        .set({ isDefaultBilling: false })
        .where(eq(customerAddressesTable.userId, user.id))
    }
    const [updated] = await tx
      .update(customerAddressesTable)
      .set({ ...input, updatedAt: new Date() })
      .where(
        and(
          eq(customerAddressesTable.id, addressId),
          eq(customerAddressesTable.userId, user.id),
          isNull(customerAddressesTable.deletedAt)
        )
      )
      .returning()
    if (!updated) throw new MarketplaceError("address_not_found", 404)
    return updated
  })
}

export async function deleteAddress(externalUserId: string, addressId: string) {
  const user = await getLocalUser(externalUserId)
  const [deleted] = await database
    .update(customerAddressesTable)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
      isDefaultShipping: false,
      isDefaultBilling: false,
    })
    .where(
      and(
        eq(customerAddressesTable.id, addressId),
        eq(customerAddressesTable.userId, user.id),
        isNull(customerAddressesTable.deletedAt)
      )
    )
    .returning({ id: customerAddressesTable.id })
  if (!deleted) throw new MarketplaceError("address_not_found", 404)
  return deleted
}

async function loadOrder(orderId: string, buyerUserId: string) {
  const [order] = await database
    .select()
    .from(ordersTable)
    .where(
      and(eq(ordersTable.id, orderId), eq(ordersTable.buyerUserId, buyerUserId))
    )
    .limit(1)
  if (!order) throw new MarketplaceError("order_not_found", 404)
  const storeOrders = await database
    .select({
      id: storeOrdersTable.id,
      storeId: storesTable.id,
      storeName: storesTable.name,
      storeSlug: storesTable.slug,
      storeOrderNumber: storeOrdersTable.storeOrderNumber,
      status: storeOrdersTable.status,
      grandTotal: storeOrdersTable.grandTotal,
    })
    .from(storeOrdersTable)
    .innerJoin(storesTable, eq(storesTable.id, storeOrdersTable.storeId))
    .where(eq(storeOrdersTable.orderId, order.id))
  const items = storeOrders.length
    ? await database
        .select()
        .from(orderItemsTable)
        .where(
          inArray(
            orderItemsTable.storeOrderId,
            storeOrders.map((entry) => entry.id)
          )
        )
    : []
  const addresses = await database
    .select()
    .from(orderAddressesTable)
    .where(eq(orderAddressesTable.orderId, order.id))
  return {
    ...order,
    merchandiseSubtotal: money(order.merchandiseSubtotal),
    discountTotal: money(order.discountTotal),
    shippingTotal: money(order.shippingTotal),
    taxTotal: money(order.taxTotal),
    grandTotal: money(order.grandTotal),
    stores: storeOrders.map((storeOrder) => ({
      ...storeOrder,
      grandTotal: money(storeOrder.grandTotal),
      items: items
        .filter((item) => item.storeOrderId === storeOrder.id)
        .map((item) => ({
          ...item,
          unitPrice: money(item.unitPrice),
          lineTotal: money(item.lineTotal),
        })),
    })),
    addresses,
  }
}

export async function checkout(externalUserId: string, rawInput: unknown) {
  const user = await getLocalUser(externalUserId)
  const input = checkoutSchema.parse(rawInput)

  const orderId = await database.transaction(async (tx) => {
    const cart = await findActiveCart(user.id, tx)
    if (!cart) throw new MarketplaceError("cart_not_found", 404)
    const rows = await cartRows(cart.id, tx)
    const items = Array.from(new Map(rows.map((row) => [row.id, row])).values())
    if (!items.length) throw new MarketplaceError("cart_empty", 422)

    const addressIds = Array.from(
      new Set([
        input.shippingAddressId,
        input.billingAddressId ?? input.shippingAddressId,
      ])
    )
    const addresses = await tx
      .select()
      .from(customerAddressesTable)
      .where(
        and(
          eq(customerAddressesTable.userId, user.id),
          inArray(customerAddressesTable.id, addressIds),
          isNull(customerAddressesTable.deletedAt)
        )
      )
    if (addresses.length !== addressIds.length)
      throw new MarketplaceError("address_not_found", 404)

    const subtotal = items.reduce(
      (total, item) => total + money(item.unitPrice) * item.quantity,
      0
    )
    const [order] = await tx
      .insert(ordersTable)
      .values({
        orderNumber: orderNumber(),
        buyerUserId: user.id,
        cartId: cart.id,
        currency: cart.currency,
        merchandiseSubtotal: subtotal.toFixed(4),
        grandTotal: subtotal.toFixed(4),
        pricingSnapshot: {
          source: "marketplace",
          capturedAt: new Date().toISOString(),
        },
        note: input.note ?? null,
        placedAt: new Date(),
      })
      .returning()
    if (!order) throw new MarketplaceError("order_create_failed", 500)

    const shipping = addresses.find(
      (entry) => entry.id === input.shippingAddressId
    )!
    const billing = addresses.find(
      (entry) =>
        entry.id === (input.billingAddressId ?? input.shippingAddressId)
    )!
    await tx.insert(orderAddressesTable).values([
      {
        orderId: order.id,
        kind: "shipping",
        recipientName: shipping.recipientName,
        phone: shipping.phone,
        line1: shipping.line1,
        line2: shipping.line2,
        ward: shipping.ward,
        district: shipping.district,
        province: shipping.province,
        postalCode: shipping.postalCode,
        countryCode: shipping.countryCode,
      },
      {
        orderId: order.id,
        kind: "billing",
        recipientName: billing.recipientName,
        phone: billing.phone,
        line1: billing.line1,
        line2: billing.line2,
        ward: billing.ward,
        district: billing.district,
        province: billing.province,
        postalCode: billing.postalCode,
        countryCode: billing.countryCode,
      },
    ])

    const grouped = Map.groupBy(items, (item) => item.storeId)
    for (const [storeId, storeItems] of grouped) {
      const storeSubtotal = storeItems.reduce(
        (total, item) => total + money(item.unitPrice) * item.quantity,
        0
      )
      const [storeOrder] = await tx
        .insert(storeOrdersTable)
        .values({
          orderId: order.id,
          storeId,
          storeOrderNumber: orderNumber("STORE"),
          merchandiseSubtotal: storeSubtotal.toFixed(4),
          grandTotal: storeSubtotal.toFixed(4),
        })
        .returning()
      if (!storeOrder)
        throw new MarketplaceError("store_order_create_failed", 500)

      for (const item of storeItems) {
        const [balance] = await tx
          .select()
          .from(inventoryBalancesTable)
          .where(
            and(
              eq(
                inventoryBalancesTable.listingVariantId,
                item.listingVariantId
              ),
              sql`${inventoryBalancesTable.onHand} - ${inventoryBalancesTable.reserved} >= ${item.quantity}`
            )
          )
          .orderBy(
            desc(
              sql`${inventoryBalancesTable.onHand} - ${inventoryBalancesTable.reserved}`
            )
          )
          .limit(1)
        if (!balance)
          throw new MarketplaceError(
            "insufficient_inventory",
            409,
            item.productTitle
          )
        const [reserved] = await tx
          .update(inventoryBalancesTable)
          .set({
            reserved: sql`${inventoryBalancesTable.reserved} + ${item.quantity}`,
            version: sql`${inventoryBalancesTable.version} + 1`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(inventoryBalancesTable.warehouseId, balance.warehouseId),
              eq(
                inventoryBalancesTable.listingVariantId,
                balance.listingVariantId
              ),
              sql`${inventoryBalancesTable.onHand} - ${inventoryBalancesTable.reserved} >= ${item.quantity}`
            )
          )
          .returning({ warehouseId: inventoryBalancesTable.warehouseId })
        if (!reserved) throw new MarketplaceError("inventory_changed", 409)
        await tx
          .insert(inventoryReservationsTable)
          .values({
            warehouseId: balance.warehouseId,
            listingVariantId: item.listingVariantId,
            orderId: order.id,
            quantity: item.quantity,
            idempotencyKey: `checkout:${order.id}:${item.id}`,
          })
        await tx.insert(orderItemsTable).values({
          storeOrderId: storeOrder.id,
          listingId: item.listingId,
          listingVariantId: item.listingVariantId,
          productId: item.productId,
          productVariantId: item.variantId,
          productTitle: item.productTitle,
          variantTitle: item.variantTitle,
          sellerSku: item.sellerSku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: (money(item.unitPrice) * item.quantity).toFixed(4),
          productSnapshot: {
            slug: item.productSlug,
            mediaId: item.mediaId,
            storeName: item.storeName,
          },
        })
      }
    }

    await tx
      .insert(orderStatusEventsTable)
      .values({
        orderId: order.id,
        status: "pending",
        actorUserId: user.id,
        note: "Order placed",
      })
    await tx
      .update(cartsTable)
      .set({ status: "converted", updatedAt: new Date() })
      .where(eq(cartsTable.id, cart.id))
    return order.id
  })

  return loadOrder(orderId, user.id)
}

export async function listOrders(externalUserId: string, rawQuery: unknown) {
  const user = await getLocalUser(externalUserId)
  const input = paginationSchema.parse(rawQuery)
  const rows = await database
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.buyerUserId, user.id))
    .orderBy(desc(ordersTable.createdAt))
    .limit(input.limit)
    .offset(input.offset)
  return {
    data: rows.map((order) => ({
      ...order,
      merchandiseSubtotal: money(order.merchandiseSubtotal),
      grandTotal: money(order.grandTotal),
    })),
    pagination: {
      limit: input.limit,
      offset: input.offset,
      returned: rows.length,
      hasMore: rows.length === input.limit,
    },
  }
}

export async function getOrder(externalUserId: string, orderId: string) {
  const user = await getLocalUser(externalUserId)
  return loadOrder(orderId, user.id)
}

export async function cancelOrder(
  externalUserId: string,
  orderId: string,
  rawInput: unknown
) {
  const user = await getLocalUser(externalUserId)
  const input = cancelOrderSchema.parse(rawInput)
  await database.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(ordersTable)
      .where(
        and(eq(ordersTable.id, orderId), eq(ordersTable.buyerUserId, user.id))
      )
      .limit(1)
    if (!order) throw new MarketplaceError("order_not_found", 404)
    if (!(["pending", "confirmed"] as string[]).includes(order.status))
      throw new MarketplaceError("order_cannot_be_cancelled", 409)
    await tx
      .update(ordersTable)
      .set({
        status: "cancelled",
        cancellationReason: input.reason,
        cancelledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(ordersTable.id, order.id))
    await tx
      .update(storeOrdersTable)
      .set({
        status: "cancelled",
        cancelledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(storeOrdersTable.orderId, order.id))
    const reservations = await tx
      .select()
      .from(inventoryReservationsTable)
      .where(
        and(
          eq(inventoryReservationsTable.orderId, order.id),
          eq(inventoryReservationsTable.status, "reserved")
        )
      )
    for (const reservation of reservations) {
      await tx
        .update(inventoryBalancesTable)
        .set({
          reserved: sql`greatest(${inventoryBalancesTable.reserved} - ${reservation.quantity}, 0)`,
          version: sql`${inventoryBalancesTable.version} + 1`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(inventoryBalancesTable.warehouseId, reservation.warehouseId),
            eq(
              inventoryBalancesTable.listingVariantId,
              reservation.listingVariantId
            )
          )
        )
    }
    await tx
      .update(inventoryReservationsTable)
      .set({ status: "released", updatedAt: new Date() })
      .where(
        and(
          eq(inventoryReservationsTable.orderId, order.id),
          eq(inventoryReservationsTable.status, "reserved")
        )
      )
    await tx
      .insert(orderStatusEventsTable)
      .values({
        orderId: order.id,
        status: "cancelled",
        actorUserId: user.id,
        note: input.reason,
      })
  })
  return loadOrder(orderId, user.id)
}
