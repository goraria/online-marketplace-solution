import { BusinessServicePanel } from "@/features/business/service"
export default async function Page({
  params,
}: {
  params: Promise<{ domain: string }>
}) {
  const { domain } = await params
  return <BusinessServicePanel domain={domain} />
}
