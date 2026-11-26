export interface BusinessField {
  name: string
  label: string
  kind?:
    | "media"
    | "text"
    | "textarea"
    | "number"
    | "boolean"
    | "choice"
    | "reference"
    | "datetime"
    | "object"
    | "array"
    | "list"
  required?: boolean
  nullable?: boolean
  initial?: unknown
  options?: string[]
  reference?: string
  fields?: BusinessField[]
}
export interface BusinessEntity {
  title: string
  fields: BusinessField[]
  editFields?: BusinessField[]
  create?: boolean
  list?: string
  resource?: string
  editMethod?: "PUT" | "PATCH"
  state?: boolean
  idempotent?: boolean
  readOnly?: boolean
}
const f = (
  name: string,
  label: string,
  kind: BusinessField["kind"] = "text",
  extra: Partial<BusinessField> = {}
): BusinessField => ({ name, label, kind, ...extra })
const ref = (
  name: string,
  label: string,
  reference: string,
  nullable = false
) => f(name, label, "reference", { reference, nullable, required: !nullable })
const title = f("title", "Title", "text", { required: true }),
  name = f("name", "Name", "text", { required: true })
const active = f("active", "Active", "boolean", { initial: true })
const price = f("priceMinor", "Price (minor currency units)", "number", {
  initial: 0,
  required: true,
})
const address = f("address", "Address", "object", {
  fields: [
    f("line1", "Address line"),
    f("city", "City"),
    f("country", "Country"),
  ],
})
const options = f("optionGroups", "Product options", "array", {
  fields: [
    f("code", "Code", "text", { required: true }),
    f("min", "Minimum choices", "number", { initial: 0 }),
    f("max", "Maximum choices", "number", { initial: 1 }),
    f("choices", "Choices", "array", {
      fields: [
        f("code", "Choice", "text", { required: true }),
        f("priceMinor", "Extra price (minor)", "number", { initial: 0 }),
      ],
    }),
  ],
})
const productFields = [
  ref("categoryId", "Category", "category", true),
  title,
  f("description", "Description", "textarea", { initial: "" }),
  f("kind", "Kind", "choice", {
    options: ["physical", "digital", "service"],
    initial: "physical",
  }),
  f("mediaAssetIds", "Product images", "media", { initial: [] }),
  options,
]
const promotionFields = [
  name,
  f("code", "Voucher code", "text", { nullable: true }),
  f("kind", "Discount kind", "choice", {
    options: ["fixed", "percent"],
    initial: "fixed",
  }),
  f("amount", "Amount (minor units / basis points)", "number", { initial: 0 }),
  f("minSubtotalMinor", "Minimum subtotal (minor)", "number", { initial: 0 }),
  f("maxDiscountMinor", "Maximum discount (minor)", "number", {
    nullable: true,
  }),
  f("startsAt", "Starts", "datetime", { required: true }),
  f("endsAt", "Ends", "datetime", { required: true }),
  f("limit", "Usage limit", "number", { nullable: true }),
  f("perCustomerLimit", "Limit per customer", "number", { initial: 1 }),
]
const supplierFields = [
  name,
  f("contact", "Contact", "text", { initial: "" }),
  f("email", "Email", "text", { nullable: true }),
  f("phone", "Phone", "text", { nullable: true }),
  f("address", "Address", "textarea", { initial: "" }),
  active,
]
export const businessEntities: Record<string, BusinessEntity> = {
  merchant: {
    title: "Business profile",
    create: true,
    fields: [
      name,
      f("currency", "Currency", "choice", {
        options: ["VND", "USD", "SGD"],
        initial: "VND",
      }),
    ],
  },
  store: {
    title: "Branch",
    create: true,
    state: true,
    fields: [
      name,
      f("code", "Unique branch code", "text", { required: true }),
      f("businessKind", "Branch type", "choice", {
        options: ["retail", "restaurant"],
        initial: "retail",
      }),
      address,
      f("deliveryFeeMinor", "Delivery fee (minor)", "number", { initial: 0 }),
    ],
  },
  category: {
    title: "Category",
    create: true,
    state: true,
    fields: [
      name,
      f("slug", "Slug", "text", { required: true }),
      ref("parentId", "Parent category", "category", true),
    ],
    editMethod: "PUT",
  },
  attribute: {
    title: "Attribute",
    create: true,
    fields: [
      name,
      f("code", "Code", "text", { required: true }),
      f("kind", "Kind", "choice", {
        options: ["text", "number", "boolean", "choice"],
        initial: "text",
      }),
      f("choices", "Choices (one per line)", "list", { initial: [] }),
    ],
    list: "attribute",
  },
  product: {
    title: "Product",
    create: true,
    fields: productFields,
    editFields: [
      ...productFields,
      f("status", "Status", "choice", {
        options: ["draft", "active", "archived"],
        initial: "draft",
      }),
    ],
    editMethod: "PUT",
  },
  variant: {
    title: "SKU / price",
    create: true,
    fields: [
      ref("productId", "Product", "product"),
      f("sku", "SKU", "text", { required: true }),
      title,
      price,
      f("stockManaged", "Track inventory", "boolean", { initial: true }),
      f("attributes", "Attributes", "object", { fields: [f("unit", "Unit")] }),
    ],
    editFields: [price, active],
    editMethod: "PATCH",
  },
  warehouse: {
    title: "Warehouse",
    create: true,
    state: true,
    fields: [ref("storeId", "Branch", "store"), name],
  },
  inventory: {
    title: "Stock balance",
    create: true,
    list: "inventory",
    resource: "inventory/adjust",
    idempotent: true,
    fields: [
      ref("warehouseId", "Warehouse", "warehouse"),
      ref("variantId", "SKU", "variant"),
      f("quantity", "Adjustment (+ / −)", "number", { required: true }),
      f("reason", "Reason", "textarea", { required: true }),
    ],
  },
  movement: {
    title: "Stock movement",
    readOnly: true,
    list: "inventory/movement",
    fields: [],
  },
  transfer: {
    title: "Stock transfer",
    create: true,
    list: "inventory/movement",
    resource: "inventory/transfer",
    idempotent: true,
    fields: [
      ref("fromWarehouseId", "Source warehouse", "warehouse"),
      ref("toWarehouseId", "Destination warehouse", "warehouse"),
      ref("variantId", "SKU", "variant"),
      f("quantity", "Quantity", "number", { initial: 1 }),
      f("reason", "Reason", "textarea", { required: true }),
    ],
  },
  tax: {
    title: "Tax",
    create: true,
    state: true,
    editMethod: "PUT",
    fields: [
      name,
      f("country", "Country ISO code", "text", { initial: "VN" }),
      f("basisPoints", "Rate in basis points (1000 = 10%)", "number", {
        initial: 0,
      }),
      f("inclusive", "Included in price", "boolean", { initial: false }),
      active,
    ],
  },
  promotion: {
    title: "Voucher & promotion",
    create: true,
    state: true,
    fields: promotionFields,
    editFields: [...promotionFields, active],
    editMethod: "PUT",
  },
  supplier: {
    title: "Supplier",
    create: true,
    fields: supplierFields,
    editFields: supplierFields,
    editMethod: "PUT",
    list: "procurement/supplier",
  },
  purchase: {
    title: "Purchase order",
    create: true,
    idempotent: true,
    list: "procurement/purchase",
    fields: [
      ref("supplierId", "Supplier", "supplier"),
      ref("warehouseId", "Receiving warehouse", "warehouse"),
      f("note", "Note", "textarea", { initial: "" }),
      f("items", "Items", "array", {
        fields: [
          ref("variantId", "SKU", "variant"),
          f("quantity", "Quantity", "number", { initial: 1 }),
          f("unitCostMinor", "Unit cost (minor)", "number", { initial: 0 }),
        ],
      }),
    ],
  },
  order: { title: "Order", list: "order", readOnly: true, fields: [] },
  customer: { title: "Customer", list: "customer", readOnly: true, fields: [] },
  fulfillment: {
    title: "Fulfillment",
    list: "fulfillment",
    readOnly: true,
    fields: [],
  },
  return: { title: "Return", list: "return", readOnly: true, fields: [] },
}
export function businessListPath(resource: string, merchantId: string) {
  const e = businessEntities[resource]
  if (resource === "merchant") return "/commerce/merchant"
  if (resource === "store")
    return "/commerce/merchant/" + merchantId + "/workbench/store"
  if (["order", "customer", "fulfillment", "return"].includes(resource))
    return "/commerce/studio/" + resource
  return (
    "/commerce/merchant/" +
    merchantId +
    "/" +
    (e.list ?? "workbench/" + resource)
  )
}
export function camelBusinessRow(row: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase()),
      value,
    ])
  )
}
