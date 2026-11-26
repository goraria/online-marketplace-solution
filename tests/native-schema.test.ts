import { expect, it } from "vitest"
import { getTableConfig } from "drizzle-orm/pg-core"
import {
  sessionTable,
  verificationTable,
  legacySessionTable,
  legacyVerificationTable,
} from "@/database/auth"
it("matches the reviewed migration constraint names without colliding with archived tables", () => {
  for (const [table, name] of [
    [sessionTable, "native_session_pkey"],
    [verificationTable, "native_verification_pkey"],
    [legacySessionTable, "session_pkey"],
    [legacyVerificationTable, "verification_pkey"],
  ] as const) {
    const config = getTableConfig(table)
    expect(config.primaryKeys).toHaveLength(1)
    expect(config.primaryKeys[0].getName()).toBe(name)
  }
})
