"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import {
  ChevronRight,
  ImageIcon,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Store,
  Truck,
} from "@gorth/primitive/cores/lucide"
import { Badge } from "@gorth/primitive/default/badge"
import { Button } from "@gorth/primitive/custom/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@gorth/primitive/default/card"
import { Skeleton } from "@gorth/primitive/default/skeleton"

import { AuthRequiredDialog } from "@/components/auth-required-dialog"
import { MarketplaceBookmarkButton } from "@/features/marketplace/bookmark-button"
import { useAuth } from "@/hooks/use-auth"
import { formatPrice, mediaUrl } from "@/utils/marketplace"
import { useAddCartItemMutation, useProductQuery } from "@/services/marketplace"

export function ProductDetailView({ slug }: { slug: string }) {
  const auth = useAuth()
  const product = useProductQuery(slug)
  const [offerId, setOfferId] = useState<string | null>(null)
  const [imageId, setImageId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [authDialog, setAuthDialog] = useState(false)
  const [addItem, addState] = useAddCartItemMutation()
  const selectedOffer = useMemo(
    () =>
      product.data?.offers.find(
        (offer) => offer.listingVariantId === offerId
      ) ?? product.data?.offers[0],
    [offerId, product.data?.offers]
  )

  if (product.isPending)
    return <Skeleton className="min-h-[620px] rounded-3xl" />
  if (product.isError || !product.data)
    return (
      <div className="rounded-2xl border p-10 text-center">
        <h1 className="text-xl font-semibold">Product unavailable</h1>
        <p className="mt-2 text-muted-foreground">
          This product may be unpublished or no longer available.
        </p>
      </div>
    )

  const item = product.data
  const selectedImage = item.media.find((image) => image.mediaId === imageId) ?? item.media[0]
  const hero = mediaUrl(selectedImage?.mediaId)
  const canAdd = Boolean(selectedOffer && selectedOffer.stock >= quantity)

  async function addToCart() {
    if (!auth.authenticated) return setAuthDialog(true)
    if (!selectedOffer) return
    try {
      await addItem({
        listingVariantId: selectedOffer.listingVariantId,
        quantity,
      }).unwrap()
    } catch {
      /* caller shows error */
    }
  }

  return (
    <div className="space-y-10">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/">Home</Link>
        <ChevronRight className="size-4" />
        <Link href="/search">Products</Link>
        <ChevronRight className="size-4" />
        <span className="truncate text-foreground">{item.title}</span>
      </nav>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,.85fr)]">
        <div className="space-y-3">
          <div className="overflow-hidden rounded-3xl border bg-muted">
            <div className="grid aspect-square place-items-center">
              {hero ? (
                // Runtime media URLs are served by the shared Media service.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={hero}
                  alt={selectedImage?.alt ?? item.title}
                  className="size-full object-cover"
                />
              ) : (
                <ImageIcon className="size-20 text-muted-foreground" />
              )}
            </div>
          </div>
          {item.media.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Product image gallery">
              {item.media.map((image, index) => {
                const source = mediaUrl(image.mediaId)
                return source ? (
                  <Button
                    key={image.id}
                    type="button"
                    variant="outline"
                    aria-label={`View product image ${index + 1}`}
                    aria-pressed={selectedImage?.id === image.id}
                    className={`size-20 shrink-0 overflow-hidden p-0 ${selectedImage?.id === image.id ? "ring-2 ring-primary" : ""}`}
                    onClick={() => setImageId(image.mediaId)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={source} alt={image.alt ?? `${item.title} image ${index + 1}`} className="size-full object-cover" />
                  </Button>
                ) : null
              })}
            </div>
          )}
        </div>
        <div className="space-y-6">
          <div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="capitalize">
                {item.kind}
              </Badge>
              {item.brand ? (
                <Badge variant="outline">{item.brand}</Badge>
              ) : null}
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              {item.title}
            </h1>
            <p className="mt-3 text-muted-foreground">
              {item.description ?? "No product description has been provided."}
            </p>
          </div>
          {selectedOffer ? (
            <div className="space-y-4 rounded-2xl border bg-card p-5">
              <div>
                <p className="text-3xl font-bold text-primary">
                  {formatPrice(selectedOffer.price, selectedOffer.currency)}
                </p>
                {selectedOffer.compareAtPrice ? (
                  <p className="text-sm text-muted-foreground line-through">
                    {formatPrice(
                      selectedOffer.compareAtPrice,
                      selectedOffer.currency
                    )}
                  </p>
                ) : null}
              </div>
              {item.offers.length > 1 ? (
                <div>
                  <p className="mb-2 text-sm font-medium">Variant and seller</p>
                  <div className="flex flex-wrap gap-2">
                    {item.offers.map((offer) => (
                      <Button
                        key={offer.listingVariantId}
                        type="button"
                        size="sm"
                        variant={
                          offer.listingVariantId ===
                          selectedOffer.listingVariantId
                            ? "default"
                            : "outline"
                        }
                        onClick={() => setOfferId(offer.listingVariantId)}
                      >
                        {offer.variantTitle} · {offer.storeName}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : null}
              <Link
                href={`/store?shop=${encodeURIComponent(selectedOffer.storeSlug)}`}
                className="flex items-center gap-2 text-sm hover:text-primary"
              >
                <Store className="size-4" /> Sold by {selectedOffer.storeName}
              </Link>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center rounded-lg border">
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={quantity <= selectedOffer.minimumQuantity}
                    onClick={() =>
                      setQuantity((value) =>
                        Math.max(selectedOffer.minimumQuantity, value - 1)
                      )
                    }
                  >
                    <Minus />
                  </Button>
                  <span className="w-10 text-center font-medium">
                    {quantity}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={
                      quantity >=
                      Math.min(
                        selectedOffer.maximumQuantity ?? 99,
                        selectedOffer.stock
                      )
                    }
                    onClick={() => setQuantity((value) => value + 1)}
                  >
                    <Plus />
                  </Button>
                </div>
                <Button
                  className="flex-1"
                  size="lg"
                  disabled={!canAdd || addState.isLoading}
                  onClick={() => void addToCart()}
                >
                  <ShoppingCart />
                  {addState.isLoading
                    ? "Adding…"
                    : canAdd
                      ? "Add to cart"
                      : "Out of stock"}
                </Button>
                <MarketplaceBookmarkButton
                  resourceId={item.id}
                  resourceType="product"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedOffer.stock} available · SKU {selectedOffer.sellerSku}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed p-6 text-center text-muted-foreground">
              No active offer is available.
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex gap-3 rounded-xl border p-4">
              <Truck className="size-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Fulfilment ready</p>
                <p className="text-xs text-muted-foreground">
                  Availability is checked again at checkout.
                </p>
              </div>
            </div>
            <div className="flex gap-3 rounded-xl border p-4">
              <ShieldCheck className="size-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Secure purchase</p>
                <p className="text-xs text-muted-foreground">
                  Authentication and order ownership are verified server-side.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      {item.attributes.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Product details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {item.attributes.map((attribute) => (
              <div
                key={`${attribute.attributeId}-${attribute.code}`}
                className="flex justify-between gap-4 border-b py-2 text-sm"
              >
                <span className="text-muted-foreground">{attribute.name}</span>
                <span className="text-right font-medium">
                  {attribute.valueText ??
                    attribute.valueNumber ??
                    String(
                      attribute.valueBoolean ?? attribute.valueDate ?? "—"
                    )}
                  {attribute.unit ? ` ${attribute.unit}` : ""}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
      <AuthRequiredDialog
        open={authDialog}
        onOpenChange={setAuthDialog}
        returnTo={`/product/${slug}`}
      />
    </div>
  )
}
