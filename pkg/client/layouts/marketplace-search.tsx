"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { type FormEvent } from "react"
import { Search } from "@gorth/primitive/cores/lucide"
import { Button } from "@gorth/primitive/custom/button"
import { Input } from "@gorth/primitive/default/input"

export function MarketplaceSearch({ className = "" }: { className?: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const query = String(
      new FormData(event.currentTarget).get("query") ?? ""
    ).trim()
    router.push(
      query ? `/search?query=${encodeURIComponent(query)}` : "/search"
    )
  }

  return (
    <form
      key={searchParams.get("query") ?? ""}
      role="search"
      onSubmit={onSubmit}
      className={`relative min-w-0 ${className}`}
    >
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        name="query"
        defaultValue={searchParams.get("query") ?? ""}
        placeholder="Search products, brands and stores"
        className="h-9 w-full rounded-md bg-muted/60 pr-20 pl-9 focus-visible:bg-background"
        aria-label="Search marketplace"
      />
      <Button
        type="submit"
        size="sm"
        className="absolute top-1/2 right-1 h-7 -translate-y-1/2 rounded-md px-3"
      >
        Search
      </Button>
    </form>
  )
}
