"use client"

import Link from "next/link"
import { ChevronRight, Package } from "@gorth-com/primitive/cores/lucide"
import { Badge } from "@gorth-com/primitive/default/badge"
import { Card, CardContent } from "@gorth-com/primitive/default/card"
import { Skeleton } from "@gorth-com/primitive/default/skeleton"

import { EmptyState } from "@/components/marketplace/empty-state"
import { useAuth } from "@/hooks/use-auth"
import { formatPrice } from "@/utils/marketplace"
import { useOrderListQuery } from "@/queries/marketplace"

export function OrderListView() {
  const auth = useAuth()
  const orders = useOrderListQuery(auth.authenticated)
  if (auth.loading || orders.isPending)
    return <Skeleton className="min-h-[420px] rounded-3xl" />
  if (!auth.authenticated)
    return (
      <div className="rounded-2xl border p-10 text-center">
        <h1 className="text-2xl font-semibold">Sign in to see your orders</h1>
        <button
          disabled={auth.signingIn}
          aria-busy={auth.signingIn}
          onClick={() => auth.login("/order")}
          className="mt-4 text-primary underline"
        >
          Continue to sign in
        </button>
      </div>
    )
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Your purchases</p>
        <h1 className="text-3xl font-semibold tracking-tight">Orders</h1>
      </div>
      {orders.data?.length ? (
        <div className="space-y-3">
          {orders.data.map((order) => (
            <Link key={order.id} href={`/order/${order.id}`}>
              <Card className="transition hover:border-primary/40">
                <CardContent className="flex items-center gap-4 p-5">
                  <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Package />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">
                      {order.orderNumber}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {new Date(order.createdAt).toLocaleString("vi-VN")}
                    </span>
                  </span>
                  <Badge variant="secondary" className="capitalize">
                    {order.status.replaceAll("_", " ")}
                  </Badge>
                  <span className="hidden font-semibold sm:block">
                    {formatPrice(order.grandTotal, order.currency)}
                  </span>
                  <ChevronRight className="size-5 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No orders yet"
          description="Your completed checkouts will appear here."
        />
      )}
    </div>
  )
}
