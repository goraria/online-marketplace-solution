"use client"

import Link from "next/link"
import { AppBrand } from "@/components/app-brand"
import { usePathname } from "next/navigation"
import { useState } from "react"
import {
  LogIn,
  LogOut,
  Menu,
  Package,
  ReceiptText,
  ShoppingCart,
  Store,
  UserPlus,
  UserRound,
} from "@gorth-com/primitive/cores/lucide"
import { Button } from "@gorth-com/primitive/custom/button"
import { Badge } from "@gorth-com/primitive/default/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@gorth-com/primitive/default/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@gorth-com/primitive/default/sheet"
import { Header } from "@gorth-com/primitive/layouts/header"

import { useAuth } from "@/hooks/use-auth"
import { MarketplaceSearch } from "@/layouts/marketplace-search"
import { useCartQuery, useCatalogQuery } from "@/queries/marketplace"

function CategoryNavigation({ mobile = false }: { mobile?: boolean }) {
  const [open, setOpen] = useState(false)
  const catalog = useCatalogQuery(undefined)
  const categories = catalog.data?.categories ?? []

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="outline"
            size={mobile ? "icon" : "sm"}
            className={mobile ? "md:hidden" : "hidden h-9 shrink-0 md:flex"}
            aria-label="Browse categories"
          />
        }
      >
        <Menu className="size-4" />
        {!mobile && <span>Categories</span>}
      </SheetTrigger>
      <SheetContent side="left" className="gap-2 p-4">
        <SheetHeader className="p-0">
          <SheetTitle>Browse Gorth Market</SheetTitle>
        </SheetHeader>
        <nav
          aria-label="Product categories"
          className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pt-4"
        >
          <Button
            nativeButton={false}
            render={<Link href="/search" />}
            variant="ghost"
            className="justify-start"
            onClick={() => setOpen(false)}
          >
            All products
          </Button>
          {categories.map((category) => (
            <Button
              nativeButton={false}
              key={category.id}
              render={<Link href={`/category/${category.slug}`} />}
              variant="ghost"
              className="justify-start"
              onClick={() => setOpen(false)}
            >
              {category.name}
            </Button>
          ))}
          {!categories.length && (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              {catalog.isPending
                ? "Loading categories…"
                : "No categories available yet."}
            </p>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  )
}

export function MarketplaceHeader() {
  const auth = useAuth()
  const pathname = usePathname()
  const cart = useCartQuery(auth.authenticated)

  return (
    <Header
      nav={{ main: [], secondary: [] }}
      auth={auth}
      user={{
        name: auth.account?.name ?? "Guest",
        email: auth.account?.email ?? "",
        avatar: auth.account?.image ?? "",
      }}
      bottom={
        <Link
          href="/"
          aria-label="Gorth Market home"
          className="flex shrink-0 items-center gap-2 font-semibold tracking-tight"
        >
          <AppBrand />
        </Link>
      }
      left={
        <div className="hidden min-w-0 flex-1 items-center gap-2 md:flex">
          <CategoryNavigation />
          <MarketplaceSearch className="flex-1" />
        </div>
      }
      right={
        <nav
          aria-label="Marketplace account and cart"
          className="flex shrink-0 items-center gap-1"
        >
          <Button
            nativeButton={false}
            render={<Link href="/cart" />}
            variant="ghost"
            size="icon"
            className="relative size-9"
            aria-label="Cart"
          >
            <ShoppingCart className="size-4" />
            {(cart.data?.quantity ?? 0) > 0 && (
              <Badge className="absolute -top-1 -right-1 min-w-5 justify-center px-1 text-[10px]">
                {cart.data?.quantity}
              </Badge>
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-9"
                  aria-label="Account menu"
                />
              }
            >
              <UserRound className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-52">
              {auth.authenticated ? (
                <>
                  <DropdownMenuLabel className="max-w-52 truncate">
                    {auth.account?.name || auth.account?.email || "Account"}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    nativeButton={false}
                    render={<Link href="/account" />}
                  >
                    <UserRound /> Account
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    nativeButton={false}
                    render={<Link href="/order" />}
                  >
                    <Package /> Orders
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    nativeButton={false}
                    render={<Link href="/seller/product" />}
                  >
                    <Store /> Seller center
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    nativeButton={false}
                    render={<Link href="/account/subscription" />}
                  >
                    <ReceiptText /> Subscriptions
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => void auth.logout(pathname)}>
                    <LogOut /> Sign out
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem
                    disabled={auth.signingIn}
                    aria-busy={auth.signingIn}
                    onClick={() => auth.login(pathname)}
                  >
                    <LogIn /> Sign in
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={auth.signingIn}
                    aria-busy={auth.signingIn}
                    onClick={() => auth.register(pathname)}
                  >
                    <UserPlus /> Sign up
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <CategoryNavigation mobile />
        </nav>
      }
    />
  )
}
