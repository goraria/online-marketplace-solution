export interface BillingPrice {
  id: string
  planId: string
  type: "fixed" | "metered"
  currency: string
  unitAmount: number
  interval: "day" | "week" | "month" | "year"
  intervalCount: number
  trialPeriodDays: number | null
}

export interface BillingPlan {
  id: string
  productId: string
  code: string
  name: string
  description: string | null
  prices: BillingPrice[]
  features: Array<{
    planFeature: {
      featureId: string
      value: unknown
      softLimit: string | null
      hardLimit: string | null
    }
    feature: {
      id: string
      key: string
      name: string
      description: string | null
    }
  }>
}

export interface BillingProduct {
  id: string
  application: string
  code: string
  name: string
  description: string | null
  plans: BillingPlan[]
}

export interface BillingCatalog {
  data: BillingProduct[]
  pagination: {
    limit: number
    offset: number
    total: number
    hasMore: boolean
  }
}

export interface Subscription {
  id: string
  application: string
  status:
    "trialing" | "active" | "past_due" | "paused" | "cancelled" | "expired"
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  createdAt: string
}

export interface Invoice {
  id: string
  subscriptionId: string | null
  number: string | null
  status: "draft" | "open" | "paid" | "void" | "uncollectible"
  currency: string
  total: number
  amountDue: number
  amountPaid: number
}

export interface SubscriptionCreateResult {
  subscription: Subscription
  invoice: Invoice
}

export interface SubscriptionList {
  data: Subscription[]
  pagination: {
    limit: number
    offset: number
    total: number
    hasMore: boolean
  }
}
