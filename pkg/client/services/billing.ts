"use client"

/* eslint-disable react-hooks/rules-of-hooks -- Service definitions build hooks without executing them. */

import {
  createMutationService,
  createQueryService,
  useMutation,
  useQuery,
} from "@/utils/caller"
import type {
  BillingCatalog,
  Invoice,
  SubscriptionCreateResult,
  SubscriptionList,
} from "@/lib/billing/types"
import type {
  Payment,
  PaymentIntentResult,
  PaymentProvider,
} from "@/lib/payment/types"

export const billingKey = ["billing"] as const

export const useBillingCatalogQuery = createQueryService(
  useQuery<BillingCatalog, undefined>({
    queryKey: [...billingKey, "catalog"] as const,
    query: {
      url: "/billing/catalog",
      method: "GET",
      params: { application: "marketplace", limit: 100 },
      auth: false,
      unwrapData: false,
    },
    queryOptions: { staleTime: 60_000 },
  })
)

export const useSubscriptionListQuery = createQueryService(
  useQuery<SubscriptionList, boolean>({
    queryKey: [...billingKey, "subscription"] as const,
    query: {
      url: "/billing/subscription",
      method: "GET",
      params: { limit: 100 },
      unwrapData: false,
    },
    queryOptions: (enabled) => ({ enabled, retry: false }),
  })
)

export const useCreateSubscriptionMutation = createMutationService(
  useMutation<SubscriptionCreateResult, { priceId: string }>({
    query: ({ priceId }) => ({
      url: "/billing/subscription",
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
  useMutation<
    PaymentIntentResult,
    { invoiceId: string; provider: PaymentProvider; returnUrl: string }
  >({
    query: ({ invoiceId, provider, returnUrl }) => ({
      url: `/billing/invoice/${invoiceId}/payment`,
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
  useMutation<
    { invoice: Invoice; payment: Payment },
    { invoiceId: string; paymentId: string }
  >({
    query: ({ invoiceId, paymentId }) => ({
      url: `/billing/invoice/${invoiceId}/reconcile`,
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
