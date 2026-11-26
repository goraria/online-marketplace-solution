import { cookies } from "next/headers"

import { SellerShell } from "@/layouts/seller"

export default async function SellerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const defaultOpen = (await cookies()).get("sidebar_state")?.value !== "false"
  return <SellerShell defaultOpen={defaultOpen}>{children}</SellerShell>
}
