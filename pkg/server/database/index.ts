// @ts-ignore -- Pool is re-exported by the shared structure package.
import { Pool } from "@gorth/structure/cores/pg"
import { drizzle } from "drizzle-orm/node-postgres"
import * as schema from "@/database/schema"
import { databaseUrl, pgPoolMax } from "@/utils/environment"

const configuredPoolMax = Number.parseInt(pgPoolMax ?? "", 10)

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required")
}

const globalForDatabase = globalThis as typeof globalThis & {
  onlineMarketplacePgPool?: InstanceType<typeof Pool>
}

const pool =
  globalForDatabase.onlineMarketplacePgPool ??
  new Pool({
    connectionString: databaseUrl,
    max: Number.isNaN(configuredPoolMax) ? 5 : configuredPoolMax,
  })

if (!globalForDatabase.onlineMarketplacePgPool) {
  pool.on("error", (error: unknown) => {
    console.error("[online-marketplace-solution-pg-pool-error]", error)
  })
  globalForDatabase.onlineMarketplacePgPool = pool
}

export const database = drizzle({ client: pool })
export { schema }
