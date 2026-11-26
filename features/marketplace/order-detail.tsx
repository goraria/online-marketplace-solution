"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  CreditCard,
  MapPin,
  RefreshCw,
  Store,
} from "@gorth-com/primitive/cores/lucide"
import { Badge } from "@gorth-com/primitive/default/badge"
import { Button } from "@gorth-com/primitive/custom/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@gorth-com/primitive/default/card"
import { Input } from "@gorth-com/primitive/default/input"
import { Skeleton } from "@gorth-com/primitive/default/skeleton"

import { useAuth } from "@/hooks/use-auth"
import { addressLine, formatMinorPrice, formatPrice } from "@/utils/marketplace"
import { useCancelOrderMutation, useOrderQuery } from "@/queries/marketplace"
import {
  useOrderPaymentQuery,
  useQueryPaymentMutation,
  useCreatePaymentMutation,
} from "@/queries/payment"
import { StripePayment } from "@/features/payment/stripe-payment"

export function OrderDetailView({ id }: { id: string }) {
  const auth = useAuth()
  const searchParams = useSearchParams()
  const order = useOrderQuery({ id, enabled: auth.authenticated })
  const payments = useOrderPaymentQuery({
    orderId: id,
    enabled: auth.authenticated,
  })
  const [reason, setReason] = useState("")
  const [cancel, cancelState] = useCancelOrderMutation()
  const [queryPayment, queryState] = useQueryPaymentMutation()
  const [createPayment, createState] = useCreatePaymentMutation()
  const [stripe, setStripe] = useState<{
    clientSecret: string
    publishableKey: string
    returnUrl: string
  } | null>(null)
  const returnCheckRef = useRef("")
  const payment = payments.data?.data[0]

  useEffect(() => {
    if (searchParams.get("payment") !== "return" || !payment) return
    if (
      ["succeeded", "failed", "cancelled", "refunded"].includes(payment.status)
    ) {
      return
    }
    const attempt = `${payment.id}:${payment.updatedAt}`
    if (returnCheckRef.current === attempt) return
    returnCheckRef.current = attempt
    async function checkPayment() {
      try {
        await queryPayment(payment!.id).unwrap()
      } catch {
        if (returnCheckRef.current === attempt) returnCheckRef.current = ""
      }
    }
    void checkPayment()
  }, [payment, queryPayment, searchParams])
  if (auth.loading || order.isPending)
    return <Skeleton className="min-h-[520px] rounded-3xl" />
  if (!order.data)
    return (
      <div className="rounded-2xl border p-10 text-center">
        Order not found.
      </div>
    )
  const data = order.data
  const cancellable =
    data.status === "awaiting_payment" &&
    !["succeeded", "partially_refunded", "refunded"].includes(
      payment?.status ?? ""
    )
  async function pay() {
    try {
      const returnUrl = new URL(
        "/order/" + id + "?payment=return",
        window.location.origin
      ).href
      const result = await createPayment({
        orderId: id,
        orderNumber: data.orderNumber,
        provider: payment?.provider ?? "stripe",
        returnUrl,
      }).unwrap()
      if (result.checkout?.url) window.location.assign(result.checkout.url)
      else if (result.checkout?.clientSecret && result.checkout.publishableKey)
        setStripe({
          clientSecret: result.checkout.clientSecret,
          publishableKey: result.checkout.publishableKey,
          returnUrl,
        })
    } catch {
      /* caller displays the failure */
    }
  }
  return (
    <div className="space-y-6">
      <Button
        nativeButton={false}
        render={<Link href="/order" />}
        variant="ghost"
      >
        <ArrowLeft /> All orders
      </Button>
      <section className="flex flex-col justify-between gap-4 rounded-3xl border bg-muted/20 p-7 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm text-muted-foreground">Order</p>
          <h1 className="text-2xl font-semibold">{data.orderNumber}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Placed {new Date(data.createdAt).toLocaleString("vi-VN")}
          </p>
        </div>
        <div className="text-left sm:text-right">
          <Badge className="capitalize">
            {data.status.replaceAll("_", " ")}
          </Badge>
          <p className="mt-2 text-2xl font-semibold">
            {formatPrice(data.grandTotal, data.currency)}
          </p>
        </div>
      </section>
      {cancellable ? (
        <Button onClick={() => void pay()} disabled={createState.isLoading}>
          Pay now
        </Button>
      ) : null}
      {stripe ? (
        <StripePayment
          clientSecret={stripe.clientSecret}
          publishableKey={stripe.publishableKey}
          returnUrl={stripe.returnUrl}
          onCancel={() => setStripe(null)}
        />
      ) : null}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="size-5" /> Payment
          </CardTitle>
          {payment ? (
            <Button
              size="sm"
              variant="outline"
              disabled={queryState.isLoading}
              onClick={() => void queryPayment(payment.id).unwrap()}
            >
              <RefreshCw
                className={queryState.isLoading ? "animate-spin" : ""}
              />
              Refresh
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          {payments.isPending ? (
            <Skeleton className="h-16 rounded-xl" />
          ) : payment ? (
            <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
              <div>
                <p className="font-medium capitalize">{payment.provider}</p>
                <p className="text-sm text-muted-foreground">
                  {formatMinorPrice(payment.amount, payment.currency)}
                </p>
              </div>
              <Badge className="capitalize">
                {payment.status.replaceAll("_", " ")}
              </Badge>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No payment has been created for this order.
            </p>
          )}
        </CardContent>
      </Card>
      {data.stores.map((storeOrder) => (
        <Card key={storeOrder.id}>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Store className="size-5" /> {storeOrder.storeName}
            </CardTitle>
            <Badge variant="secondary" className="capitalize">
              {storeOrder.status.replaceAll("_", " ")}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {storeOrder.items.map((item) => (
              <div
                key={item.id}
                className="flex justify-between gap-4 border-b pb-3 text-sm"
              >
                <span>
                  <span className="font-medium">{item.productTitle}</span>
                  <span className="block text-muted-foreground">
                    {item.variantTitle} · {item.quantity} ×{" "}
                    {formatPrice(item.unitPrice, data.currency)}
                  </span>
                </span>
                <span className="font-medium">
                  {formatPrice(item.lineTotal, data.currency)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
      <div className="grid gap-5 md:grid-cols-2">
        {data.addresses.map((address) => (
          <Card key={address.kind}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 capitalize">
                <MapPin className="size-5" /> {address.kind} address
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <p className="font-medium">
                {address.recipientName} · {address.phone}
              </p>
              <p className="mt-1 text-muted-foreground">
                {addressLine(address)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      {cancellable ? (
        <Card>
          <CardHeader>
            <CardTitle>Cancel order</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Reason for cancellation"
            />
            <Button
              variant="destructive"
              disabled={reason.trim().length < 3 || cancelState.isLoading}
              onClick={() =>
                void cancel({ id, reason, version: data.version }).unwrap()
              }
            >
              {cancelState.isLoading ? "Cancelling…" : "Cancel order"}
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
