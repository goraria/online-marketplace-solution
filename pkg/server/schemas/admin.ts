import z from "@gorth/structure/cores/zod"

import { paginationSchema } from "@/schemas/marketplace"

export const adminResources = [
  "category",
  "product",
  "brand",
  "store",
  "seller",
  "listing",
  "order",
  "customer",
  "warehouse",
  "inventory",
  "fulfillment",
  "return",
] as const

export const adminResourceSchema = z.enum(adminResources)

export const adminListQuerySchema = paginationSchema.extend({
  query: z.string().trim().max(160).default(""),
})

export type AdminResource = z.infer<typeof adminResourceSchema>
