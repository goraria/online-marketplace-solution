import type { Metadata } from "next"
import { ProductDetailView } from "@/features/marketplace/product-detail"

export const metadata: Metadata = { title: "Product · Gorth Market" }
export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return <ProductDetailView slug={slug} />
}
