import { Pool } from "@gorth/structure/cores/pg"

import { databaseUrl } from "@/utils/environment"

if (!databaseUrl) throw new Error("DATABASE_URL is required")

// Dedicated, idempotent demo data. Never update existing sellers or stores.
const groups = [
  { badge: "standard", type: "merchant", sellerType: "individual", names: ["Everyday Finds", "Maple Market", "Harbor Goods", "North Lane", "Daily Basket"] },
  { badge: "verified", type: "merchant", sellerType: "business", names: ["Atlas Living", "Cedar Studio", "Urban Craft", "Terra Supply", "Lumen Tech"] },
  { badge: "official_brand", type: "platform", sellerType: "platform", names: ["Gorth Essentials", "Gorth Electronics", "Gorth Home", "Gorth Style", "Gorth Outdoors"] },
]

const pool = new Pool({ connectionString: databaseUrl, max: 1 })
const client = await pool.connect()

try {
  await client.query("BEGIN")
  await client.query(
    `INSERT INTO "user" (external_user_id, name, email, role)
     VALUES ($1, $2, $3, 'user')
     ON CONFLICT (external_user_id) DO NOTHING`,
    ["marketplace-demo-storefronts", "Marketplace Demo Storefronts", "storefront-seed@example.invalid"],
  )
  const { rows: users } = await client.query(
    `SELECT id FROM "user" WHERE external_user_id = $1`,
    ["marketplace-demo-storefronts"],
  )
  const ownerId = users[0]?.id
  if (!ownerId) throw new Error("demo_store_owner_missing")

  for (const group of groups) {
    for (const [index, name] of group.names.entries()) {
      const suffix = `${group.badge.replaceAll("_", "-")}-${index + 1}`
      const sellerSlug = `gorth-demo-seller-${suffix}`
      const storeSlug = `gorth-demo-shop-${suffix}`
      await client.query(
        `INSERT INTO seller (owner_user_id, legal_name, display_name, slug, status, type, country_code, approved_at, metadata)
         VALUES ($1, $2, $3, $4, 'active', $5, 'VN', NOW(), '{"demo":true}'::jsonb)
         ON CONFLICT (slug) DO NOTHING`,
        [ownerId, `${name} Demo Seller`, name, sellerSlug, group.sellerType],
      )
      const { rows: sellers } = await client.query(
        `SELECT id FROM seller WHERE slug = $1`,
        [sellerSlug],
      )
      if (!sellers[0]) throw new Error(`demo_seller_missing:${sellerSlug}`)
      await client.query(
        `INSERT INTO store (seller_id, name, slug, description, status, type, badge, default_currency, country_code, timezone, published_at, metadata)
         VALUES ($1, $2, $3, $4, 'active', $5, $6, 'VND', 'VN', 'Asia/Ho_Chi_Minh', NOW(), '{"demo":true}'::jsonb)
         ON CONFLICT (slug) DO NOTHING`,
        [sellers[0].id, name, storeSlug, `Demo storefront for ${name}. Explore products, categories, and reviews.`, group.type, group.badge],
      )
    }
  }

  const { rows } = await client.query(
    `SELECT badge, count(*)::int AS count FROM store WHERE slug LIKE 'gorth-demo-shop-%' GROUP BY badge ORDER BY badge`,
  )
  await client.query("COMMIT")
  console.log(JSON.stringify({ demoStoresByBadge: rows }))
} catch (error) {
  await client.query("ROLLBACK")
  throw error
} finally {
  client.release()
  await pool.end()
}
