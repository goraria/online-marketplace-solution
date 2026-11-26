export type PaymentProvider = "stripe" | "zalopay" | "momo" | "vnpay"

export type PaymentStatus =
  | "pending"
  | "requires_action"
  | "authorized"
  | "processing"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "partially_refunded"
  | "refunded"

export interface Payment {
  id: string
  application: string
  referenceType: string
  referenceId: string
  provider: PaymentProvider
  providerPaymentId: string | null
  status: PaymentStatus
  amount: number
  amountCaptured: number
  amountRefunded: number
  currency: string
  description: string | null
  createdAt: string
  updatedAt: string
}

export interface PaymentIntentResult {
  payment: Payment
  checkout?: {
    url?: string
    clientSecret?: string
    publishableKey?: string
  }
  reused: boolean
}

export interface PaymentList {
  data: Payment[]
  pagination: {
    limit: number
    offset: number
    total: number
    hasMore: boolean
  }
}
