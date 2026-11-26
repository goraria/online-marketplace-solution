import nextEnv from "@next/env"
import postgres from "@gorth-com/structure/cores/postgres"
import { readFile } from "node:fs/promises"
nextEnv.loadEnvConfig(process.cwd(), true)
const { databaseUrl } = await import("../utils/environment.ts")
if (!databaseUrl) throw Error("DATABASE_URL required")
const db = postgres(databaseUrl, {
    max: 1,
    prepare: false,
    connect_timeout: 10,
})
try {
    await db.begin(async (tx) => {
        await tx`SELECT pg_advisory_xact_lock(hashtext('marketplace:organization-context'))`
        const before = await tx`SELECT count(*)::int n FROM public."user"`
        await tx.unsafe(
            await readFile(
                new URL(
                    "../database/migrations/20261105-organization-context.sql",
                    import.meta.url
                ),
                "utf8"
            )
        )
        const after = await tx`SELECT count(*)::int n FROM public."user"`
        if (before[0].n !== after[0].n) throw Error("user_count_changed")
        console.log(
            "Organization context migration applied; user rows preserved:",
            after[0].n
        )
    })
} catch (error) {
    console.error("Organization context migration rolled back", {
        code: error.code ?? "migration_failed",
    })
    process.exitCode = 1
} finally {
    await db.end()
}
