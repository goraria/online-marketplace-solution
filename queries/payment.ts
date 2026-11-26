"use client"
import { createAccountQueryService } from "@/utils/account-query"


import type {
  Payment,
  PaymentIntentResult,
  PaymentList,
  PaymentProvider,
} from "@/utils/payment-types"
import { createMutationService, defineMutation, defineQuery } from "@/utils/caller"

export const paymentKey = ["payment"] as const

export const useOrderPaymentQuery = createAccountQueryService(
  defineQuery<PaymentList, { orderId: string; enabled: boolean }>({
    queryKey: ({ orderId }) => [...paymentKey, "order", orderId] as const,
    query: ({ orderId }) => ({
      url: "/external/payment",
      method: "GET",
      params: { referenceType: "order", referenceId: orderId, limit: 10 },
      unwrapData: false,
    }),
    queryOptions: ({ orderId, enabled }) => ({
      enabled: enabled && Boolean(orderId),
      staleTime: 5_000,
      retry: false,
    }),
  })
)

export const useInvoicePaymentQuery = createAccountQueryService(
  defineQuery<PaymentList, { invoiceId: string; enabled: boolean }>({
    queryKey: ({ invoiceId }) => [...paymentKey, "invoice", invoiceId] as const,
    query: ({ invoiceId }) => ({
      url: "/external/payment",
      method: "GET",
      params: { referenceType: "invoice", referenceId: invoiceId, limit: 10 },
      unwrapData: false,
    }),
    queryOptions: ({ invoiceId, enabled }) => ({
      enabled: enabled && Boolean(invoiceId),
      staleTime: 5_000,
      retry: false,
    }),
  })
)

export const useCreatePaymentMutation = createMutationService(
  defineMutation<
    PaymentIntentResult,
    {
      orderId: string
      orderNumber: string
      provider: PaymentProvider
      returnUrl: string
    }
  >({
    query: ({
      orderId,
      orderNumber,
      provider,
      returnUrl,
    }) => ({
      url: "/external/payment/intent",
      method: "POST",
      headers: {
        "Idempotency-Key": `marketplace-order:${orderId}:${provider}`,
      },
      body: {
        application: "marketplace",
        referenceType: "order",
        referenceId: orderId,
        provider,
        description: `Marketplace order ${orderNumber}`,
        returnUrl,
        metadata: { orderNumber },
      },
      toast: { error: (error) => error.message },
    }),
    invalidates: (_data, { orderId }) => [
      paymentKey,
      [...paymentKey, "order", orderId],
    ],
  })
)

export const useQueryPaymentMutation = createMutationService(
  defineMutation<Payment, string>({
    query: (id) => ({
      url: `/external/payment/${id}/query`,
      method: "POST",
      toast: { error: (error) => error.message },
    }),
    invalidates: [paymentKey,["marketplace","order"]],
  })
)
