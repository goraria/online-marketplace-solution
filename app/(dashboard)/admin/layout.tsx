import { cookies } from "next/headers"

import { AdminShell } from "@/layouts/admin"

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const defaultOpen = (await cookies()).get("sidebar_state")?.value !== "false"

  return <AdminShell defaultOpen={defaultOpen}>{children}</AdminShell>
}
