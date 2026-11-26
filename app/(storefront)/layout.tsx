import { MarketplaceFooter } from "@/components/marketplace/footer"
import { MarketplaceContent } from "@/components/marketplace/content"
import { MarketplaceHeader } from "@/layouts/marketplace-header"
import { Subar } from "@/layouts/subar"

export default function StorefrontLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-svh bg-background">
      <MarketplaceHeader />
      <Subar />
      <MarketplaceContent>{children}</MarketplaceContent>
      <MarketplaceFooter />
    </div>
  )
}
