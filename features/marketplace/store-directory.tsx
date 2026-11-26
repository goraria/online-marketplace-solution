"use client"

import Link from "next/link"

import {
  BadgeCheck,
  CircleCheck,
  MapPin,
  Store,
} from "@gorth-com/primitive/cores/lucide"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@gorth-com/primitive/custom/avatar"
import { Badge } from "@gorth-com/primitive/custom/badge"
import { Card, CardContent } from "@gorth-com/primitive/default/card"
import { Skeleton } from "@gorth-com/primitive/default/skeleton"

import { EmptyState } from "@/components/marketplace/empty-state"
import { mediaUrl } from "@/utils/marketplace"
import { useStoreListQuery } from "@/queries/marketplace"

export function StoreDirectory() {
  const stores = useStoreListQuery(undefined)
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-primary">Gorth Market</p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Explore stores
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Find independent, verified, and official brand storefronts.
        </p>
      </div>
      {stores.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }, (_, index) => (
            <Skeleton key={index} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : stores.error ? (
        <p role="alert" className="text-sm text-destructive">
          Could not load stores.
        </p>
      ) : stores.data?.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stores.data.map((store) => (
            <Link
              key={store.id}
              href={`/store?shop=${encodeURIComponent(store.slug)}`}
            >
              <Card className="h-full transition hover:border-primary/50 hover:shadow-md">
                <CardContent className="flex gap-4 p-5">
                  <Avatar className="size-14 rounded-xl">
                    <AvatarImage
                      src={mediaUrl(store.logoMediaId) ?? undefined}
                      alt={store.name}
                    />
                    <AvatarFallback className="rounded-xl">
                      {store.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h2 className="font-semibold">{store.name}</h2>
                      {store.badge === "verified" && (
                        <CircleCheck
                          aria-label="Verified store"
                          className="size-4 fill-sky-500 text-white"
                        />
                      )}
                      {store.badge === "official_brand" && (
                        <BadgeCheck
                          aria-label="Official brand store"
                          className="size-5 fill-primary text-primary-foreground"
                        />
                      )}
                    </div>
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {store.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3" />
                        {store.countryCode}
                      </span>
                      <span>
                        {store.type === "platform"
                          ? "Gorth-operated"
                          : "Independent"}
                      </span>
                      {store.isDemo && <Badge variant="secondary">Demo</Badge>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No stores yet"
          description="Active storefronts will appear here."
        />
      )}
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <Store className="size-3.5" /> Stores marked Demo contain example
        content; preview items are not purchasable.
      </p>
    </div>
  )
}
