import { MarketplaceContent } from "@/components/marketplace/content"
import { MarketplaceHeader } from "@/layouts/marketplace-header"
export default function CheckoutLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-svh bg-muted/20">
      <MarketplaceHeader />
      <MarketplaceContent>{children}</MarketplaceContent>
    </div>
  )
}
