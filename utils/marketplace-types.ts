export interface CategorySummary {
  id: string
  parentId: string | null
  code: string
  name: string
  slug: string
  description: string | null
  iconMediaId: string | null
  level: number
  isLeaf: boolean
}

export interface ProductSummary {
  id: string
  slug: string
  title: string
  description: string | null
  kind: "physical" | "digital" | "service" | "bundle"
  brandName: string | null
  listingId: string
  listingVariantId: string
  price: number
  compareAtPrice: number | null
  currency: string
  storeId: string
  storeName: string
  storeSlug: string
  mediaId: string | null
  mediaAlt: string | null
  publishedAt: string | null
}

export interface CatalogHome {
  categories: CategorySummary[]
  featured: ProductSummary[]
}

export interface ProductOffer {
  listingId: string
  listingVariantId: string
  variantId: string
  variantTitle: string
  sellerSku: string
  price: number
  compareAtPrice: number | null
  currency: string
  minimumQuantity: number
  maximumQuantity: number | null
  storeId: string
  storeName: string
  storeSlug: string
  stock: number
}

export interface ProductDetail {
  id: string
  slug: string
  title: string
  description: string | null
  kind: ProductSummary["kind"]
  modelNumber: string | null
  manufacturer: string | null
  requiresShipping: boolean
  brand: string | null
  brandSlug: string | null
  media: Array<{
    id: string
    mediaId: string
    role: string
    alt: string | null
    position: number
  }>
  offers: ProductOffer[]
  attributes: Array<{
    attributeId: string
    code: string
    name: string
    dataType: string
    unit: string | null
    valueText: string | null
    valueNumber: string | null
    valueBoolean: boolean | null
    valueDate: string | null
    valueJson: unknown
  }>
}

export interface StoreDetail {
  id: string
  name: string
  slug: string
  description: string | null
  logoMediaId: string | null
  bannerMediaId: string | null
  countryCode: string
  type: "merchant" | "platform"
  badge: "standard" | "verified" | "official_brand"
  createdAt: string
  isDemo: boolean
  productCount: number
  categories: CategorySummary[]
  products: ProductSummary[]
}

export interface StoreSummary {
  id: string
  name: string
  slug: string
  description: string | null
  type: StoreDetail["type"]
  badge: StoreDetail["badge"]
  countryCode: string
  logoMediaId: string | null
  isDemo: boolean
}

export interface CartItem {
  id: string
  quantity: number
  unitPrice: number
  lineTotal: number
  currency: string
  listingVariantId: string
  productId: string
  productSlug: string
  productTitle: string
  variantId: string
  variantTitle: string
  sellerSku: string
  storeId: string
  storeName: string
  storeSlug: string
  mediaId: string | null
}

export interface Cart {
  id: string | null
  currency: string
  items: CartItem[]
  subtotal: number
  quantity: number
}

export interface Address {
  id: string
  label: string | null
  recipientName: string
  phone: string
  line1: string
  line2: string | null
  ward: string | null
  district: string | null
  province: string | null
  postalCode: string | null
  countryCode: string
  isDefaultShipping: boolean
  isDefaultBilling: boolean
}

export type AddressInput = Omit<Address, "id">

export interface OrderSummary {
  version:number
  id: string
  orderNumber: string
  status: string
  currency: string
  merchandiseSubtotal: number
  grandTotal: number
  createdAt: string
  placedAt: string | null
}

export interface OrderDetail extends OrderSummary {
  note: string | null
  cancellationReason: string | null
  stores: Array<{
    id: string
    storeName: string
    storeSlug: string
    storeOrderNumber: string
    status: string
    grandTotal: number
    items: Array<{
      id: string
      productTitle: string
      variantTitle: string | null
      sellerSku: string
      quantity: number
      unitPrice: number
      lineTotal: number
    }>
  }>
  addresses: Array<Address & { kind: "shipping" | "billing" }>
}
