import z from "@gorth-com/structure/cores/zod"

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(24),
  offset: z.coerce.number().int().min(0).default(0),
})

export const productQuerySchema = paginationSchema.extend({
  query: z.string().trim().max(160).optional(),
  category: z.string().trim().max(180).optional(),
  store: z.string().trim().max(160).optional(),
  sort: z
    .enum(["newest", "popular", "price_asc", "price_desc"])
    .default("newest"),
  minPrice: z.coerce.number().finite().min(0).optional(),
  maxPrice: z.coerce.number().finite().min(0).optional(),
})

export const cartItemCreateSchema = z.object({
  listingVariantId: z.string().uuid(),
  storeId: z.string().uuid(),
  choices: z.record(z.string(), z.array(z.string())).default({}),
  quantity: z.coerce.number().int().min(1).max(99).default(1),
})

export const cartItemUpdateSchema = z.object({
  quantity: z.coerce.number().int().min(1).max(99),
})

export const addressInputSchema = z.object({
  label: z.string().trim().max(64).nullable().optional(),
  recipientName: z.string().trim().min(1).max(180),
  phone: z.string().trim().min(6).max(32),
  line1: z.string().trim().min(1).max(500),
  line2: z.string().trim().max(500).nullable().optional(),
  ward: z.string().trim().max(180).nullable().optional(),
  district: z.string().trim().max(180).nullable().optional(),
  province: z.string().trim().max(180).nullable().optional(),
  postalCode: z.string().trim().max(32).nullable().optional(),
  countryCode: z
    .string()
    .trim()
    .length(2)
    .transform((value) => value.toUpperCase()),
  isDefaultShipping: z.boolean().default(false),
  isDefaultBilling: z.boolean().default(false),
})

export const checkoutSchema = z.object({
  shippingAddressId: z.string().uuid(),
  expectedTotalMinor: z.number().int().nonnegative(),
  version: z.number().int().positive(),
  idempotencyKey: z.string().min(8).max(100),
  note: z.string().trim().max(1000).nullable().optional(),
})

export const cancelOrderSchema = z.object({
  version: z.number().int().positive(),
  reason: z.string().trim().min(3).max(500),
})
