"use client"

import Link from "next/link"
import {
  BadgeCheck,
  PackageCheck,
  ShieldCheck,
} from "@gorth/primitive/cores/lucide"
import { useLayout } from "@gorth/primitive/providers/layout"

import { MarketplaceSearch } from "@/layouts/marketplace-search"

const serviceBadges = [
  { icon: BadgeCheck, label: "Verified sellers" },
  { icon: PackageCheck, label: "Track your orders" },
  { icon: ShieldCheck, label: "Protected checkout" },
]

export function Subar() {
  const { navbarBehavior, variant, width } = useLayout()
  const floating = variant === "floating"
  const container = width === "full-width" ? "w-full" : "container mx-auto"

  return (
    <div
      className={`${navbarBehavior === "sticky" ? `sticky z-40 ${floating ? "top-[4.5rem]" : "top-14"}` : "relative"} ${floating ? "px-6 pb-2" : "border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"}`}
    >
      <div
        className={`${container} ${floating ? "rounded-lg bg-background/95 shadow-sm ring-1 ring-sidebar-border backdrop-blur supports-[backdrop-filter]:bg-background/80" : ""}`}
      >
        <div className="px-4 pt-2 md:hidden">
          <MarketplaceSearch className="w-full" />
        </div>
        <div className="flex min-h-12 items-center gap-3 overflow-x-auto px-4 py-2 text-xs sm:px-6">
          <div className="flex shrink-0 items-center gap-3 rounded-full bg-muted px-3 py-2 text-muted-foreground lg:gap-5">
            {serviceBadges.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="flex items-center gap-1.5 whitespace-nowrap"
              >
                <Icon className="size-4" /> {label}
              </span>
            ))}
          </div>
          <nav
            aria-label="Marketplace shortcuts"
            className="ml-auto flex shrink-0 items-center gap-3 whitespace-nowrap"
          >
            <Link href="/search" className="hover:text-primary">
              Explore
            </Link>
            <Link href="/order" className="hover:text-primary">
              Orders
            </Link>
          </nav>
        </div>
      </div>
    </div>
  )
}
