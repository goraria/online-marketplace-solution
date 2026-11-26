import nextEnv from '@next/env'
import postgres from '@gorth-com/structure/cores/postgres'
import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
nextEnv.loadEnvConfig(process.cwd(), true)
const { databaseUrl } = await import('../utils/environment.ts')
if (!databaseUrl) throw Error('DATABASE_URL required')
const db = postgres(databaseUrl, { max: 1, prepare: false, connect_timeout: 10, onnotice: () => { } })
const tables = ["seller", "seller_member", "store", "category", "category_localization", "brand", "product", "product_localization", "product_category", "product_identifier", "attribute", "attribute_option", "category_attribute", "product_attribute_value", "product_variant", "variant_attribute_value", "product_media_reference", "bundle_component", "listing", "listing_variant", "warehouse", "inventory_balance", "inventory_movement", "customer_address", "cart", "cart_item", "order", "order_address", "store_order", "order_item", "order_status_event", "inventory_reservation", "fulfillment", "fulfillment_item", "return_request", "return_item", "digital_entitlement", "service_booking"]
const artifact = '/private/tmp/gorth-marketplace-commerce.json', receipt = '/private/tmp/gorth-marketplace-commerce-receipt.json'
async function snapshot(tx) {
    const out = { version: 1, tables: {}, users: await tx`SELECT id,external_user_id,email,name,status FROM public."user" ORDER BY id` }
    for (const name of tables) out.tables[name] = await tx.unsafe('SELECT * FROM public."' + name + '" ORDER BY 1')
    return out
}
try {
    if (process.argv.includes('--archive-types')) {
        const names = ["seller_status", "seller_type", "seller_member_role", "store_status", "store_type", "store_badge", "product_kind", "product_status", "identifier_kind", "attribute_data_type", "media_role", "listing_condition", "listing_status", "inventory_movement_kind", "inventory_reservation_status", "cart_status", "order_status", "store_order_status", "fulfillment_kind", "fulfillment_status", "return_status", "entitlement_status", "booking_status"]
        let archived = 0
        await db.begin(async tx => {
            await tx`SELECT pg_advisory_xact_lock(hashtext('marketplace-commerce-cutover'))`
            const [archive] = await tx`SELECT to_regclass('legacy_commerce.product') AS present`
            if (!archive.present) throw Error('Archive tables required before type cutover')
            for (const name of names) {
                const [type] = await tx`SELECT t.oid FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typname=${name} AND t.typtype='e'`
                if (!type) continue
                const dependencies = await tx`SELECT 1 FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE a.atttypid=${type.oid} AND n.nspname='public' AND a.attnum>0 AND NOT a.attisdropped LIMIT 1`
                if (dependencies.length) throw Error('Active enum dependency; inspect before archiving')
                await tx.unsafe('ALTER TYPE public."' + name.replaceAll('"', '""') + '" SET SCHEMA legacy_commerce'); archived++
            }
        })
        console.log(JSON.stringify({ archivedEnums: archived, activeAuthEnumsPreserved: true }))
    } else if (!process.argv.includes('--archive')) {
        const data = await db.begin(async tx => { await tx`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY`; return snapshot(tx) })
        if (data.tables.order.length || data.tables.cart.length || data.tables.customer_address.length) throw Error('Active customer/order data requires explicit migration mapping')
        await writeFile(artifact, JSON.stringify(data), { mode: 0o600 })
        console.log(JSON.stringify({ exported: true, products: data.tables.product.length, stores: data.tables.store.length, orders: data.tables.order.length }))
    } else {
        const imported = JSON.parse(await readFile(receipt, 'utf8')), exported = await readFile(artifact, 'utf8')
        const expected = createHash('sha256').update(exported).digest('hex')
        if (imported.sourceHash !== expected || !imported.verified) throw Error('Verified Commerce import receipt required')
        await db.begin(async tx => {
            await tx`SELECT pg_advisory_xact_lock(hashtext('marketplace-commerce-cutover'))`
            for (const name of tables) await tx.unsafe('LOCK TABLE public."' + name + '" IN ACCESS EXCLUSIVE MODE')
            const current = JSON.stringify(await snapshot(tx))
            if (createHash('sha256').update(current).digest('hex') !== expected) throw Error('Source changed since export; repeat export/import')
            await tx`CREATE SCHEMA IF NOT EXISTS legacy_commerce`
            for (const name of tables) await tx.unsafe('ALTER TABLE public."' + name + '" SET SCHEMA legacy_commerce')
        })
        console.log(JSON.stringify({ archivedTables: tables.length, authPreserved: true, commerceImportVerified: true }))
    }
} catch (e) { console.error('Marketplace cutover stopped safely', { code: e.code ?? 'migration_precondition_failed' }); process.exitCode = 1 } finally { await db.end() }
