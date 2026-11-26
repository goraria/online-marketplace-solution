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

export type AdminResource = (typeof adminResources)[number]
