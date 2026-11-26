"use client"

import { useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Check, CreditCard, RefreshCw } from "@gorth/primitive/cores/lucide"
import { Button } from "@gorth/primitive/custom/button"
import { Badge } from "@gorth/primitive/default/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@gorth/primitive/default/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@gorth/primitive/default/select"
import { Skeleton } from "@gorth/primitive/default/skeleton"

import { StripePayment } from "@/features/payment/stripe-payment"
import { useAuth } from "@/hooks/use-auth"
import type { BillingPrice } from "@/lib/billing/types"
import type { PaymentProvider } from "@/lib/payment/types"
import { formatMinorPrice } from "@/utils/marketplace"
import {
  useBillingCatalogQuery,
  useCreateInvoicePaymentMutation,
  useCreateSubscriptionMutation,
  useReconcileInvoiceMutation,
  useSubscriptionListQuery,
} from "@/services/billing"
import {
  useInvoicePaymentQuery,
  useQueryPaymentMutation,
} from "@/services/payment"

interface StripeCheckoutState {
  clientSecret: string
  publishableKey: string
  returnUrl: string
}

function recurringLabel(price: BillingPrice) {
  const interval =
    price.intervalCount === 1
      ? price.interval
      : `${price.intervalCount} ${price.interval}s`
  return `${formatMinorPrice(price.unitAmount, price.currency)} / ${interval}`
}

export function SubscriptionView() {
  const auth = useAuth()
  const searchParams = useSearchParams()
  const returnedInvoiceId = searchParams.get("invoice") ?? ""
  const catalog = useBillingCatalogQuery(undefined)
  const subscriptions = useSubscriptionListQuery(auth.authenticated)
  const returnedPayments = useInvoicePaymentQuery({
    invoiceId: returnedInvoiceId,
    enabled: auth.authenticated && Boolean(returnedInvoiceId),
  })
  const [provider, setProvider] = useState<PaymentProvider>("stripe")
  const [stripeCheckout, setStripeCheckout] =
    useState<StripeCheckoutState | null>(null)
  const [createSubscription, subscriptionState] =
    useCreateSubscriptionMutation()
  const [createPayment, paymentState] = useCreateInvoicePaymentMutation()
  const [queryPayment] = useQueryPaymentMutation()
  const [reconcileInvoice] = useReconcileInvoiceMutation()
  const reconciliationRef = useRef("")

  useEffect(() => {
    if (searchParams.get("payment") !== "return" || !returnedInvoiceId) return
    const payment = returnedPayments.data?.data[0]
    if (!payment) return
    const attempt = `${returnedInvoiceId}:${payment.id}:${payment.updatedAt}`
    if (reconciliationRef.current === attempt) return
    reconciliationRef.current = attempt

    void (async () => {
      try {
        const current = [
          "succeeded",
          "failed",
          "cancelled",
          "refunded",
        ].includes(payment.status)
          ? payment
          : await queryPayment(payment.id).unwrap()
        await reconcileInvoice({
          invoiceId: returnedInvoiceId,
          paymentId: current.id,
        }).unwrap()
      } catch {
        reconciliationRef.current = ""
      }
    })()
  }, [
    queryPayment,
    reconcileInvoice,
    returnedInvoiceId,
    returnedPayments.data,
    searchParams,
  ])

  async function subscribe(price: BillingPrice) {
    try {
      const result = await createSubscription({ priceId: price.id }).unwrap()
      if (result.invoice.status === "paid" || result.invoice.amountDue === 0) {
        return
      }
      const returnUrl = new URL(
        `/account/subscription?payment=return&invoice=${encodeURIComponent(result.invoice.id)}`,
        window.location.origin
      ).toString()
      const payment = await createPayment({
        invoiceId: result.invoice.id,
        provider,
        returnUrl,
      }).unwrap()

      if (payment.checkout?.url) {
        window.location.assign(payment.checkout.url)
        return
      }
      if (payment.checkout?.clientSecret && payment.checkout.publishableKey) {
        setStripeCheckout({
          clientSecret: payment.checkout.clientSecret,
          publishableKey: payment.checkout.publishableKey,
          returnUrl,
        })
      }
    } catch {
      /* The shared caller displays the service error. */
    }
  }

  if (!auth.loading && !auth.authenticated) {
    auth.login("/account/subscription")
    return null
  }

  if (auth.loading || catalog.isPending || subscriptions.isPending) {
    return <Skeleton className="min-h-[520px] rounded-3xl" />
  }

  const plans =
    catalog.data?.data.flatMap((product) =>
      product.plans.map((plan) => ({ product, plan }))
    ) ?? []
  const busy = subscriptionState.isLoading || paymentState.isLoading

  return (
    <div className="space-y-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-muted-foreground">
            Marketplace membership
          </p>
          <h1 className="text-3xl font-semibold">Plans and subscriptions</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Billing owns plans, invoices and entitlements. Payment Gateway
            completes the selected provider transaction.
          </p>
        </div>
        <Select
          value={provider}
          onValueChange={(value) => setProvider(value as PaymentProvider)}
          disabled={busy || Boolean(stripeCheckout)}
        >
          <SelectTrigger className="w-full sm:w-44">
            <CreditCard />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="stripe">Stripe</SelectItem>
            <SelectItem value="momo">MoMo</SelectItem>
            <SelectItem value="zalopay">ZaloPay</SelectItem>
            <SelectItem value="vnpay">VNPay</SelectItem>
          </SelectContent>
        </Select>
      </header>

      {returnedInvoiceId ? (
        <Card>
          <CardContent className="flex items-center justify-between gap-4 p-5">
            <div>
              <p className="font-medium">Payment return received</p>
              <p className="text-sm text-muted-foreground">
                The payment and invoice status are being verified server-side.
              </p>
            </div>
            <RefreshCw
              className={`size-5 ${returnedPayments.isFetching ? "animate-spin" : ""}`}
            />
          </CardContent>
        </Card>
      ) : null}

      {stripeCheckout ? (
        <Card>
          <CardHeader>
            <CardTitle>Confirm card payment</CardTitle>
          </CardHeader>
          <CardContent>
            <StripePayment
              clientSecret={stripeCheckout.clientSecret}
              publishableKey={stripeCheckout.publishableKey}
              returnUrl={stripeCheckout.returnUrl}
              onCancel={() => setStripeCheckout(null)}
            />
          </CardContent>
        </Card>
      ) : null}

      {subscriptions.data?.data.length ? (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Your subscriptions</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {subscriptions.data.data.map((subscription) => (
              <Card key={subscription.id}>
                <CardContent className="flex items-start justify-between gap-4 p-5">
                  <div>
                    <p className="font-medium capitalize">
                      {subscription.application}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {subscription.currentPeriodEnd
                        ? `Renews through ${new Date(subscription.currentPeriodEnd).toLocaleDateString("vi-VN")}`
                        : "No renewal date"}
                    </p>
                  </div>
                  <Badge className="capitalize">{subscription.status}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Available plans</h2>
        {plans.length ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {plans.map(({ product, plan }) => {
              const price = plan.prices[0]
              return (
                <Card key={plan.id} className="flex flex-col">
                  <CardHeader>
                    <p className="text-sm text-muted-foreground">
                      {product.name}
                    </p>
                    <CardTitle>{plan.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {plan.description ?? product.description}
                    </p>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col gap-5">
                    <div className="space-y-2">
                      {plan.features.map(({ feature }) => (
                        <p
                          key={feature.id}
                          className="flex items-center gap-2 text-sm"
                        >
                          <Check className="size-4 text-primary" />{" "}
                          {feature.name}
                        </p>
                      ))}
                    </div>
                    <div className="mt-auto">
                      <p className="mb-3 text-lg font-semibold">
                        {price ? recurringLabel(price) : "Unavailable"}
                      </p>
                      <Button
                        className="w-full"
                        disabled={!price || busy || Boolean(stripeCheckout)}
                        onClick={() => price && void subscribe(price)}
                      >
                        {busy ? "Preparing…" : "Choose plan"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No Marketplace billing plans have been published yet.
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  )
}
