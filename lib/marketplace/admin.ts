export const adminResources = [
  "category",
  "product",
  "attribute",
  "store",
  "seller",
  "variant",
  "order",
  "customer",
  "warehouse",
  "inventory",
  "fulfillment",
  "return",
] as const

export type AdminResource = (typeof adminResources)[number]
