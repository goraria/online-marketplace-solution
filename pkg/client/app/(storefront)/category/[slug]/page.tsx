import { CategoryView } from "@/features/marketplace/category"
export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return <CategoryView slug={slug} />
}
