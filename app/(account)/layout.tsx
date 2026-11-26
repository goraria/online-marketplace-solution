import { MarketplaceContent } from "@/components/marketplace/content"
import { MarketplaceHeader } from "@/layouts/marketplace-header"
export default function AccountLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-svh">
      <MarketplaceHeader />
      <MarketplaceContent narrow>{children}</MarketplaceContent>
    </div>
  )
}
