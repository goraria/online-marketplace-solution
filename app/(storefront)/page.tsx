import type { Metadata } from "next"
import { MarketplaceHome } from "@/features/marketplace/home"

export const metadata: Metadata = {
  title: "Gorth Market",
  description:
    "Discover products, services and digital goods across the Gorth ecosystem.",
}
export default function HomePage() {
  return <MarketplaceHome />
}
