import { Pool } from "@gorth/structure/cores/pg"

import { databaseUrl } from "@/utils/environment"

// Demo catalog inspired by the 14 category names in the referenced Sneat demo.
// Slugs/SKUs are isolated, and every insert is conflict-safe for repeat runs.
const categories = [
  { name: "Smart Phone", slug: "smart-phone", brand: "Gorth Mobile", items: ["Nova 5G Phone", "Edge Pro Phone", "Compact Plus Phone", "Vision Ultra Phone", "Core Lite Phone", "Orbit Fold Phone", "Studio Camera Phone", "Active 5G Phone", "Mini Everyday Phone", "Max Battery Phone"] },
  { name: "Electronics", slug: "electronics", brand: "Gorth Electronics", items: ["Wireless Earbuds", "Portable Charger", "Smart Display", "Bluetooth Speaker", "USB-C Hub", "Action Camera", "Home Projector", "Noise Cancelling Headphones", "Streaming Stick", "Wi-Fi Router"] },
  { name: "Clocks", slug: "clocks", brand: "Gorth Time", items: ["Minimal Wall Clock", "Digital Alarm Clock", "Wooden Desk Clock", "World Time Clock", "Silent Bedroom Clock", "LED Bedside Clock", "Retro Mantel Clock", "Travel Alarm Clock", "Outdoor Weather Clock", "Modern Kitchen Clock"] },
  { name: "Shoes", slug: "shoes", brand: "Gorth Footwear", items: ["Everyday Sneakers", "Trail Running Shoes", "Leather Loafers", "Canvas Slip-Ons", "Classic Sandals", "Training Shoes", "City Walking Shoes", "Waterproof Boots", "Minimal Court Shoes", "Comfort Flats"] },
  { name: "Accessories", slug: "accessories", brand: "Gorth Essentials", items: ["Leather Card Holder", "Canvas Tote Bag", "Travel Organizer", "Stainless Key Ring", "Everyday Sunglasses", "Phone Case", "Laptop Sleeve", "Compact Umbrella", "Crossbody Bag", "Reusable Water Bottle"] },
  { name: "Games", slug: "games", brand: "Gorth Play", items: ["Strategy Board Game", "Family Card Game", "Puzzle Adventure Game", "VR Explorer Game", "Racing Party Game", "Classic Chess Set", "Portable Game Controller", "Cooperative Mystery Game", "Building Blocks Set", "Retro Arcade Game"] },
  { name: "Home Decor", slug: "home-decor", brand: "Gorth Living", items: ["Ceramic Flower Vase", "Linen Cushion Cover", "Framed Wall Print", "Table Lamp", "Woven Storage Basket", "Cotton Throw Blanket", "Decorative Mirror", "Scented Candle Set", "Floating Shelf", "Indoor Planter"] },
  { name: "Travel", slug: "travel", brand: "Gorth Journey", items: ["Carry-On Suitcase", "Packing Cube Set", "Neck Pillow", "Passport Wallet", "Travel Adapter", "Daypack", "Toiletry Bag", "Luggage Tag Set", "Compact Travel Towel", "Waterproof Duffel Bag"] },
  { name: "Baby Products", slug: "baby-products", brand: "Gorth Baby", items: ["Soft Cotton Blanket", "Baby Feeding Set", "Stroller Organizer", "Gentle Bath Towel", "Wooden Rattle", "Diaper Caddy", "Silicone Teether", "Baby Play Mat", "Toddler Cup", "Nursery Night Light"] },
  { name: "Jewellery", slug: "jewellery", brand: "Gorth Jewel", items: ["Silver Pendant", "Gold-Tone Hoop Earrings", "Minimal Chain Bracelet", "Gemstone Ring", "Pearl Stud Earrings", "Layered Necklace", "Engraved Cuff", "Birthstone Pendant", "Classic Watch Band", "Charm Bracelet"] },
  { name: "Grocery", slug: "grocery", brand: "Gorth Pantry", items: ["Organic Coffee Beans", "Whole Grain Oats", "Extra Virgin Olive Oil", "Herbal Tea Collection", "Dark Chocolate Bar", "Mixed Nuts", "Wildflower Honey", "Pasta Variety Pack", "Sea Salt Flakes", "Dried Fruit Mix"] },
  { name: "Clothing", slug: "clothing", brand: "Gorth Wear", items: ["Cotton Crew T-Shirt", "Relaxed Fit Jeans", "Linen Shirt", "Everyday Hoodie", "Lightweight Jacket", "Summer Dress", "Merino Sweater", "Chino Trousers", "Polo Shirt", "Denim Overshirt"] },
  { name: "Books", slug: "books", brand: "Gorth Books", items: ["Modern Design Handbook", "World History Atlas", "Everyday Cooking Guide", "Science Explorer Book", "Creative Writing Journal", "Travel Photography Book", "Mindful Living Guide", "Introduction to Astronomy", "Business Strategy Reader", "Children's Story Collection"] },
  { name: "Beauty & Personal Care", slug: "beauty-personal-care", brand: "Gorth Care", items: ["Hydrating Face Cream", "Gentle Daily Cleanser", "Mineral Sunscreen", "Nourishing Hair Mask", "Vitamin C Serum", "Body Lotion", "Lip Care Balm", "Hand Cream", "Shampoo Bar", "Relaxing Bath Set"] },
]

if (!databaseUrl) throw new Error("DATABASE_URL is required")

const pool = new Pool({ connectionString: databaseUrl, max: 1 })

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

async function insertMany(client, table, columns, rows, conflict = "DO NOTHING") {
  if (!rows.length) return
  const values = rows.flat()
  const placeholders = rows.map((row, rowIndex) =>
    `(${row.map((_, columnIndex) => `$${rowIndex * columns.length + columnIndex + 1}`).join(",")})`
  )
  await client.query(
    `INSERT INTO "${table}" (${columns.map((column) => `"${column}"`).join(",")}) VALUES ${placeholders.join(",")} ON CONFLICT ${conflict}`,
    values
  )
}

async function ensureOne(client, table, key, fields) {
  const columns = Object.keys(fields)
  await insertMany(client, table, columns, [Object.values(fields)])
  const { rows } = await client.query(`SELECT id FROM "${table}" WHERE "${key}" = $1`, [fields[key]])
  if (!rows[0]) throw new Error(`seed_${table}_failed`)
  return rows[0].id
}

async function idsBy(client, table, key, keys) {
  const { rows } = await client.query(`SELECT id, "${key}" AS key FROM "${table}" WHERE "${key}" = ANY($1)`, [keys])
  return new Map(rows.map((row) => [row.key, row.id]))
}

const client = await pool.connect()
try {
  await client.query("BEGIN")

  const userId = await ensureOne(client, "user", "external_user_id", {
    external_user_id: "marketplace-demo-catalog",
    name: "Marketplace Demo Catalog",
    email: "catalog-seed@example.invalid",
    role: "user",
  })
  const sellerId = await ensureOne(client, "seller", "slug", {
    owner_user_id: userId,
    legal_name: "Gorth Demo Catalog",
    display_name: "Gorth Demo",
    slug: "gorth-demo-catalog",
    status: "active",
    country_code: "US",
  })
  const storeId = await ensureOne(client, "store", "slug", {
    seller_id: sellerId,
    name: "Gorth Demo Store",
    slug: "gorth-demo-store",
    description: "Sample products for the Marketplace catalog.",
    status: "active",
    default_currency: "USD",
    country_code: "US",
    published_at: new Date(),
  })
  const warehouseId = await ensureOne(client, "warehouse", "code", {
    store_id: storeId,
    code: "demo-main",
    name: "Demo Warehouse",
    line_1: "100 Demo Street",
    country_code: "US",
  })

  await insertMany(client, "category", ["code", "name", "slug", "path", "description", "position", "is_leaf", "is_active"],
    categories.map((category, index) => [category.slug, category.name, category.slug, category.slug, `Explore ${category.name.toLowerCase()} from the Marketplace demo catalog.`, index, true, true]))
  await insertMany(client, "brand", ["name", "slug", "description", "is_verified"],
    categories.map((category) => [category.brand, slugify(category.brand), `Demo ${category.name.toLowerCase()} brand.`, false]))

  const categoryIds = await idsBy(client, "category", "slug", categories.map((category) => category.slug))
  const brandIds = await idsBy(client, "brand", "slug", categories.map((category) => slugify(category.brand)))
  const items = categories.flatMap((category, categoryIndex) => category.items.map((title, itemIndex) => ({
    category,
    title,
    slug: `demo-${category.slug}-${slugify(title)}`,
    code: `DEMO-${String(categoryIndex + 1).padStart(2, "0")}-${String(itemIndex + 1).padStart(2, "0")}`,
    price: (19 + categoryIndex * 8 + itemIndex * 6).toFixed(4),
  })))

  await insertMany(client, "product", ["created_by_seller_id", "brand_id", "kind", "status", "title", "slug", "description", "published_at", "metadata"],
    items.map((item) => [sellerId, brandIds.get(slugify(item.category.brand)), "physical", "active", item.title, item.slug, `${item.title} from the ${item.category.name} demo collection.`, new Date(), JSON.stringify({ seed: "sneat-category-demo" })]))
  const productIds = await idsBy(client, "product", "slug", items.map((item) => item.slug))

  await insertMany(client, "product_category", ["product_id", "category_id", "is_primary"],
    items.map((item) => [productIds.get(item.slug), categoryIds.get(item.category.slug), true]))
  await insertMany(client, "product_variant", ["product_id", "code", "title", "status"],
    items.map((item) => [productIds.get(item.slug), "standard", "Standard", "active"]))
  const { rows: variants } = await client.query(`SELECT id, product_id FROM product_variant WHERE product_id = ANY($1) AND code = 'standard'`, [[...productIds.values()]])
  const variantIds = new Map(variants.map((row) => [row.product_id, row.id]))

  await insertMany(client, "listing", ["store_id", "product_id", "code", "status", "currency", "base_price", "published_at"],
    items.map((item) => [storeId, productIds.get(item.slug), item.code, "active", "USD", item.price, new Date()]))
  const listingIds = await idsBy(client, "listing", "code", items.map((item) => item.code))
  await insertMany(client, "listing_variant", ["listing_id", "store_id", "product_id", "product_variant_id", "seller_sku", "status", "price"],
    items.map((item) => [listingIds.get(item.code), storeId, productIds.get(item.slug), variantIds.get(productIds.get(item.slug)), `${item.code}-STD`, "active", item.price]))
  const variantKeys = items.map((item) => `${item.code}-STD`)
  const listingVariantIds = await idsBy(client, "listing_variant", "seller_sku", variantKeys)
  await insertMany(client, "inventory_balance", ["warehouse_id", "listing_variant_id", "store_id", "on_hand"],
    variantKeys.map((key) => [warehouseId, listingVariantIds.get(key), storeId, 50]))

  await client.query("COMMIT")
  console.log(JSON.stringify({ categories: categoryIds.size, products: productIds.size, listings: listingIds.size, inventory: listingVariantIds.size }))
} catch (error) {
  await client.query("ROLLBACK")
  throw error
} finally {
  client.release()
  await pool.end()
}
