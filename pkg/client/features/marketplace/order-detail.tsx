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
} from "@gorth/primitive/cores/lucide"
import { Badge } from "@gorth/primitive/default/badge"
import { Button } from "@gorth/primitive/custom/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@gorth/primitive/default/card"
import { Input } from "@gorth/primitive/default/input"
import { Skeleton } from "@gorth/primitive/default/skeleton"

import { useAuth } from "@/hooks/use-auth"
import {
  addressLine,
  formatMinorPrice,
  formatPrice,
} from "@/utils/marketplace"
import { useCancelOrderMutation, useOrderQuery } from "@/services/marketplace"
import {
  useOrderPaymentQuery,
  useQueryPaymentMutation,
} from "@/services/payment"

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
    void queryPayment(payment.id)
      .unwrap()
      .catch(() => {
        returnCheckRef.current = ""
      })
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
  const cancellable = data.status === "pending" || data.status === "confirmed"
  return (
    <div className="space-y-6">
      <Button render={<Link href="/order" />} variant="ghost">
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
              onClick={() => void cancel({ id, reason }).unwrap()}
            >
              {cancelState.isLoading ? "Cancelling…" : "Cancel order"}
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
