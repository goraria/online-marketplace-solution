import { notFound } from "next/navigation"

import { AdminResourceTable } from "@/features/admin/table"
import { adminResources, type AdminResource } from "@/lib/marketplace/admin"

export default async function AdminResourcePage({
  params,
}: {
  params: Promise<{ resource: string }>
}) {
  const { resource } = await params
  if (!adminResources.includes(resource as AdminResource)) notFound()

  return <AdminResourceTable resource={resource as AdminResource} />
}
