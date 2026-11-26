import type { Metadata } from "next"
import { CheckoutView } from "@/features/marketplace/checkout"
export const metadata: Metadata = { title: "Checkout · Gorth Market" }
export default function CheckoutPage() {
  return <CheckoutView />
}
