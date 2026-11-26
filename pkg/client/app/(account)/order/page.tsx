import type { Metadata } from "next"
import { OrderListView } from "@/features/marketplace/order-list"
export const metadata: Metadata = { title: "Orders · Gorth Market" }
export default function OrderPage() {
  return <OrderListView />
}
