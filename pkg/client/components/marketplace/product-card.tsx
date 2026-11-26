import Link from "next/link"
import { ImageIcon, Store } from "@gorth/primitive/cores/lucide"
import { Badge } from "@gorth/primitive/default/badge"
import { Card, CardContent } from "@gorth/primitive/default/card"

import type { ProductSummary } from "@/lib/marketplace/types"
import { formatPrice, mediaUrl } from "@/utils/marketplace"

export function ProductCard({ product, demo = false }: { product: ProductSummary; demo?: boolean }) {
  const image = mediaUrl(product.mediaId)
  const discount =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? Math.round((1 - product.price / product.compareAtPrice) * 100)
      : null

  const content = (
    <>
        <div className="relative aspect-square overflow-hidden bg-muted">
          {image ? (
            // Media service URLs are runtime data and may be external.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt={product.mediaAlt ?? product.title}
              className="size-full object-cover transition duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="grid size-full place-items-center text-muted-foreground">
              <ImageIcon className="size-12" />
            </div>
          )}
          {discount ? (
            <Badge className="absolute top-2 left-2">-{discount}%</Badge>
          ) : null}
          {demo && <Badge className="absolute top-2 left-2">Demo</Badge>}
          <Badge
            variant="secondary"
            className="absolute top-2 right-2 capitalize"
          >
            {product.kind}
          </Badge>
        </div>
        <CardContent className="space-y-2 p-4">
          <h3 className="line-clamp-2 min-h-10 leading-5 font-medium">
            {product.title}
          </h3>
          <div className="flex items-end gap-2">
            <span className="text-lg font-semibold text-primary">
              {formatPrice(product.price, product.currency)}
            </span>
            {product.compareAtPrice ? (
              <span className="text-xs text-muted-foreground line-through">
                {formatPrice(product.compareAtPrice, product.currency)}
              </span>
            ) : null}
          </div>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Store className="size-3" /> {product.storeName}
          </span>
        </CardContent>
    </>
  )

  return (
    <Card className="group overflow-hidden py-0 transition hover:-translate-y-0.5 hover:shadow-lg">
      {demo ? <div className="block">{content}</div> : <Link href={`/product/${product.slug}`} className="block">{content}</Link>}
    </Card>
  )
}
