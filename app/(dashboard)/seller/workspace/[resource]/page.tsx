import { BusinessWorkspace } from "@/features/business"
export default async function Page({
  params,
}: {
  params: Promise<{ resource: string }>
}) {
  const { resource } = await params
  return <BusinessWorkspace resource={resource} />
}
