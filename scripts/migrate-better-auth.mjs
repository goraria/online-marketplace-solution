import { readFile } from "node:fs/promises"
import nextEnv from "@next/env"
import postgres from "@gorth-com/structure/cores/postgres"

nextEnv.loadEnvConfig(process.cwd())
const { databaseUrl } = await import("../utils/environment.ts")
if (!databaseUrl) throw new Error("DATABASE_URL is required")
const database = postgres(databaseUrl, { max: 1, prepare: false })
async function domainSnapshot(transaction) {
    const tables = await transaction`SELECT table_name FROM information_schema.tables WHERE table_schema='legacy_commerce' AND table_type='BASE TABLE' ORDER BY table_name`
    const counts = []
    for (const t of tables) counts.push({ table: t.table_name, rows: await transaction.unsafe('SELECT count(*)::int AS n FROM legacy_commerce."' + t.table_name.replaceAll('"', '""') + '"') })
    return counts
}

try {
    const migration = await readFile(
        new URL("../database/migrations/20261011-better-auth.sql", import.meta.url),
        "utf8"
    )
    const result = await database.begin(async (transaction) => {
        await transaction`SELECT pg_advisory_xact_lock(hashtextextended('gorth:better-auth-migration', 0))`
        const before = await transaction`SELECT id FROM public."user" ORDER BY id`
        const domainBefore = await domainSnapshot(transaction)
        await transaction.unsafe(migration)
        await transaction.unsafe(await readFile(new URL("../database/migrations/20261105-organization-context.sql", import.meta.url), "utf8"))
        const after = await transaction`SELECT id FROM public."user" ORDER BY id`
        if (JSON.stringify(before) !== JSON.stringify(after))
            throw new Error("User identities changed; rollback")
        const missing =
            await transaction`SELECT count(*)::int AS count FROM public."user" u
      WHERE NOT EXISTS (SELECT 1 FROM public.account a WHERE a.user_id = u.id AND a.provider_id = 'gorth' AND a.account_id = u.external_user_id)`
        if (missing[0].count !== 0)
            throw new Error("Account bindings are incomplete; rollback")
        const domainAfter = await domainSnapshot(transaction)
        if (JSON.stringify(domainBefore) !== JSON.stringify(domainAfter))
            throw new Error("Marketplace data changed; rollback")
        return {
            usersPreserved: after.length,
            accountBindingsVerified: true,
            marketplaceDataPreserved: true,
        }
    })
    console.log(JSON.stringify(result))
} catch {
    console.error(
        "Migration failed; transaction rolled back. No credentials logged."
    )
    process.exitCode = 1
} finally {
    await database.end()
}
