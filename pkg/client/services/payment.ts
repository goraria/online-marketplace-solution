"use client"

/* eslint-disable react-hooks/rules-of-hooks -- Service definitions build hooks without executing them. */

import {
  createMutationService,
  createQueryService,
  useMutation,
  useQuery,
} from "@/utils/caller"
import type {
  Payment,
  PaymentIntentResult,
  PaymentList,
  PaymentProvider,
} from "@/lib/payment/types"

export const paymentKey = ["payment"] as const

export const useOrderPaymentQuery = createQueryService(
  useQuery<PaymentList, { orderId: string; enabled: boolean }>({
    queryKey: ({ orderId }) => [...paymentKey, "order", orderId] as const,
    query: ({ orderId }) => ({
      url: "/payment",
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

export const useInvoicePaymentQuery = createQueryService(
  useQuery<PaymentList, { invoiceId: string; enabled: boolean }>({
    queryKey: ({ invoiceId }) => [...paymentKey, "invoice", invoiceId] as const,
    query: ({ invoiceId }) => ({
      url: "/payment",
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
  useMutation<
    PaymentIntentResult,
    {
      orderId: string
      orderNumber: string
      provider: PaymentProvider
      amount: number
      currency: string
      returnUrl: string
    }
  >({
    query: ({
      orderId,
      orderNumber,
      provider,
      amount,
      currency,
      returnUrl,
    }) => ({
      url: "/payment/intent",
      method: "POST",
      headers: {
        "Idempotency-Key": `marketplace-order:${orderId}:${provider}`,
      },
      body: {
        application: "marketplace",
        referenceType: "order",
        referenceId: orderId,
        provider,
        amount,
        currency,
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
  useMutation<Payment, string>({
    query: (id) => ({
      url: `/payment/${id}/query`,
      method: "POST",
      toast: { error: (error) => error.message },
    }),
    invalidates: [paymentKey],
  })
)
