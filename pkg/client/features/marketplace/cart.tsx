"use client"

import Link from "next/link"
import { ImageIcon, Minus, Plus, Trash2 } from "@gorth/primitive/cores/lucide"
import { Button } from "@gorth/primitive/custom/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@gorth/primitive/default/card"
import { Skeleton } from "@gorth/primitive/default/skeleton"

import { EmptyState } from "@/components/marketplace/empty-state"
import { useAuth } from "@/hooks/use-auth"
import { formatPrice, mediaUrl } from "@/utils/marketplace"
import {
  useCartQuery,
  useRemoveCartItemMutation,
  useUpdateCartItemMutation,
} from "@/services/marketplace"

export function CartView() {
  const auth = useAuth()
  const cart = useCartQuery(auth.authenticated)
  const [updateItem, updateState] = useUpdateCartItemMutation()
  const [removeItem, removeState] = useRemoveCartItemMutation()

  if (auth.loading || cart.isPending)
    return <Skeleton className="min-h-[480px] rounded-3xl" />
  if (!auth.authenticated)
    return <AuthCartPrompt onSignIn={() => auth.login("/cart")} />
  if (!cart.data?.items.length)
    return (
      <EmptyState
        title="Your cart is empty"
        description="Add an item from a product page to start an order."
      />
    )

  const busy = updateState.isLoading || removeState.isLoading
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight">Shopping cart</h1>
        <p className="mt-1 text-muted-foreground">
          {cart.data.quantity} item{cart.data.quantity === 1 ? "" : "s"}
        </p>
        <div className="mt-6 space-y-3">
          {cart.data.items.map((item) => {
            const image = mediaUrl(item.mediaId)
            return (
              <Card key={item.id} className="py-0">
                <CardContent className="flex gap-4 p-4">
                  <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-xl bg-muted">
                    {image ? (
                      // Runtime media URLs are served by the shared Media service.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={image}
                        alt={item.productTitle}
                        className="size-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="size-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/product/${item.productSlug}`}
                      className="font-medium hover:text-primary"
                    >
                      {item.productTitle}
                    </Link>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.variantTitle} · {item.storeName}
                    </p>
                    <p className="mt-3 font-semibold">
                      {formatPrice(item.unitPrice, item.currency)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end justify-between">
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => void removeItem(item.id).unwrap()}
                    >
                      <Trash2 />
                    </Button>
                    <div className="flex items-center rounded-lg border">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        disabled={busy || item.quantity <= 1}
                        onClick={() =>
                          void updateItem({
                            id: item.id,
                            quantity: item.quantity - 1,
                          }).unwrap()
                        }
                      >
                        <Minus />
                      </Button>
                      <span className="w-8 text-center text-sm">
                        {item.quantity}
                      </span>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        disabled={busy || item.quantity >= 99}
                        onClick={() =>
                          void updateItem({
                            id: item.id,
                            quantity: item.quantity + 1,
                          }).unwrap()
                        }
                      >
                        <Plus />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>
      <Card className="h-fit lg:sticky lg:top-24">
        <CardHeader>
          <CardTitle>Order summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Merchandise</span>
            <span>{formatPrice(cart.data.subtotal, cart.data.currency)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Shipping and tax</span>
            <span>Calculated at checkout</span>
          </div>
          <div className="flex justify-between border-t pt-4 text-lg font-semibold">
            <span>Total</span>
            <span>{formatPrice(cart.data.subtotal, cart.data.currency)}</span>
          </div>
          <Button
            render={<Link href="/checkout" />}
            size="lg"
            className="w-full"
          >
            Continue to checkout
          </Button>
          <Button
            render={<Link href="/search" />}
            variant="outline"
            className="w-full"
          >
            Continue shopping
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function AuthCartPrompt({ onSignIn }: { onSignIn: () => void }) {
  return (
    <div className="grid min-h-80 place-items-center rounded-3xl border bg-muted/20 text-center">
      <div>
        <h1 className="text-2xl font-semibold">Sign in to view your cart</h1>
        <p className="mt-2 text-muted-foreground">
          Your cart and orders are securely tied to your Gorth account.
        </p>
        <Button className="mt-5" onClick={onSignIn}>
          Sign in
        </Button>
      </div>
    </div>
  )
}
