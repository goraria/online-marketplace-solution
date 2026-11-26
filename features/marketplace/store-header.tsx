import {
  BadgeCheck,
  CalendarDays,
  CircleCheck,
  MapPin,
  Package,
  Store as StoreIcon,
} from "@gorth-com/primitive/cores/lucide"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@gorth-com/primitive/custom/avatar"
import { Badge } from "@gorth-com/primitive/custom/badge"
import { Card } from "@gorth-com/primitive/default/card"

import type { StoreDetail } from "@/utils/marketplace-types"
import { mediaUrl } from "@/utils/marketplace"

export function StoreHeader({ store }: { store: StoreDetail }) {
  const banner = mediaUrl(store.bannerMediaId)
  return (
    <Card className="overflow-hidden border-border/50 py-0">
      <div className="relative h-44 overflow-hidden bg-gradient-to-r from-primary/25 via-sky-500/15 to-violet-500/20 sm:h-60">
        {banner && (
          // Media URLs are provided by the Marketplace Media service.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={banner}
            alt={`${store.name} banner`}
            className="size-full object-cover"
          />
        )}
        {!banner && (
          <StoreIcon
            className="absolute bottom-4 right-6 size-24 text-primary/10 sm:size-36"
            aria-hidden="true"
          />
        )}
      </div>
      <div className="flex flex-col gap-4 px-5 pb-6 sm:flex-row sm:items-end sm:px-8">
        <Avatar className="-mt-12 size-24 rounded-xl border-4 border-background bg-background shadow-lg sm:size-28">
          <AvatarImage
            src={mediaUrl(store.logoMediaId) ?? undefined}
            alt={store.name}
            className="size-full rounded-lg object-cover"
          />
          <AvatarFallback className="rounded-lg text-2xl font-semibold">
            {store.name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {store.name}
            </h1>
            {store.badge === "verified" && (
              <CircleCheck
                className="size-5 shrink-0 fill-sky-500 text-white"
                aria-label="Verified store"
              />
            )}
            {store.badge === "official_brand" && (
              <BadgeCheck
                className="size-6 shrink-0 fill-primary text-primary-foreground"
                aria-label="Official brand store"
              />
            )}
            <Badge variant="outline">
              {store.type === "platform"
                ? "Gorth-operated"
                : "Independent seller"}
            </Badge>
            {store.isDemo && <Badge variant="secondary">Demo store</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            {store.description ?? "Welcome to our store on Gorth Market."}
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" />
              {store.countryCode}
            </span>
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="size-3.5" />
              Joined{" "}
              {new Date(store.createdAt).toLocaleDateString("en-US", {
                timeZone: "UTC",
              })}
            </span>
            <span className="inline-flex items-center gap-1">
              <Package className="size-3.5" />
              {store.productCount} published products
            </span>
          </div>
        </div>
      </div>
    </Card>
  )
}
