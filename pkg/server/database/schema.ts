import { userTable } from "./auth"
export {
  userStatus,
  userTable,
  sessionTable,
  verificationTable,
  revocationTable,
  proofTable,
} from "./auth"
import { sql } from "drizzle-orm"
import {
  bigint,
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core"

export const sellerStatus = pgEnum("seller_status", [
  "pending",
  "active",
  "suspended",
  "rejected",
  "closed",
])

export const sellerType = pgEnum("seller_type", [
  "individual",
  "business",
  "platform",
])

export const sellerMemberRole = pgEnum("seller_member_role", [
  "owner",
  "admin",
  "catalog",
  "inventory",
  "order",
  "support",
  "analyst",
])

export const storeStatus = pgEnum("store_status", [
  "draft",
  "active",
  "paused",
  "suspended",
  "closed",
])

export const storeType = pgEnum("store_type", ["merchant", "platform"])

export const storeBadge = pgEnum("store_badge", [
  "standard",
  "verified",
  "official_brand",
])

export const productKind = pgEnum("product_kind", [
  "physical",
  "digital",
  "service",
  "bundle",
])

export const productStatus = pgEnum("product_status", [
  "draft",
  "pending_review",
  "active",
  "rejected",
  "archived",
])

export const identifierKind = pgEnum("identifier_kind", [
  "gtin",
  "upc",
  "ean",
  "isbn",
  "mpn",
  "custom",
])

export const attributeDataType = pgEnum("attribute_data_type", [
  "text",
  "number",
  "boolean",
  "date",
  "select",
  "multiselect",
  "json",
])

export const mediaRole = pgEnum("media_role", [
  "thumbnail",
  "gallery",
  "swatch",
  "document",
  "manual",
])

export const listingCondition = pgEnum("listing_condition", [
  "new",
  "refurbished",
  "used_like_new",
  "used_good",
  "used_acceptable",
])

export const listingStatus = pgEnum("listing_status", [
  "draft",
  "active",
  "paused",
  "sold_out",
  "archived",
])

export const inventoryMovementKind = pgEnum("inventory_movement_kind", [
  "receive",
  "reserve",
  "release",
  "sale",
  "return",
  "adjustment",
  "transfer_in",
  "transfer_out",
])

export const inventoryReservationStatus = pgEnum(
  "inventory_reservation_status",
  ["reserved", "committed", "released", "expired"]
)

export const cartStatus = pgEnum("cart_status", [
  "active",
  "converted",
  "abandoned",
  "expired",
])

export const orderStatus = pgEnum("order_status", [
  "pending",
  "confirmed",
  "processing",
  "partially_fulfilled",
  "fulfilled",
  "cancelled",
  "completed",
])

export const storeOrderStatus = pgEnum("store_order_status", [
  "pending",
  "accepted",
  "processing",
  "partially_fulfilled",
  "fulfilled",
  "cancelled",
  "completed",
])

export const fulfillmentKind = pgEnum("fulfillment_kind", [
  "physical",
  "digital",
  "service",
])

export const fulfillmentStatus = pgEnum("fulfillment_status", [
  "pending",
  "ready",
  "in_transit",
  "delivered",
  "failed",
  "cancelled",
  "returned",
])

export const returnStatus = pgEnum("return_status", [
  "requested",
  "approved",
  "rejected",
  "in_transit",
  "received",
  "completed",
  "cancelled",
])

export const entitlementStatus = pgEnum("entitlement_status", [
  "active",
  "suspended",
  "expired",
  "revoked",
])

export const bookingStatus = pgEnum("booking_status", [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
])

// SSO owns credentials and sessions. Marketplace only keeps its synchronized user.

// Merchant accounts and storefronts are Marketplace-owned business entities.
export const sellersTable = pgTable(
  "seller",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerUserId: uuid("owner_user_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "restrict" }),
    legalName: text("legal_name").notNull(),
    displayName: text("display_name").notNull(),
    slug: varchar("slug", { length: 160 }).notNull().unique(),
    status: sellerStatus("status").notNull().default("pending"),
    type: sellerType("type").notNull().default("individual"),
    businessRegistrationNumber: varchar("business_registration_number", {
      length: 128,
    }),
    taxIdentifier: varchar("tax_identifier", { length: 128 }),
    countryCode: varchar("country_code", { length: 2 }).notNull(),
    metadata: jsonb("metadata").notNull().default(sql.raw("'{}'::jsonb")),
    approvedAt: timestamp("approved_at", { mode: "date", withTimezone: true }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { mode: "date", withTimezone: true }),
  },
  (table) => [
    index("seller_owner_user_id_idx").on(table.ownerUserId),
    index("seller_status_idx").on(table.status),
  ]
)

export const sellerMembersTable = pgTable(
  "seller_member",
  {
    sellerId: uuid("seller_id")
      .notNull()
      .references(() => sellersTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    role: sellerMemberRole("role").notNull().default("support"),
    isActive: boolean("is_active").notNull().default(true),
    invitedByUserId: uuid("invited_by_user_id").references(() => userTable.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.sellerId, table.userId] }),
    index("seller_member_user_id_idx").on(table.userId),
    index("seller_member_role_idx").on(table.sellerId, table.role),
  ]
)

export const storesTable = pgTable(
  "store",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sellerId: uuid("seller_id")
      .notNull()
      .references(() => sellersTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: varchar("slug", { length: 160 }).notNull().unique(),
    description: text("description"),
    status: storeStatus("status").notNull().default("draft"),
    type: storeType("type").notNull().default("merchant"),
    badge: storeBadge("badge").notNull().default("standard"),
    defaultCurrency: varchar("default_currency", { length: 3 }).notNull(),
    countryCode: varchar("country_code", { length: 2 }).notNull(),
    timezone: varchar("timezone", { length: 64 }).notNull().default("UTC"),
    logoMediaId: text("logo_media_id"),
    bannerMediaId: text("banner_media_id"),
    policies: jsonb("policies").notNull().default(sql.raw("'{}'::jsonb")),
    metadata: jsonb("metadata").notNull().default(sql.raw("'{}'::jsonb")),
    publishedAt: timestamp("published_at", {
      mode: "date",
      withTimezone: true,
    }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { mode: "date", withTimezone: true }),
  },
  (table) => [
    unique("store_id_seller_id_unique").on(table.id, table.sellerId),
    index("store_seller_id_idx").on(table.sellerId),
    index("store_status_idx").on(table.status),
  ]
)

// Catalog taxonomy, canonical products, and identifiers are independent of sellers.
export const categoriesTable = pgTable(
  "category",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    parentId: uuid("parent_id"),
    code: varchar("code", { length: 96 }).notNull().unique(),
    name: text("name").notNull(),
    slug: varchar("slug", { length: 180 }).notNull().unique(),
    path: text("path").notNull().unique(),
    description: text("description"),
    iconMediaId: text("icon_media_id"),
    level: integer("level").notNull().default(0),
    position: integer("position").notNull().default(0),
    isLeaf: boolean("is_leaf").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    metadata: jsonb("metadata").notNull().default(sql.raw("'{}'::jsonb")),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
      name: "category_parent_id_fkey",
    }).onDelete("restrict"),
    index("category_parent_position_idx").on(table.parentId, table.position),
    index("category_active_idx").on(table.isActive),
    check("category_level_check", sql`${table.level} >= 0`),
    check("category_position_check", sql`${table.position} >= 0`),
  ]
)

export const categoryLocalizationsTable = pgTable(
  "category_localization",
  {
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categoriesTable.id, { onDelete: "cascade" }),
    locale: varchar("locale", { length: 16 }).notNull(),
    name: text("name").notNull(),
    slug: varchar("slug", { length: 180 }).notNull(),
    description: text("description"),
  },
  (table) => [
    primaryKey({ columns: [table.categoryId, table.locale] }),
    uniqueIndex("category_localization_locale_slug_unique").on(
      table.locale,
      table.slug
    ),
  ]
)

export const brandsTable = pgTable(
  "brand",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerSellerId: uuid("owner_seller_id").references(() => sellersTable.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    slug: varchar("slug", { length: 160 }).notNull().unique(),
    description: text("description"),
    logoMediaId: text("logo_media_id"),
    websiteUrl: text("website_url"),
    countryCode: varchar("country_code", { length: 2 }),
    isVerified: boolean("is_verified").notNull().default(false),
    metadata: jsonb("metadata").notNull().default(sql.raw("'{}'::jsonb")),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { mode: "date", withTimezone: true }),
  },
  (table) => [
    index("brand_owner_seller_id_idx").on(table.ownerSellerId),
    uniqueIndex("brand_name_lower_key").on(sql`lower(${table.name})`),
  ]
)

export const productsTable = pgTable(
  "product",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdBySellerId: uuid("created_by_seller_id").references(
      () => sellersTable.id,
      { onDelete: "set null" }
    ),
    brandId: uuid("brand_id").references(() => brandsTable.id, {
      onDelete: "set null",
    }),
    kind: productKind("kind").notNull().default("physical"),
    status: productStatus("status").notNull().default("draft"),
    title: text("title").notNull(),
    slug: varchar("slug", { length: 220 }).notNull().unique(),
    description: text("description"),
    modelNumber: varchar("model_number", { length: 128 }),
    manufacturer: text("manufacturer"),
    requiresShipping: boolean("requires_shipping").notNull().default(true),
    isTaxable: boolean("is_taxable").notNull().default(true),
    metadata: jsonb("metadata").notNull().default(sql.raw("'{}'::jsonb")),
    publishedAt: timestamp("published_at", {
      mode: "date",
      withTimezone: true,
    }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { mode: "date", withTimezone: true }),
  },
  (table) => [
    index("product_seller_id_idx").on(table.createdBySellerId),
    index("product_brand_id_idx").on(table.brandId),
    index("product_kind_status_idx").on(table.kind, table.status),
    index("product_published_at_idx").on(table.publishedAt),
  ]
)

export const productLocalizationsTable = pgTable(
  "product_localization",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => productsTable.id, { onDelete: "cascade" }),
    locale: varchar("locale", { length: 16 }).notNull(),
    title: text("title").notNull(),
    slug: varchar("slug", { length: 220 }).notNull(),
    description: text("description"),
  },
  (table) => [
    primaryKey({ columns: [table.productId, table.locale] }),
    uniqueIndex("product_localization_locale_slug_unique").on(
      table.locale,
      table.slug
    ),
  ]
)

export const productCategoriesTable = pgTable(
  "product_category",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => productsTable.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categoriesTable.id, { onDelete: "restrict" }),
    isPrimary: boolean("is_primary").notNull().default(false),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.productId, table.categoryId] }),
    uniqueIndex("product_category_primary_unique")
      .on(table.productId)
      .where(sql`${table.isPrimary}`),
    index("product_category_category_id_idx").on(table.categoryId),
  ]
)

export const productIdentifiersTable = pgTable(
  "product_identifier",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => productsTable.id, { onDelete: "cascade" }),
    kind: identifierKind("kind").notNull(),
    value: varchar("value", { length: 255 }).notNull(),
    authority: varchar("authority", { length: 128 }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("product_identifier_kind_value_unique").on(
      table.kind,
      table.value
    ),
    index("product_identifier_product_id_idx").on(table.productId),
  ]
)

// Attributes provide category-specific, typed metadata and variant dimensions.
export const attributesTable = pgTable(
  "attribute",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar("code", { length: 96 }).notNull().unique(),
    name: text("name").notNull(),
    dataType: attributeDataType("data_type").notNull(),
    unit: varchar("unit", { length: 32 }),
    isFilterable: boolean("is_filterable").notNull().default(false),
    isSearchable: boolean("is_searchable").notNull().default(false),
    allowsCustomValue: boolean("allows_custom_value").notNull().default(false),
    metadata: jsonb("metadata").notNull().default(sql.raw("'{}'::jsonb")),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("attribute_name_lower_key").on(sql`lower(${table.name})`),
  ]
)

export const attributeOptionsTable = pgTable(
  "attribute_option",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    attributeId: uuid("attribute_id")
      .notNull()
      .references(() => attributesTable.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 96 }).notNull(),
    label: text("label").notNull(),
    swatch: varchar("swatch", { length: 64 }),
    position: integer("position").notNull().default(0),
    metadata: jsonb("metadata").notNull().default(sql.raw("'{}'::jsonb")),
  },
  (table) => [
    unique("attribute_option_id_attribute_id_unique").on(
      table.id,
      table.attributeId
    ),
    uniqueIndex("attribute_option_attribute_code_unique").on(
      table.attributeId,
      table.code
    ),
    index("attribute_option_position_idx").on(
      table.attributeId,
      table.position
    ),
    check("attribute_option_position_check", sql`${table.position} >= 0`),
  ]
)

export const categoryAttributesTable = pgTable(
  "category_attribute",
  {
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categoriesTable.id, { onDelete: "cascade" }),
    attributeId: uuid("attribute_id")
      .notNull()
      .references(() => attributesTable.id, { onDelete: "restrict" }),
    isRequired: boolean("is_required").notNull().default(false),
    isVariant: boolean("is_variant").notNull().default(false),
    isFilterable: boolean("is_filterable").notNull().default(false),
    position: integer("position").notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.categoryId, table.attributeId] }),
    index("category_attribute_attribute_id_idx").on(table.attributeId),
    index("category_attribute_position_idx").on(
      table.categoryId,
      table.position
    ),
    check("category_attribute_position_check", sql`${table.position} >= 0`),
  ]
)

export const productAttributeValuesTable = pgTable(
  "product_attribute_value",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => productsTable.id, { onDelete: "cascade" }),
    attributeId: uuid("attribute_id")
      .notNull()
      .references(() => attributesTable.id, { onDelete: "restrict" }),
    optionId: uuid("option_id"),
    position: integer("position").notNull().default(0),
    valueText: text("value_text"),
    valueNumber: numeric("value_number", { precision: 24, scale: 8 }),
    valueBoolean: boolean("value_boolean"),
    valueDate: date("value_date", { mode: "string" }),
    valueJson: jsonb("value_json"),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.optionId, table.attributeId],
      foreignColumns: [
        attributeOptionsTable.id,
        attributeOptionsTable.attributeId,
      ],
      name: "product_attribute_value_option_attribute_fkey",
    }).onDelete("restrict"),
    uniqueIndex("product_attribute_value_position_unique").on(
      table.productId,
      table.attributeId,
      table.position
    ),
    index("product_attribute_value_attribute_idx").on(table.attributeId),
    index("product_attribute_value_option_idx").on(table.optionId),
    check(
      "product_attribute_value_position_check",
      sql`${table.position} >= 0`
    ),
    check(
      "product_attribute_value_single_value_check",
      sql`num_nonnulls(
        ${table.optionId},
        ${table.valueText},
        ${table.valueNumber},
        ${table.valueBoolean},
        ${table.valueDate},
        ${table.valueJson}
      ) = 1`
    ),
  ]
)

export const productVariantsTable = pgTable(
  "product_variant",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => productsTable.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 128 }).notNull(),
    title: text("title").notNull(),
    status: productStatus("status").notNull().default("draft"),
    weight: numeric("weight", { precision: 16, scale: 4 }),
    weightUnit: varchar("weight_unit", { length: 16 }),
    length: numeric("length", { precision: 16, scale: 4 }),
    width: numeric("width", { precision: 16, scale: 4 }),
    height: numeric("height", { precision: 16, scale: 4 }),
    dimensionUnit: varchar("dimension_unit", { length: 16 }),
    metadata: jsonb("metadata").notNull().default(sql.raw("'{}'::jsonb")),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { mode: "date", withTimezone: true }),
  },
  (table) => [
    unique("product_variant_id_product_id_unique").on(
      table.id,
      table.productId
    ),
    uniqueIndex("product_variant_product_code_unique").on(
      table.productId,
      table.code
    ),
    index("product_variant_status_idx").on(table.productId, table.status),
    check(
      "product_variant_measurement_check",
      sql`(${table.weight} IS NULL OR ${table.weight} >= 0)
        AND (${table.length} IS NULL OR ${table.length} >= 0)
        AND (${table.width} IS NULL OR ${table.width} >= 0)
        AND (${table.height} IS NULL OR ${table.height} >= 0)`
    ),
  ]
)

export const variantAttributeValuesTable = pgTable(
  "variant_attribute_value",
  {
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariantsTable.id, { onDelete: "cascade" }),
    attributeId: uuid("attribute_id")
      .notNull()
      .references(() => attributesTable.id, { onDelete: "restrict" }),
    optionId: uuid("option_id"),
    valueText: text("value_text"),
    valueNumber: numeric("value_number", { precision: 24, scale: 8 }),
    valueBoolean: boolean("value_boolean"),
    valueDate: date("value_date", { mode: "string" }),
    valueJson: jsonb("value_json"),
  },
  (table) => [
    foreignKey({
      columns: [table.optionId, table.attributeId],
      foreignColumns: [
        attributeOptionsTable.id,
        attributeOptionsTable.attributeId,
      ],
      name: "variant_attribute_value_option_attribute_fkey",
    }).onDelete("restrict"),
    primaryKey({ columns: [table.variantId, table.attributeId] }),
    index("variant_attribute_value_attribute_idx").on(table.attributeId),
    index("variant_attribute_value_option_idx").on(table.optionId),
    check(
      "variant_attribute_value_single_value_check",
      sql`num_nonnulls(
        ${table.optionId},
        ${table.valueText},
        ${table.valueNumber},
        ${table.valueBoolean},
        ${table.valueDate},
        ${table.valueJson}
      ) = 1`
    ),
  ]
)

// Media service owns files; Marketplace only owns their product placement references.
export const productMediaReferencesTable = pgTable(
  "product_media_reference",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => productsTable.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id"),
    mediaId: text("media_id").notNull(),
    role: mediaRole("role").notNull().default("gallery"),
    alt: text("alt"),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.variantId, table.productId],
      foreignColumns: [productVariantsTable.id, productVariantsTable.productId],
      name: "product_media_reference_variant_product_fkey",
    }).onDelete("cascade"),
    uniqueIndex("product_media_reference_media_unique").on(
      table.productId,
      table.mediaId
    ),
    index("product_media_reference_position_idx").on(
      table.productId,
      table.position
    ),
    index("product_media_reference_variant_id_idx").on(table.variantId),
    check(
      "product_media_reference_position_check",
      sql`${table.position} >= 0`
    ),
  ]
)

export const bundleComponentsTable = pgTable(
  "bundle_component",
  {
    bundleProductId: uuid("bundle_product_id")
      .notNull()
      .references(() => productsTable.id, { onDelete: "cascade" }),
    componentVariantId: uuid("component_variant_id")
      .notNull()
      .references(() => productVariantsTable.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull().default(1),
    position: integer("position").notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.bundleProductId, table.componentVariantId] }),
    index("bundle_component_variant_id_idx").on(table.componentVariantId),
    check("bundle_component_quantity_check", sql`${table.quantity} > 0`),
    check("bundle_component_position_check", sql`${table.position} >= 0`),
  ]
)

// Listings connect canonical catalog items to a store's price and sellable SKU.
export const listingsTable = pgTable(
  "listing",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => storesTable.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => productsTable.id, { onDelete: "restrict" }),
    code: varchar("code", { length: 128 }).notNull(),
    status: listingStatus("status").notNull().default("draft"),
    condition: listingCondition("condition").notNull().default("new"),
    titleOverride: text("title_override"),
    descriptionOverride: text("description_override"),
    currency: varchar("currency", { length: 3 }).notNull(),
    basePrice: numeric("base_price", { precision: 20, scale: 4 }).notNull(),
    compareAtPrice: numeric("compare_at_price", { precision: 20, scale: 4 }),
    minimumQuantity: integer("minimum_quantity").notNull().default(1),
    maximumQuantity: integer("maximum_quantity"),
    fulfillmentKind: fulfillmentKind("fulfillment_kind")
      .notNull()
      .default("physical"),
    handlingDays: integer("handling_days").notNull().default(0),
    availableFrom: timestamp("available_from", {
      mode: "date",
      withTimezone: true,
    }),
    availableUntil: timestamp("available_until", {
      mode: "date",
      withTimezone: true,
    }),
    metadata: jsonb("metadata").notNull().default(sql.raw("'{}'::jsonb")),
    publishedAt: timestamp("published_at", {
      mode: "date",
      withTimezone: true,
    }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { mode: "date", withTimezone: true }),
  },
  (table) => [
    unique("listing_id_store_id_unique").on(table.id, table.storeId),
    unique("listing_id_store_id_product_id_unique").on(
      table.id,
      table.storeId,
      table.productId
    ),
    uniqueIndex("listing_store_code_unique").on(table.storeId, table.code),
    index("listing_product_id_idx").on(table.productId),
    index("listing_store_status_idx").on(table.storeId, table.status),
    index("listing_published_at_idx").on(table.publishedAt),
    check("listing_base_price_check", sql`${table.basePrice} >= 0`),
    check(
      "listing_compare_at_price_check",
      sql`${table.compareAtPrice} IS NULL OR ${table.compareAtPrice} >= ${table.basePrice}`
    ),
    check("listing_minimum_quantity_check", sql`${table.minimumQuantity} > 0`),
    check(
      "listing_maximum_quantity_check",
      sql`${table.maximumQuantity} IS NULL OR ${table.maximumQuantity} >= ${table.minimumQuantity}`
    ),
    check("listing_handling_days_check", sql`${table.handlingDays} >= 0`),
  ]
)

export const listingVariantsTable = pgTable(
  "listing_variant",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listingId: uuid("listing_id").notNull(),
    storeId: uuid("store_id").notNull(),
    productId: uuid("product_id").notNull(),
    productVariantId: uuid("product_variant_id").notNull(),
    sellerSku: varchar("seller_sku", { length: 160 }).notNull(),
    barcode: varchar("barcode", { length: 160 }),
    status: listingStatus("status").notNull().default("draft"),
    price: numeric("price", { precision: 20, scale: 4 }).notNull(),
    compareAtPrice: numeric("compare_at_price", { precision: 20, scale: 4 }),
    metadata: jsonb("metadata").notNull().default(sql.raw("'{}'::jsonb")),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { mode: "date", withTimezone: true }),
  },
  (table) => [
    foreignKey({
      columns: [table.listingId, table.storeId, table.productId],
      foreignColumns: [
        listingsTable.id,
        listingsTable.storeId,
        listingsTable.productId,
      ],
      name: "listing_variant_listing_store_product_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.productVariantId, table.productId],
      foreignColumns: [productVariantsTable.id, productVariantsTable.productId],
      name: "listing_variant_product_variant_product_fkey",
    }).onDelete("restrict"),
    unique("listing_variant_id_store_id_unique").on(table.id, table.storeId),
    uniqueIndex("listing_variant_listing_product_variant_unique").on(
      table.listingId,
      table.productVariantId
    ),
    uniqueIndex("listing_variant_store_sku_unique").on(
      table.storeId,
      table.sellerSku
    ),
    index("listing_variant_product_variant_idx").on(table.productVariantId),
    index("listing_variant_status_idx").on(table.listingId, table.status),
    check("listing_variant_price_check", sql`${table.price} >= 0`),
    check(
      "listing_variant_compare_at_price_check",
      sql`${table.compareAtPrice} IS NULL OR ${table.compareAtPrice} >= ${table.price}`
    ),
  ]
)

// Marketplace owns stock accounting and fulfillment locations.
export const warehousesTable = pgTable(
  "warehouse",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => storesTable.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 96 }).notNull(),
    name: text("name").notNull(),
    contactName: text("contact_name"),
    phone: varchar("phone", { length: 32 }),
    line1: text("line_1").notNull(),
    line2: text("line_2"),
    ward: text("ward"),
    district: text("district"),
    province: text("province"),
    postalCode: varchar("postal_code", { length: 32 }),
    countryCode: varchar("country_code", { length: 2 }).notNull(),
    timezone: varchar("timezone", { length: 64 }).notNull().default("UTC"),
    isActive: boolean("is_active").notNull().default(true),
    metadata: jsonb("metadata").notNull().default(sql.raw("'{}'::jsonb")),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { mode: "date", withTimezone: true }),
  },
  (table) => [
    unique("warehouse_id_store_id_unique").on(table.id, table.storeId),
    uniqueIndex("warehouse_store_code_unique").on(table.storeId, table.code),
    index("warehouse_store_active_idx").on(table.storeId, table.isActive),
  ]
)

export const inventoryBalancesTable = pgTable(
  "inventory_balance",
  {
    warehouseId: uuid("warehouse_id").notNull(),
    listingVariantId: uuid("listing_variant_id").notNull(),
    storeId: uuid("store_id").notNull(),
    onHand: integer("on_hand").notNull().default(0),
    reserved: integer("reserved").notNull().default(0),
    safetyStock: integer("safety_stock").notNull().default(0),
    reorderPoint: integer("reorder_point").notNull().default(0),
    version: integer("version").notNull().default(0),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.warehouseId, table.storeId],
      foreignColumns: [warehousesTable.id, warehousesTable.storeId],
      name: "inventory_balance_warehouse_store_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.listingVariantId, table.storeId],
      foreignColumns: [listingVariantsTable.id, listingVariantsTable.storeId],
      name: "inventory_balance_listing_variant_store_fkey",
    }).onDelete("cascade"),
    primaryKey({ columns: [table.warehouseId, table.listingVariantId] }),
    index("inventory_balance_listing_variant_idx").on(table.listingVariantId),
    check("inventory_balance_on_hand_check", sql`${table.onHand} >= 0`),
    check("inventory_balance_reserved_check", sql`${table.reserved} >= 0`),
    check(
      "inventory_balance_reserved_on_hand_check",
      sql`${table.reserved} <= ${table.onHand}`
    ),
    check(
      "inventory_balance_safety_stock_check",
      sql`${table.safetyStock} >= 0`
    ),
    check(
      "inventory_balance_reorder_point_check",
      sql`${table.reorderPoint} >= 0`
    ),
    check("inventory_balance_version_check", sql`${table.version} >= 0`),
  ]
)

export const inventoryMovementsTable = pgTable(
  "inventory_movement",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    warehouseId: uuid("warehouse_id").notNull(),
    listingVariantId: uuid("listing_variant_id").notNull(),
    kind: inventoryMovementKind("kind").notNull(),
    quantityDelta: integer("quantity_delta").notNull(),
    quantityBefore: integer("quantity_before").notNull(),
    quantityAfter: integer("quantity_after").notNull(),
    referenceType: varchar("reference_type", { length: 64 }),
    referenceId: text("reference_id"),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    actorUserId: uuid("actor_user_id").references(() => userTable.id, {
      onDelete: "set null",
    }),
    note: text("note"),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.warehouseId, table.listingVariantId],
      foreignColumns: [
        inventoryBalancesTable.warehouseId,
        inventoryBalancesTable.listingVariantId,
      ],
      name: "inventory_movement_balance_fkey",
    }).onDelete("restrict"),
    index("inventory_movement_variant_created_idx").on(
      table.listingVariantId,
      table.createdAt
    ),
    index("inventory_movement_reference_idx").on(
      table.referenceType,
      table.referenceId
    ),
    check("inventory_movement_delta_check", sql`${table.quantityDelta} <> 0`),
    check("inventory_movement_before_check", sql`${table.quantityBefore} >= 0`),
    check("inventory_movement_after_check", sql`${table.quantityAfter} >= 0`),
  ]
)

// Shipping and billing addresses are commerce data, not SSO profile data.
export const customerAddressesTable = pgTable(
  "customer_address",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    label: varchar("label", { length: 64 }),
    recipientName: text("recipient_name").notNull(),
    phone: varchar("phone", { length: 32 }).notNull(),
    line1: text("line_1").notNull(),
    line2: text("line_2"),
    ward: text("ward"),
    district: text("district"),
    province: text("province"),
    postalCode: varchar("postal_code", { length: 32 }),
    countryCode: varchar("country_code", { length: 2 }).notNull(),
    latitude: numeric("latitude", { precision: 10, scale: 7 }),
    longitude: numeric("longitude", { precision: 10, scale: 7 }),
    isDefaultShipping: boolean("is_default_shipping").notNull().default(false),
    isDefaultBilling: boolean("is_default_billing").notNull().default(false),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { mode: "date", withTimezone: true }),
  },
  (table) => [
    index("customer_address_user_id_idx").on(table.userId),
    uniqueIndex("customer_address_default_shipping_unique")
      .on(table.userId)
      .where(sql`${table.isDefaultShipping} AND ${table.deletedAt} IS NULL`),
    uniqueIndex("customer_address_default_billing_unique")
      .on(table.userId)
      .where(sql`${table.isDefaultBilling} AND ${table.deletedAt} IS NULL`),
    check(
      "customer_address_latitude_check",
      sql`${table.latitude} IS NULL OR ${table.latitude} BETWEEN -90 AND 90`
    ),
    check(
      "customer_address_longitude_check",
      sql`${table.longitude} IS NULL OR ${table.longitude} BETWEEN -180 AND 180`
    ),
  ]
)

export const cartsTable = pgTable(
  "cart",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => userTable.id, {
      onDelete: "cascade",
    }),
    guestTokenHash: text("guest_token_hash").unique(),
    status: cartStatus("status").notNull().default("active"),
    currency: varchar("currency", { length: 3 }).notNull(),
    expiresAt: timestamp("expires_at", { mode: "date", withTimezone: true }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("cart_user_active_currency_unique")
      .on(table.userId, table.currency)
      .where(sql`${table.userId} IS NOT NULL AND ${table.status} = 'active'`),
    uniqueIndex("cart_guest_active_currency_unique")
      .on(table.guestTokenHash, table.currency)
      .where(
        sql`${table.guestTokenHash} IS NOT NULL AND ${table.status} = 'active'`
      ),
    index("cart_user_status_idx").on(table.userId, table.status),
    index("cart_expires_at_idx").on(table.expiresAt),
    check(
      "cart_owner_check",
      sql`${table.userId} IS NOT NULL OR ${table.guestTokenHash} IS NOT NULL`
    ),
  ]
)

export const cartItemsTable = pgTable(
  "cart_item",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cartId: uuid("cart_id")
      .notNull()
      .references(() => cartsTable.id, { onDelete: "cascade" }),
    listingVariantId: uuid("listing_variant_id")
      .notNull()
      .references(() => listingVariantsTable.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull().default(1),
    unitPriceSnapshot: numeric("unit_price_snapshot", {
      precision: 20,
      scale: 4,
    }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    metadata: jsonb("metadata").notNull().default(sql.raw("'{}'::jsonb")),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("cart_item_cart_variant_unique").on(
      table.cartId,
      table.listingVariantId
    ),
    index("cart_item_listing_variant_idx").on(table.listingVariantId),
    check("cart_item_quantity_check", sql`${table.quantity} > 0`),
    check("cart_item_unit_price_check", sql`${table.unitPriceSnapshot} >= 0`),
  ]
)

// Checkout captures immutable prices; Payment and Billing remain external authorities.
export const ordersTable = pgTable(
  "order",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderNumber: varchar("order_number", { length: 64 }).notNull().unique(),
    buyerUserId: uuid("buyer_user_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "restrict" }),
    cartId: uuid("cart_id").references(() => cartsTable.id, {
      onDelete: "set null",
    }),
    status: orderStatus("status").notNull().default("pending"),
    currency: varchar("currency", { length: 3 }).notNull(),
    merchandiseSubtotal: numeric("merchandise_subtotal", {
      precision: 20,
      scale: 4,
    }).notNull(),
    discountTotal: numeric("discount_total", {
      precision: 20,
      scale: 4,
    })
      .notNull()
      .default("0"),
    shippingTotal: numeric("shipping_total", {
      precision: 20,
      scale: 4,
    })
      .notNull()
      .default("0"),
    taxTotal: numeric("tax_total", { precision: 20, scale: 4 })
      .notNull()
      .default("0"),
    grandTotal: numeric("grand_total", { precision: 20, scale: 4 }).notNull(),
    paymentReference: text("payment_reference"),
    paymentStatusSnapshot: varchar("payment_status_snapshot", { length: 64 }),
    billingReference: text("billing_reference"),
    pricingSnapshot: jsonb("pricing_snapshot")
      .notNull()
      .default(sql.raw("'{}'::jsonb")),
    note: text("note"),
    cancellationReason: text("cancellation_reason"),
    placedAt: timestamp("placed_at", { mode: "date", withTimezone: true }),
    confirmedAt: timestamp("confirmed_at", {
      mode: "date",
      withTimezone: true,
    }),
    cancelledAt: timestamp("cancelled_at", {
      mode: "date",
      withTimezone: true,
    }),
    completedAt: timestamp("completed_at", {
      mode: "date",
      withTimezone: true,
    }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("order_buyer_created_idx").on(table.buyerUserId, table.createdAt),
    index("order_status_created_idx").on(table.status, table.createdAt),
    index("order_payment_reference_idx").on(table.paymentReference),
    check(
      "order_amount_check",
      sql`${table.merchandiseSubtotal} >= 0
        AND ${table.discountTotal} >= 0
        AND ${table.shippingTotal} >= 0
        AND ${table.taxTotal} >= 0
        AND ${table.grandTotal} >= 0`
    ),
    check(
      "order_total_check",
      sql`${table.grandTotal} = ${table.merchandiseSubtotal} - ${table.discountTotal} + ${table.shippingTotal} + ${table.taxTotal}`
    ),
  ]
)

export const orderAddressesTable = pgTable(
  "order_address",
  {
    orderId: uuid("order_id")
      .notNull()
      .references(() => ordersTable.id, { onDelete: "cascade" }),
    kind: varchar("kind", { length: 16 }).notNull(),
    recipientName: text("recipient_name").notNull(),
    phone: varchar("phone", { length: 32 }).notNull(),
    line1: text("line_1").notNull(),
    line2: text("line_2"),
    ward: text("ward"),
    district: text("district"),
    province: text("province"),
    postalCode: varchar("postal_code", { length: 32 }),
    countryCode: varchar("country_code", { length: 2 }).notNull(),
    metadata: jsonb("metadata").notNull().default(sql.raw("'{}'::jsonb")),
  },
  (table) => [
    primaryKey({ columns: [table.orderId, table.kind] }),
    check(
      "order_address_kind_check",
      sql`${table.kind} IN ('shipping', 'billing')`
    ),
  ]
)

export const storeOrdersTable = pgTable(
  "store_order",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => ordersTable.id, { onDelete: "cascade" }),
    storeId: uuid("store_id")
      .notNull()
      .references(() => storesTable.id, { onDelete: "restrict" }),
    storeOrderNumber: varchar("store_order_number", { length: 72 })
      .notNull()
      .unique(),
    status: storeOrderStatus("status").notNull().default("pending"),
    merchandiseSubtotal: numeric("merchandise_subtotal", {
      precision: 20,
      scale: 4,
    }).notNull(),
    discountTotal: numeric("discount_total", {
      precision: 20,
      scale: 4,
    })
      .notNull()
      .default("0"),
    shippingTotal: numeric("shipping_total", {
      precision: 20,
      scale: 4,
    })
      .notNull()
      .default("0"),
    taxTotal: numeric("tax_total", { precision: 20, scale: 4 })
      .notNull()
      .default("0"),
    grandTotal: numeric("grand_total", { precision: 20, scale: 4 }).notNull(),
    acceptedAt: timestamp("accepted_at", { mode: "date", withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", {
      mode: "date",
      withTimezone: true,
    }),
    completedAt: timestamp("completed_at", {
      mode: "date",
      withTimezone: true,
    }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("store_order_id_store_id_unique").on(table.id, table.storeId),
    unique("store_order_id_order_id_unique").on(table.id, table.orderId),
    uniqueIndex("store_order_order_store_unique").on(
      table.orderId,
      table.storeId
    ),
    index("store_order_store_status_idx").on(table.storeId, table.status),
    index("store_order_order_id_idx").on(table.orderId),
    check(
      "store_order_amount_check",
      sql`${table.merchandiseSubtotal} >= 0
        AND ${table.discountTotal} >= 0
        AND ${table.shippingTotal} >= 0
        AND ${table.taxTotal} >= 0
        AND ${table.grandTotal} >= 0`
    ),
    check(
      "store_order_total_check",
      sql`${table.grandTotal} = ${table.merchandiseSubtotal} - ${table.discountTotal} + ${table.shippingTotal} + ${table.taxTotal}`
    ),
  ]
)

export const orderItemsTable = pgTable(
  "order_item",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeOrderId: uuid("store_order_id")
      .notNull()
      .references(() => storeOrdersTable.id, { onDelete: "cascade" }),
    listingId: uuid("listing_id").references(() => listingsTable.id, {
      onDelete: "set null",
    }),
    listingVariantId: uuid("listing_variant_id").references(
      () => listingVariantsTable.id,
      { onDelete: "set null" }
    ),
    productId: uuid("product_id").references(() => productsTable.id, {
      onDelete: "set null",
    }),
    productVariantId: uuid("product_variant_id").references(
      () => productVariantsTable.id,
      { onDelete: "set null" }
    ),
    productTitle: text("product_title").notNull(),
    variantTitle: text("variant_title"),
    sellerSku: varchar("seller_sku", { length: 160 }).notNull(),
    quantity: integer("quantity").notNull(),
    unitPrice: numeric("unit_price", { precision: 20, scale: 4 }).notNull(),
    discountTotal: numeric("discount_total", {
      precision: 20,
      scale: 4,
    })
      .notNull()
      .default("0"),
    taxTotal: numeric("tax_total", { precision: 20, scale: 4 })
      .notNull()
      .default("0"),
    lineTotal: numeric("line_total", { precision: 20, scale: 4 }).notNull(),
    productSnapshot: jsonb("product_snapshot")
      .notNull()
      .default(sql.raw("'{}'::jsonb")),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("order_item_store_order_id_idx").on(table.storeOrderId),
    index("order_item_listing_variant_id_idx").on(table.listingVariantId),
    index("order_item_product_id_idx").on(table.productId),
    check("order_item_quantity_check", sql`${table.quantity} > 0`),
    check(
      "order_item_amount_check",
      sql`${table.unitPrice} >= 0
        AND ${table.discountTotal} >= 0
        AND ${table.taxTotal} >= 0
        AND ${table.lineTotal} >= 0`
    ),
    check(
      "order_item_total_check",
      sql`${table.lineTotal} = (${table.unitPrice} * ${table.quantity}) - ${table.discountTotal} + ${table.taxTotal}`
    ),
  ]
)

export const orderStatusEventsTable = pgTable(
  "order_status_event",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => ordersTable.id, { onDelete: "cascade" }),
    storeOrderId: uuid("store_order_id").references(() => storeOrdersTable.id, {
      onDelete: "cascade",
    }),
    status: varchar("status", { length: 64 }).notNull(),
    actorUserId: uuid("actor_user_id").references(() => userTable.id, {
      onDelete: "set null",
    }),
    source: varchar("source", { length: 64 }).notNull().default("marketplace"),
    note: text("note"),
    metadata: jsonb("metadata").notNull().default(sql.raw("'{}'::jsonb")),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("order_status_event_order_created_idx").on(
      table.orderId,
      table.createdAt
    ),
    index("order_status_event_store_order_idx").on(table.storeOrderId),
  ]
)

export const inventoryReservationsTable = pgTable(
  "inventory_reservation",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    warehouseId: uuid("warehouse_id").notNull(),
    listingVariantId: uuid("listing_variant_id").notNull(),
    cartId: uuid("cart_id").references(() => cartsTable.id, {
      onDelete: "cascade",
    }),
    orderId: uuid("order_id").references(() => ordersTable.id, {
      onDelete: "cascade",
    }),
    quantity: integer("quantity").notNull(),
    status: inventoryReservationStatus("status").notNull().default("reserved"),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    expiresAt: timestamp("expires_at", { mode: "date", withTimezone: true }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.warehouseId, table.listingVariantId],
      foreignColumns: [
        inventoryBalancesTable.warehouseId,
        inventoryBalancesTable.listingVariantId,
      ],
      name: "inventory_reservation_balance_fkey",
    }).onDelete("restrict"),
    index("inventory_reservation_cart_id_idx").on(table.cartId),
    index("inventory_reservation_order_id_idx").on(table.orderId),
    index("inventory_reservation_expiry_idx").on(table.status, table.expiresAt),
    check("inventory_reservation_quantity_check", sql`${table.quantity} > 0`),
    check(
      "inventory_reservation_owner_check",
      sql`${table.cartId} IS NOT NULL OR ${table.orderId} IS NOT NULL`
    ),
  ]
)

// Fulfillment, return workflow, digital access, and service bookings follow an order.
export const fulfillmentsTable = pgTable(
  "fulfillment",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeOrderId: uuid("store_order_id").notNull(),
    storeId: uuid("store_id").notNull(),
    warehouseId: uuid("warehouse_id"),
    kind: fulfillmentKind("kind").notNull(),
    status: fulfillmentStatus("status").notNull().default("pending"),
    carrierCode: varchar("carrier_code", { length: 96 }),
    serviceCode: varchar("service_code", { length: 96 }),
    trackingNumber: varchar("tracking_number", { length: 160 }),
    providerReference: text("provider_reference"),
    packageSnapshot: jsonb("package_snapshot")
      .notNull()
      .default(sql.raw("'{}'::jsonb")),
    shippedAt: timestamp("shipped_at", { mode: "date", withTimezone: true }),
    deliveredAt: timestamp("delivered_at", {
      mode: "date",
      withTimezone: true,
    }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.storeOrderId, table.storeId],
      foreignColumns: [storeOrdersTable.id, storeOrdersTable.storeId],
      name: "fulfillment_store_order_store_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.warehouseId, table.storeId],
      foreignColumns: [warehousesTable.id, warehousesTable.storeId],
      name: "fulfillment_warehouse_store_fkey",
    }).onDelete("restrict"),
    index("fulfillment_store_order_status_idx").on(
      table.storeOrderId,
      table.status
    ),
    index("fulfillment_tracking_number_idx").on(table.trackingNumber),
    index("fulfillment_provider_reference_idx").on(table.providerReference),
  ]
)

export const fulfillmentItemsTable = pgTable(
  "fulfillment_item",
  {
    fulfillmentId: uuid("fulfillment_id")
      .notNull()
      .references(() => fulfillmentsTable.id, { onDelete: "cascade" }),
    orderItemId: uuid("order_item_id")
      .notNull()
      .references(() => orderItemsTable.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.fulfillmentId, table.orderItemId] }),
    index("fulfillment_item_order_item_idx").on(table.orderItemId),
    check("fulfillment_item_quantity_check", sql`${table.quantity} > 0`),
  ]
)

export const returnRequestsTable = pgTable(
  "return_request",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    returnNumber: varchar("return_number", { length: 72 }).notNull().unique(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => ordersTable.id, { onDelete: "restrict" }),
    storeOrderId: uuid("store_order_id").notNull(),
    buyerUserId: uuid("buyer_user_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "restrict" }),
    status: returnStatus("status").notNull().default("requested"),
    reasonCode: varchar("reason_code", { length: 96 }).notNull(),
    description: text("description"),
    resolution: varchar("resolution", { length: 64 }),
    paymentRefundReference: text("payment_refund_reference"),
    requestedAt: timestamp("requested_at", {
      mode: "date",
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
    approvedAt: timestamp("approved_at", { mode: "date", withTimezone: true }),
    receivedAt: timestamp("received_at", { mode: "date", withTimezone: true }),
    completedAt: timestamp("completed_at", {
      mode: "date",
      withTimezone: true,
    }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.storeOrderId, table.orderId],
      foreignColumns: [storeOrdersTable.id, storeOrdersTable.orderId],
      name: "return_request_store_order_order_fkey",
    }).onDelete("restrict"),
    index("return_request_buyer_created_idx").on(
      table.buyerUserId,
      table.createdAt
    ),
    index("return_request_store_status_idx").on(
      table.storeOrderId,
      table.status
    ),
    index("return_request_payment_refund_idx").on(table.paymentRefundReference),
  ]
)

export const returnItemsTable = pgTable(
  "return_item",
  {
    returnRequestId: uuid("return_request_id")
      .notNull()
      .references(() => returnRequestsTable.id, { onDelete: "cascade" }),
    orderItemId: uuid("order_item_id")
      .notNull()
      .references(() => orderItemsTable.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull(),
    receivedQuantity: integer("received_quantity").notNull().default(0),
    reason: text("reason"),
    condition: varchar("condition", { length: 64 }),
    resolution: varchar("resolution", { length: 64 }),
  },
  (table) => [
    primaryKey({ columns: [table.returnRequestId, table.orderItemId] }),
    index("return_item_order_item_idx").on(table.orderItemId),
    check("return_item_quantity_check", sql`${table.quantity} > 0`),
    check(
      "return_item_received_quantity_check",
      sql`${table.receivedQuantity} >= 0 AND ${table.receivedQuantity} <= ${table.quantity}`
    ),
  ]
)

export const digitalEntitlementsTable = pgTable(
  "digital_entitlement",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderItemId: uuid("order_item_id")
      .notNull()
      .references(() => orderItemsTable.id, { onDelete: "restrict" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "restrict" }),
    mediaId: text("media_id").notNull(),
    status: entitlementStatus("status").notNull().default("active"),
    licenseReference: text("license_reference"),
    downloadLimit: integer("download_limit"),
    downloadCount: integer("download_count").notNull().default(0),
    startsAt: timestamp("starts_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { mode: "date", withTimezone: true }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("digital_entitlement_item_media_unique").on(
      table.orderItemId,
      table.mediaId
    ),
    index("digital_entitlement_user_status_idx").on(table.userId, table.status),
    check(
      "digital_entitlement_download_limit_check",
      sql`${table.downloadLimit} IS NULL OR ${table.downloadLimit} >= 0`
    ),
    check(
      "digital_entitlement_download_count_check",
      sql`${table.downloadCount} >= 0`
    ),
  ]
)

export const serviceBookingsTable = pgTable(
  "service_booking",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderItemId: uuid("order_item_id")
      .notNull()
      .unique()
      .references(() => orderItemsTable.id, { onDelete: "restrict" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "restrict" }),
    storeId: uuid("store_id")
      .notNull()
      .references(() => storesTable.id, { onDelete: "restrict" }),
    status: bookingStatus("status").notNull().default("pending"),
    startsAt: timestamp("starts_at", {
      mode: "date",
      withTimezone: true,
    }).notNull(),
    endsAt: timestamp("ends_at", {
      mode: "date",
      withTimezone: true,
    }).notNull(),
    timezone: varchar("timezone", { length: 64 }).notNull(),
    locationSnapshot: jsonb("location_snapshot")
      .notNull()
      .default(sql.raw("'{}'::jsonb")),
    note: text("note"),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("service_booking_store_starts_idx").on(table.storeId, table.startsAt),
    index("service_booking_user_status_idx").on(table.userId, table.status),
    check(
      "service_booking_time_check",
      sql`${table.endsAt} > ${table.startsAt}`
    ),
  ]
)

export type User = typeof userTable.$inferSelect
export type NewUser = typeof userTable.$inferInsert
export type Seller = typeof sellersTable.$inferSelect
export type SellerMember = typeof sellerMembersTable.$inferSelect
export type Store = typeof storesTable.$inferSelect
export type Category = typeof categoriesTable.$inferSelect
export type CategoryLocalization =
  typeof categoryLocalizationsTable.$inferSelect
export type Brand = typeof brandsTable.$inferSelect
export type Product = typeof productsTable.$inferSelect
export type ProductLocalization = typeof productLocalizationsTable.$inferSelect
export type ProductCategory = typeof productCategoriesTable.$inferSelect
export type ProductIdentifier = typeof productIdentifiersTable.$inferSelect
export type Attribute = typeof attributesTable.$inferSelect
export type AttributeOption = typeof attributeOptionsTable.$inferSelect
export type CategoryAttribute = typeof categoryAttributesTable.$inferSelect
export type ProductAttributeValue =
  typeof productAttributeValuesTable.$inferSelect
export type ProductVariant = typeof productVariantsTable.$inferSelect
export type VariantAttributeValue =
  typeof variantAttributeValuesTable.$inferSelect
export type ProductMediaReference =
  typeof productMediaReferencesTable.$inferSelect
export type BundleComponent = typeof bundleComponentsTable.$inferSelect
export type Listing = typeof listingsTable.$inferSelect
export type ListingVariant = typeof listingVariantsTable.$inferSelect
export type Warehouse = typeof warehousesTable.$inferSelect
export type InventoryBalance = typeof inventoryBalancesTable.$inferSelect
export type InventoryMovement = typeof inventoryMovementsTable.$inferSelect
export type CustomerAddress = typeof customerAddressesTable.$inferSelect
export type Cart = typeof cartsTable.$inferSelect
export type CartItem = typeof cartItemsTable.$inferSelect
export type Order = typeof ordersTable.$inferSelect
export type OrderAddress = typeof orderAddressesTable.$inferSelect
export type StoreOrder = typeof storeOrdersTable.$inferSelect
export type OrderItem = typeof orderItemsTable.$inferSelect
export type OrderStatusEvent = typeof orderStatusEventsTable.$inferSelect
export type InventoryReservation =
  typeof inventoryReservationsTable.$inferSelect
export type Fulfillment = typeof fulfillmentsTable.$inferSelect
export type FulfillmentItem = typeof fulfillmentItemsTable.$inferSelect
export type ReturnRequest = typeof returnRequestsTable.$inferSelect
export type ReturnItem = typeof returnItemsTable.$inferSelect
export type DigitalEntitlement = typeof digitalEntitlementsTable.$inferSelect
export type ServiceBooking = typeof serviceBookingsTable.$inferSelect

export type SellerStatus = (typeof sellerStatus.enumValues)[number]
export type SellerType = (typeof sellerType.enumValues)[number]
export type SellerMemberRole = (typeof sellerMemberRole.enumValues)[number]
export type StoreStatus = (typeof storeStatus.enumValues)[number]
export type StoreType = (typeof storeType.enumValues)[number]
export type StoreBadge = (typeof storeBadge.enumValues)[number]
export type ProductKind = (typeof productKind.enumValues)[number]
export type ProductStatus = (typeof productStatus.enumValues)[number]
export type IdentifierKind = (typeof identifierKind.enumValues)[number]
export type AttributeDataType = (typeof attributeDataType.enumValues)[number]
export type MediaRole = (typeof mediaRole.enumValues)[number]
export type ListingCondition = (typeof listingCondition.enumValues)[number]
export type ListingStatus = (typeof listingStatus.enumValues)[number]
export type InventoryMovementKind =
  (typeof inventoryMovementKind.enumValues)[number]
export type InventoryReservationStatus =
  (typeof inventoryReservationStatus.enumValues)[number]
export type CartStatus = (typeof cartStatus.enumValues)[number]
export type OrderStatus = (typeof orderStatus.enumValues)[number]
export type StoreOrderStatus = (typeof storeOrderStatus.enumValues)[number]
export type FulfillmentKind = (typeof fulfillmentKind.enumValues)[number]
export type FulfillmentStatus = (typeof fulfillmentStatus.enumValues)[number]
export type ReturnStatus = (typeof returnStatus.enumValues)[number]
export type EntitlementStatus = (typeof entitlementStatus.enumValues)[number]
export type BookingStatus = (typeof bookingStatus.enumValues)[number]

// Shared operational tables used by the Hono server on serverless runtimes.
export const rateLimitTable = pgTable("rate_limit", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
})
