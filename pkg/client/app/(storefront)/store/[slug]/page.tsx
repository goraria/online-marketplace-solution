import { redirect } from "next/navigation"

export default async function LegacyStorePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  redirect(`/store?shop=${encodeURIComponent(slug)}`)
}
