import type { Metadata } from "next"
import { ProductSearch } from "@/features/marketplace/search"
import type { ProductQuery } from "@/queries/marketplace"

export const metadata: Metadata = { title: "Search · Gorth Market" }
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const value = (key: string) =>
    typeof params[key] === "string" ? (params[key] as string) : undefined
  return (
    <ProductSearch
      input={{
        query: value("query"),
        category: value("category"),
        sort: value("sort") as ProductQuery["sort"],
      }}
    />
  )
}
