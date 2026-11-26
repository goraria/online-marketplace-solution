import z from "@gorth-com/structure/cores/zod"

import { paginationSchema } from "@/schemas/marketplace"

const moneySchema = z.coerce.number().finite().min(0).max(1_000_000_000)

export const createSellerProductSchema = z
  .object({
    id: z.string().uuid(),
    storeId: z.string().uuid(),
    warehouseId: z.string().uuid().nullable(),
    categoryId: z.string().uuid(),
    brandId: z.string().uuid().nullable(),
    title: z.string().trim().min(3).max(220),
    description: z.string().trim().max(10_000),
    kind: z.enum(["physical", "digital", "service"]),
    price: moneySchema,
    sku: z.string().trim().min(1).max(160),
    stock: z.coerce.number().int().min(0).max(1_000_000),
    status: z.enum(["draft", "active"]),
    images: z.array(z.string().uuid()).max(24),
  })
  .superRefine((input, context) => {
    if (new Set(input.images).size !== input.images.length) {
      context.addIssue({
        code: "custom",
        path: ["images"],
        message: "Duplicate images are not allowed",
      })
    }
    if (input.status === "active" && input.images.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["images"],
        message: "Published products need an image",
      })
    }
    if (input.kind !== "physical" && input.stock > 0) {
      context.addIssue({
        code: "custom",
        path: ["stock"],
        message: "Only physical products can have stock",
      })
    }
    if (input.stock > 0 && !input.warehouseId) {
      context.addIssue({
        code: "custom",
        path: ["warehouseId"],
        message: "A warehouse is required for stock",
      })
    }
  })

export const sellerProductQuerySchema = paginationSchema.extend({
  query: z.string().trim().max(160).default(""),
})

export type CreateSellerProductInput = z.infer<typeof createSellerProductSchema>
