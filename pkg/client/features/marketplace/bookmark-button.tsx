"use client"

import { useState } from "react"
import { Bookmark } from "@gorth/primitive/cores/lucide"
import { Button } from "@gorth/primitive/custom/button"

import { AuthRequiredDialog } from "@/components/auth-required-dialog"
import { useAuth } from "@/hooks/use-auth"
import {
  useMarketplaceBookmarkMutation,
  useMarketplaceRemoveBookmarkMutation,
  useMarketplaceResourceStateQuery,
} from "@/services/resource-interactions"

interface MarketplaceBookmarkButtonProps {
  resourceId: string
  resourceType?: "product" | "listing"
}

function currentPath() {
  return `${window.location.pathname}${window.location.search}`
}

export function MarketplaceBookmarkButton({
  resourceId,
  resourceType = "product",
}: MarketplaceBookmarkButtonProps) {
  const auth = useAuth()
  const target = { resourceId, resourceType }
  const state = useMarketplaceResourceStateQuery({
    ...target,
    enabled: auth.authenticated,
  })
  const [bookmark, bookmarkState] = useMarketplaceBookmarkMutation()
  const [removeBookmark, removeBookmarkState] =
    useMarketplaceRemoveBookmarkMutation()
  const [authDialogOpen, setAuthDialogOpen] = useState(false)
  const [returnTo, setReturnTo] = useState("/")

  const ready =
    !auth.loading && (!auth.authenticated || state.isFetched || state.isError)
  const bookmarked = state.data?.saves.includes("bookmark") ?? false
  const busy = bookmarkState.isLoading || removeBookmarkState.isLoading

  async function toggleBookmark() {
    if (!auth.authenticated) {
      setReturnTo(currentPath())
      setAuthDialogOpen(true)
      return
    }

    try {
      if (bookmarked) {
        await removeBookmark(target).unwrap()
      } else {
        await bookmark(target).unwrap()
      }
    } catch {
      // The shared caller renders the API error.
    }
  }

  return (
    <>
      {ready ? (
        <Button
          variant={bookmarked ? "default" : "outline"}
          disabled={busy}
          aria-pressed={bookmarked}
          onClick={() => void toggleBookmark()}
        >
          <Bookmark className="size-4" />
          {bookmarked ? "Saved" : "Save"}
        </Button>
      ) : null}

      <AuthRequiredDialog
        open={authDialogOpen}
        onOpenChange={setAuthDialogOpen}
        returnTo={returnTo}
      />
    </>
  )
}
