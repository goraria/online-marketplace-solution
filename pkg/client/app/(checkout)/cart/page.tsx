import type { Metadata } from "next"
import { CartView } from "@/features/marketplace/cart"
export const metadata: Metadata = { title: "Cart · Gorth Market" }
export default function CartPage() {
  return <CartView />
}
