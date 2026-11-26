"use client"

import Link from "next/link"
import {
  ArrowRight,
  BadgeCheck,
  Boxes,
  PackageCheck,
  ShieldCheck,
  Sparkles,
} from "@gorth/primitive/cores/lucide"
import { Button } from "@gorth/primitive/custom/button"
import { Card, CardContent } from "@gorth/primitive/default/card"
import { Skeleton } from "@gorth/primitive/default/skeleton"

import { EmptyState } from "@/components/marketplace/empty-state"
import { ProductCard } from "@/components/marketplace/product-card"
import { useCatalogQuery } from "@/services/marketplace"

export function MarketplaceHome() {
  const catalog = useCatalogQuery(undefined)

  return (
    <div className="space-y-14">
      <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/15 via-background to-violet-500/10 px-6 py-14 sm:px-12 lg:py-20">
        <div className="relative z-10 max-w-2xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-sm">
            <Sparkles className="size-4 text-primary" /> One market, every kind
            of product
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Find what matters. Buy with confidence.
          </h1>
          <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
            Discover products from independent stores across physical, digital,
            service and bundle categories.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button render={<Link href="/search" />} size="lg">
              Explore products <ArrowRight />
            </Button>
            <Button render={<Link href="/order" />} size="lg" variant="outline">
              Track an order
            </Button>
            <Button render={<Link href="/store" />} size="lg" variant="outline">
              Explore stores
            </Button>
          </div>
        </div>
        <Boxes className="absolute -right-10 -bottom-14 size-72 rotate-[-8deg] text-primary/10" />
      </section>

      <section>
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-primary">
              Browse the market
            </p>
            <h2 className="text-2xl font-semibold tracking-tight">
              Popular categories
            </h2>
          </div>
          <Button render={<Link href="/search" />} variant="ghost">
            View all <ArrowRight />
          </Button>
        </div>
        {catalog.isPending ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-28 rounded-2xl" />
            ))}
          </div>
        ) : catalog.data?.categories.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {catalog.data.categories.slice(0, 12).map((category) => (
              <Link key={category.id} href={`/category/${category.slug}`}>
                <Card className="h-full py-0 transition hover:border-primary/50 hover:bg-primary/5">
                  <CardContent className="flex h-full min-h-28 flex-col justify-between p-4">
                    <Boxes className="size-6 text-primary" />
                    <div>
                      <p className="font-medium">{category.name}</p>
                      <p className="line-clamp-1 text-xs text-muted-foreground">
                        {category.description ?? "Explore category"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No categories yet"
            description="Published categories will appear here."
          />
        )}
      </section>

      <section>
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-primary">Fresh arrivals</p>
            <h2 className="text-2xl font-semibold tracking-tight">
              Featured products
            </h2>
          </div>
          <Button render={<Link href="/search?sort=newest" />} variant="ghost">
            Shop all <ArrowRight />
          </Button>
        </div>
        {catalog.isPending ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, index) => (
              <Skeleton key={index} className="aspect-[3/4] rounded-2xl" />
            ))}
          </div>
        ) : catalog.data?.featured.length ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {catalog.data.featured.map((product) => (
              <ProductCard key={product.listingVariantId} product={product} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No products yet"
            description="Active listings will appear here after sellers publish them."
          />
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          [
            ShieldCheck,
            "Protected checkout",
            "Order ownership and stock checks run on the Marketplace server.",
          ],
          [
            PackageCheck,
            "Clear order status",
            "Follow each store shipment from one order timeline.",
          ],
          [
            BadgeCheck,
            "Trusted ecosystem",
            "SSO, payment, media and engagement remain isolated Gorth services.",
          ],
        ].map(([Icon, title, text]) => (
          <Card key={String(title)}>
            <CardContent className="p-6">
              <Icon className="size-7 text-primary" />
              <h3 className="mt-4 font-semibold">{title as string}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {text as string}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  )
}
