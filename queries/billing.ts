"use client"
import { createAccountQueryService } from "@/utils/account-query"


import {
  createMutationService,
  createQueryService,
  defineMutation,
  defineQuery,
} from "@/utils/caller"
import type {
  BillingCatalog,
  Invoice,
  SubscriptionCreateResult,
  SubscriptionList,
} from "@/utils/billing-types"
import type {
  Payment,
  PaymentIntentResult,
  PaymentProvider,
} from "@/utils/payment-types"

export const billingKey = ["billing"] as const

export const useBillingCatalogQuery = createQueryService(
  defineQuery<BillingCatalog, undefined>({
    queryKey: [...billingKey, "catalog"] as const,
    query: {
      url: "/external/billing/catalog",
      method: "GET",
      params: { application: "marketplace", limit: 100 },
      auth: false,
      unwrapData: false,
    },
    queryOptions: { staleTime: 60_000 },
  })
)

export const useSubscriptionListQuery = createAccountQueryService(
  defineQuery<SubscriptionList, boolean>({
    queryKey: [...billingKey, "subscription"] as const,
    query: {
      url: "/external/billing/subscription",
      method: "GET",
      params: { limit: 100 },
      unwrapData: false,
    },
    queryOptions: (enabled) => ({ enabled, retry: false }),
  })
)

export const useCreateSubscriptionMutation = createMutationService(
  defineMutation<SubscriptionCreateResult, { priceId: string }>({
    query: ({ priceId }) => ({
      url: "/external/billing/subscription",
      method: "POST",
      body: { priceId, quantity: 1 },
      toast: {
        success: "Subscription created",
        error: (error) => error.message,
      },
    }),
    invalidates: [[...billingKey, "subscription"]],
  })
)

export const useCreateInvoicePaymentMutation = createMutationService(
  defineMutation<
    PaymentIntentResult,
    { invoiceId: string; provider: PaymentProvider; returnUrl: string }
  >({
    query: ({ invoiceId, provider, returnUrl }) => ({
      url: `/external/billing/invoice/${invoiceId}/payment`,
      method: "POST",
      headers: {
        "Idempotency-Key": `marketplace-invoice:${invoiceId}:${provider}`,
      },
      body: { provider, returnUrl },
      toast: { error: (error) => error.message },
    }),
    invalidates: [[...billingKey, "subscription"]],
  })
)

export const useReconcileInvoiceMutation = createMutationService(
  defineMutation<
    { invoice: Invoice; payment: Payment },
    { invoiceId: string; paymentId: string }
  >({
    query: ({ invoiceId, paymentId }) => ({
      url: `/external/billing/invoice/${invoiceId}/reconcile`,
      method: "POST",
      body: { paymentId },
      toast: {
        success: "Invoice status refreshed",
        error: (error) => error.message,
      },
    }),
    invalidates: [billingKey],
  })
)
