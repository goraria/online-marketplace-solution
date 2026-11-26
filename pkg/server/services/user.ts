import { eq, or } from "drizzle-orm"
import { database } from "@/database"
import { userTable, type User } from "@/database/schema"
import { authUserSchema } from "@/schemas/user"

function serializeUser(user: User) {
  return {
    id: user.id,
    externalUserId: user.externalUserId,
    name: user.name,
    username: user.username,
    role: user.role,
    status: user.status,
    email: user.email,
    image: user.image,
    metadata: user.metadata,
    lastSeenAt: user.lastSeenAt?.toISOString() ?? null,
    syncedAt: user.syncedAt.toISOString(),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  }
}

export async function findUserByExternalId(externalUserId: string) {
  const [user] = await database
    .select()
    .from(userTable)
    .where(eq(userTable.externalUserId, externalUserId))
    .limit(1)

  return user ? serializeUser(user) : null
}

export async function syncUser(rawInput: unknown) {
  const input = authUserSchema.parse(rawInput)
  const [existing] = await database
    .select()
    .from(userTable)
    .where(
      or(
        eq(userTable.externalUserId, input.externalUserId),
        eq(userTable.email, input.email)
      )
    )
    .limit(1)

  if (existing) {
    const [updated] = await database
      .update(userTable)
      .set({
        externalUserId: input.externalUserId,
        name: input.name,
        username: input.username ?? existing.username,
        email: input.email,
        image: input.image === undefined ? existing.image : input.image,
        status: input.status,
        lastSeenAt: new Date(),
        syncedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(userTable.id, existing.id))
      .returning()

    return serializeUser(updated ?? existing)
  }

  const [created] = await database
    .insert(userTable)
    .values({
      externalUserId: input.externalUserId,
      name: input.name,
      username: input.username ?? null,
      email: input.email,
      image: input.image ?? null,
      status: input.status,
      lastSeenAt: new Date(),
      syncedAt: new Date(),
    })
    .returning()

  if (!created) throw new Error("user_create_failed")
  return serializeUser(created)
}
