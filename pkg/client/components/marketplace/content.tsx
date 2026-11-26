"use client"

import { useLayout } from "@gorth/primitive/providers/layout"

export function MarketplaceContent({
  children,
  narrow = false,
}: Readonly<{ children: React.ReactNode; narrow?: boolean }>) {
  const { width } = useLayout()

  return (
    <main
      className={`${width === "full-width" ? "w-full" : narrow ? "mx-auto max-w-5xl" : "mx-auto max-w-7xl"} px-4 py-8 sm:px-6`}
    >
      {children}
    </main>
  )
}
