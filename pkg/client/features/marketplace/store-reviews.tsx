"use client"

import { useMemo } from "react"

import { Star } from "@gorth/primitive/cores/lucide"
import { Avatar, AvatarFallback } from "@gorth/primitive/custom/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@gorth/primitive/default/card"

import { EmptyState } from "@/components/marketplace/empty-state"
import { demoStoreReviews } from "@/lib/marketplace/demo"
import type { StoreDetail } from "@/lib/marketplace/types"

function ReviewStars({ rating }: { rating: number }) {
  return <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
    {Array.from({ length: 5 }, (_, index) => <Star key={index} className={`size-4 ${index < rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/35"}`} />)}
  </span>
}

export function StoreReviews({ store }: { store: StoreDetail }) {
  const examples = useMemo(() => demoStoreReviews(store.slug), [store.slug])
  const reviews = store.isDemo ? examples : []
  const average = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0
  const counts = [5, 4, 3, 2, 1].map((stars) => ({ stars, count: reviews.filter((review) => review.rating === stars).length }))

  return <div className="grid gap-6 lg:grid-cols-3">
    <div className="space-y-4 lg:col-span-2">
      <div><h2 className="text-xl font-semibold">Product ratings &amp; reviews</h2>{store.isDemo && <p className="text-sm text-muted-foreground">Example reviews generated for this demo store; not submitted by buyers.</p>}</div>
      {reviews.length ? reviews.map((review) => <Card key={review.id}><CardContent className="space-y-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><Avatar className="size-9"><AvatarFallback>{review.author.split(" ").map((part) => part[0]).slice(0, 2).join("")}</AvatarFallback></Avatar><div><p className="text-sm font-medium">{review.author}</p><p className="text-xs text-muted-foreground">{review.daysAgo} days ago · Demo review</p></div></div><ReviewStars rating={review.rating} /></div>
        <p className="font-medium">{review.title}</p><p className="text-sm text-muted-foreground">{review.body}</p><p className="text-xs text-muted-foreground">Product: {review.product}</p>
      </CardContent></Card>) : <EmptyState title="No reviews yet" description="Customer reviews will appear here once a review source is connected." />}
    </div>
    <div><Card className="lg:sticky lg:top-24"><CardHeader><CardTitle>Ratings overview</CardTitle></CardHeader><CardContent className="space-y-5">
      <div className="flex items-center gap-4"><span className="text-4xl font-bold">{reviews.length ? average.toFixed(1) : "—"}</span><div><ReviewStars rating={Math.round(average)} /><p className="text-xs text-muted-foreground">{reviews.length ? `${reviews.length} demo reviews` : "No ratings yet"}</p></div></div>
      <div className="space-y-2">{counts.map(({ stars, count }) => <div key={stars} className="flex items-center gap-2 text-sm"><span className="w-7">{stars} ★</span><div className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-amber-400" style={{ width: `${reviews.length ? (count / reviews.length) * 100 : 0}%` }} /></div><span className="w-6 text-right text-muted-foreground">{count}</span></div>)}</div>
    </CardContent></Card></div>
  </div>
}
