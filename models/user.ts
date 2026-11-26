import "server-only"
import { eq } from "drizzle-orm"
import { getDatabase } from "@/database"
import { userTable } from "@/database/schema"
import { authUserSchema } from "@/schemas/user"
import { formatLocalUser } from "@/utils/formatter"

export async function rawGetUserByExternalId(externalUserId: string) {
  try {
    const [user] = await getDatabase()
      .select()
      .from(userTable)
      .where(eq(userTable.externalUserId, externalUserId))
      .limit(1)
    return user ?? null
  } catch (error) {
    throw error
  }
}
export async function rawGetCurrentUser(externalUserId: string) {
  const user = await rawGetUserByExternalId(externalUserId)
  return user ? formatLocalUser(user) : null
}
export async function rawSyncUser(rawInput: unknown) {
  try {
    const input = authUserSchema.parse(rawInput)
    const existing = await rawGetUserByExternalId(input.externalUserId)
    if (existing) {
      const [updated] = await getDatabase()
        .update(userTable)
        .set({
          name: input.name,
          username: input.username ?? existing.username,
          email: input.email,
          image: input.image === undefined ? existing.image : input.image,
          ssoStatus: input.status,
          lastSeenAt: new Date(),
          syncedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(userTable.id, existing.id))
        .returning()
      return formatLocalUser(updated ?? existing)
    }
    const [created] = await getDatabase()
      .insert(userTable)
      .values({
        externalUserId: input.externalUserId,
        name: input.name,
        username: input.username ?? null,
        email: input.email,
        image: input.image ?? null,
        ssoStatus: input.status,
        lastSeenAt: new Date(),
        syncedAt: new Date(),
      })
      .returning()
    if (!created) throw new Error("user_create_failed")
    return formatLocalUser(created)
  } catch (error) {
    throw error
  }
}
