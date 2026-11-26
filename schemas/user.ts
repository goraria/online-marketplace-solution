import z from "@gorth-com/structure/cores/zod"
import { createSchemaFactory } from "drizzle-orm/zod"

import { userTable } from "@/database/schema"

const { createInsertSchema } = createSchemaFactory({
  zodInstance: z,
  coerce: { date: true },
})

export const authUserSchema = createInsertSchema(userTable, {
  externalUserId: (schema) => schema.min(1),
  name: (schema) => schema.min(1),
  username: (schema) => schema.min(1).max(64),
  email: (schema) => schema.email(),
})
  .pick({
    externalUserId: true,
    name: true,
    username: true,
    email: true,
    image: true,
    status: true,
  })
  .required({ externalUserId: true, name: true, email: true, status: true })
