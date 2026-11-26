import Link from "next/link"

export function MarketplaceFooter() {
  return (
    <footer className="mt-16 border-t bg-muted/30">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 text-sm sm:grid-cols-3 sm:px-6">
        <div>
          <p className="font-semibold">Gorth Market</p>
          <p className="mt-2 max-w-sm text-muted-foreground">
            A multi-category marketplace for physical goods, digital products,
            services and bundles.
          </p>
        </div>
        <div className="grid gap-2">
          <p className="font-medium">Shop</p>
          <Link
            href="/search"
            className="text-muted-foreground hover:text-foreground"
          >
            All products
          </Link>
          <Link
            href="/cart"
            className="text-muted-foreground hover:text-foreground"
          >
            Cart
          </Link>
          <Link
            href="/order"
            className="text-muted-foreground hover:text-foreground"
          >
            Orders
          </Link>
        </div>
        <div className="text-muted-foreground sm:text-right">
          <p>Catalog, checkout and order ownership stay in Marketplace.</p>
          <p className="mt-2">
            Payments, media and interactions are handled by Gorth services.
          </p>
        </div>
      </div>
    </footer>
  )
}
