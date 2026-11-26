"use client"
import { useState } from "react"
import { Button } from "@gorth-com/primitive/custom/button"
import { Checkbox } from "@gorth-com/primitive/default/checkbox"
import { Input } from "@gorth-com/primitive/default/input"
import { Label } from "@gorth-com/primitive/default/label"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@gorth-com/primitive/default/select"
import { useBusinessQuery } from "@/queries/business"
import { uploadProductImage, type MediaBucket } from "@/queries/media"
export function ProductMediaPicker({
  productId,
  value,
  onChange,
  onBusyChange,
}: {
  productId?: string
  value: string[]
  onChange: (ids: string[]) => void
  onBusyChange: (busy: boolean) => void
}) {
  const [bucket, setBucket] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("")
  const buckets = useBusinessQuery<MediaBucket[]>(
    "/media/bucket",
    {},
    !!productId
  )
  const assets = useBusinessQuery<
    Array<{ id: string; filename?: string; originalFilename?: string }>
  >(
    "/media/asset",
    {
      owner: "me",
      type: "image",
      status: "ready",
      visibility: "public",
      resourceType: "marketplace-product",
      resourceId: productId,
      limit: 24,
    },
    !!productId
  )
  if (!productId)
    return (
      <p className="text-sm text-muted-foreground sm:col-span-2">
        Save the draft, then edit it to upload product images.
      </p>
    )
  const selectedBucket = buckets.data?.find((b) => b.id === bucket)
  return (
    <fieldset className="space-y-3 sm:col-span-2">
      <legend className="mb-2 font-medium">Product images</legend>
      <Select value={bucket} onValueChange={(id) => setBucket(id ?? "")}>
        <SelectTrigger>
          <SelectValue placeholder="Choose image storage" />
        </SelectTrigger>
        <SelectContent>
          {buckets.data?.map((b) => (
            <SelectItem key={b.id} value={b.id}>
              {b.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        aria-label="Upload product images"
        type="file"
        accept="image/*"
        multiple
        disabled={!selectedBucket || busy || value.length >= 24}
        onChange={async (e) => {
          const files = Array.from(e.target.files ?? [])
          e.target.value = ""
          if (!selectedBucket || !files.length) return
          setBusy(true)
          onBusyChange(true)
          setError("")
          const saved = [...value]
          try {
            for (const file of files) {
              if (saved.length >= 24) throw Error("Maximum 24 images")
              saved.push(
                await uploadProductImage(selectedBucket, file, productId)
              )
              onChange([...saved])
            }
            await assets.refetch()
          } catch (error) {
            setError(
              error instanceof Error ? error.message : "Image upload failed"
            )
          } finally {
            setBusy(false)
            onBusyChange(false)
          }
        }}
      />
      {busy && <p role="status">Uploading images…</p>}
      {(error || buckets.error || assets.error) && (
        <p role="alert" className="text-destructive">
          {error || buckets.error?.message || assets.error?.message}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[...new Set([...value, ...(assets.data ?? []).map((a) => a.id)])].map(
          (id, index) => (
            <div key={id} className="space-y-2 rounded-md border p-2">
              {/* Public image URLs stay same-origin; credentials remain server-only. */}
              <img
                src={"/external/media/public/" + encodeURIComponent(id)}
                alt={"Product image " + (index + 1)}
                className="aspect-square w-full rounded-md object-cover"
              />
              <Label className="flex items-center gap-2">
                <Checkbox
                  checked={value.includes(id)}
                  disabled={busy}
                  onCheckedChange={(checked) =>
                    onChange(
                      checked ? [...value, id] : value.filter((v) => v !== id)
                    )
                  }
                />
                Use image
              </Label>
              {value.includes(id) && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy || value[0] === id}
                  onClick={() =>
                    onChange([id, ...value.filter((v) => v !== id)])
                  }
                >
                  Cover
                </Button>
              )}
            </div>
          )
        )}
      </div>
    </fieldset>
  )
}
