export interface CommerceMerchant {
  id: string
  name: string
  currency: string
  sso_organization_id: string | null
  status: string
  created_at: string
}
export interface CommerceStore {
  id: string
  merchant_id: string
  sso_team_id: string | null
  name: string
  code: string
  active: boolean
}
export interface CommerceCategory {
  id: string
  name: string
  slug: string
  parent_id: string | null
}
export interface CommerceWarehouse {
  id: string
  name: string
  store_id: string
}
export interface CommerceOrderRecord {
  id: string
  merchant_id: string
  store_id: string
  status: string
  payment_status: string
}
export interface StudioRow {
  id: string
  name: string
  slug: string
  status: string
  detail: string | null
  itemCount: number
  price: number | null
  currency: string
  createdAt: string | null
}
export interface CommercePage<T> {
  data: T[]
  pagination: {
    limit: number
    offset: number
    total: number
    returned: number
    hasMore: boolean
  }
}
