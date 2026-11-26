"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react"

import { ArrowLeft, ImagePlus, Star, Trash2 } from "@gorth/primitive/cores/lucide"
import { Badge } from "@gorth/primitive/custom/badge"
import { Button } from "@gorth/primitive/custom/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@gorth/primitive/default/card"
import { Input } from "@gorth/primitive/default/input"
import { Label } from "@gorth/primitive/default/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@gorth/primitive/default/select"
import { Textarea } from "@gorth/primitive/default/textarea"

import { useMediaBucketQuery, uploadProductImage } from "@/services/media"
import {
  useCreateSellerProductMutation,
  useSellerContextQuery,
  type CreateSellerProductInput,
} from "@/services/seller"

const maximumImages = 24

export function SellerProductForm() {
  const router = useRouter()
  const context = useSellerContextQuery(undefined)
  const buckets = useMediaBucketQuery(undefined)
  const [create] = useCreateSellerProductMutation()
  const [storeId, setStoreId] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [brandId, setBrandId] = useState("none")
  const [warehouseId, setWarehouseId] = useState("none")
  const [kind, setKind] = useState<CreateSellerProductInput["kind"]>("physical")
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState("")
  const [error, setError] = useState("")
  const productId = useRef<string | null>(null)
  const uploaded = useRef(new Map<File, string>())
  const previews = useMemo(
    () => files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [files]
  )

  useEffect(() => () => {
    previews.forEach(({ url }) => URL.revokeObjectURL(url))
  }, [previews])

  const stores = context.data?.stores ?? []
  const selectedStore = stores.find((store) => store.id === storeId) ?? stores[0]
  const warehouses = context.data?.warehouses.filter((item) => item.storeId === selectedStore?.id) ?? []
  const bucket = buckets.data?.find((item) =>
    item.name === "Marketplace Product Images" && item.allowedTypes.includes("image")
  )

  function addFiles(selected: FileList | null) {
    if (!selected?.length) return
    const incoming = Array.from(selected)
    if (files.length + incoming.length > maximumImages) {
      setError(`Choose at most ${maximumImages} images per product.`)
      return
    }
    if (incoming.some((file) => !file.type.startsWith("image/") || file.size === 0)) {
      setError("Choose non-empty image files only.")
      return
    }
    if (bucket?.maxFileSize && incoming.some((file) => file.size > bucket.maxFileSize!)) {
      setError("An image exceeds the selected media bucket size limit.")
      return
    }
    setError("")
    setFiles((current) => [...current, ...incoming])
  }

  function removeFile(file: File) {
    uploaded.current.delete(file)
    setFiles((current) => current.filter((item) => item !== file))
  }

  function makeCover(file: File) {
    setFiles((current) => [file, ...current.filter((item) => item !== file)])
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null
    const status = submitter?.value === "draft" ? "draft" : "active"
    const form = new FormData(event.currentTarget)
    const targetStoreId = storeId || selectedStore?.id
    const targetCategoryId = categoryId || context.data?.categories[0]?.id
    if (!targetStoreId || !targetCategoryId) {
      setError("Choose a store and category before saving.")
      return
    }
    if (status === "active" && files.length === 0) {
      setError("Add at least one image before publishing.")
      return
    }
    if (files.length && !bucket) {
      setError("No image bucket is configured in Media service for this app.")
      return
    }

    productId.current ??= crypto.randomUUID()
    setBusy(true)
    setError("")

    try {
      const images: string[] = []
      if (bucket) {
        for (const [index, file] of files.entries()) {
          setProgress(`Uploading image ${index + 1} of ${files.length}…`)
          let mediaId = uploaded.current.get(file)
          if (!mediaId) {
            mediaId = await uploadProductImage(bucket, file, productId.current)
            uploaded.current.set(file, mediaId)
          }
          images.push(mediaId)
        }
      }
      setProgress("Saving product…")
      const created = await create({
        id: productId.current,
        storeId: targetStoreId,
        warehouseId: kind === "physical" && warehouseId !== "none" ? warehouseId : null,
        categoryId: targetCategoryId,
        brandId: brandId === "none" ? null : brandId,
        title: String(form.get("title") ?? "").trim(),
        description: String(form.get("description") ?? "").trim(),
        kind,
        price: Number(form.get("price")),
        sku: String(form.get("sku") ?? "").trim(),
        stock: kind === "physical" ? Number(form.get("stock")) : 0,
        status,
        images,
      }).unwrap()
      router.push(status === "active" ? `/product/${created.slug}` : "/seller/product")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save product")
    } finally {
      setBusy(false)
      setProgress("")
    }
  }

  if (context.isPending) return <p className="text-sm text-muted-foreground">Loading seller workspace…</p>
  if (context.error) return <p role="alert" className="text-destructive">Could not load your seller workspace.</p>
  if (!stores.length) {
    return (
      <Card>
        <CardHeader><CardTitle>No seller store yet</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Your account needs an active seller with a store before adding products.
        </CardContent>
      </Card>
    )
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Button render={<Link href="/seller/product" />} variant="ghost" size="sm" className="-ml-2 mb-2">
            <ArrowLeft className="size-4" /> My products
          </Button>
          <h1 className="text-3xl font-semibold tracking-tight">Add product</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create a sellable listing for your store.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="submit" value="draft" variant="outline" disabled={busy}>Save draft</Button>
          <Button type="submit" value="active" disabled={busy || !selectedStore || selectedStore.status !== "active"}>
            Publish product
          </Button>
        </div>
      </div>

      {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
      {progress && <p role="status" className="text-sm text-primary">{progress}</p>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Product information</CardTitle><CardDescription>Basic details buyers will see.</CardDescription></CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2"><Label htmlFor="product-title">Product title</Label><Input id="product-title" name="title" required minLength={3} maxLength={220} placeholder="e.g. Everyday cotton T-shirt" /></div>
              <div className="space-y-2"><Label htmlFor="product-description">Description</Label><Textarea id="product-description" name="description" rows={7} maxLength={10000} placeholder="Describe materials, features and care instructions" /></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Product images</CardTitle>
              <CardDescription>Upload up to {maximumImages} images. The first image is the cover.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border-2 border-dashed p-6 text-center" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); addFiles(event.dataTransfer.files) }}>
                <ImagePlus className="mx-auto mb-3 size-8 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm font-medium">Drop images here or choose files</p>
                <p className="mb-4 text-xs text-muted-foreground">{files.length} / {maximumImages} selected</p>
                <Input type="file" accept="image/*" multiple aria-label="Choose product images" className="mx-auto max-w-sm" disabled={busy || files.length >= maximumImages} onChange={(event) => { addFiles(event.target.files); event.target.value = "" }} />
              </div>
              {buckets.isPending && <p className="text-xs text-muted-foreground">Checking Media service buckets…</p>}
              {buckets.error && <p role="alert" className="text-xs text-destructive">Unable to reach Media service. Check your sign-in and the Media service configuration.</p>}
              {!buckets.isPending && !buckets.error && !bucket && <p className="text-xs text-amber-700">Media service has no image bucket for this marketplace client. Drafts without images can still be saved.</p>}
              {previews.length > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {previews.map(({ file, url }, index) => (
                    <div key={url} className="group relative overflow-hidden rounded-lg border bg-muted">
                      {/* Presigned user-selected local preview. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={file.name} className="aspect-square w-full object-cover" />
                      {index === 0 && <Badge className="absolute left-2 top-2">Cover</Badge>}
                      <div className="flex items-center justify-between gap-1 p-2">
                        <span className="min-w-0 truncate text-xs" title={file.name}>{file.name}</span>
                        <div className="flex shrink-0 gap-1">
                          {index > 0 && <Button type="button" variant="ghost" size="icon" className="size-7" aria-label={`Use ${file.name} as cover`} onClick={() => makeCover(file)}><Star className="size-3.5" /></Button>}
                          <Button type="button" variant="ghost" size="icon" className="size-7" aria-label={`Remove ${file.name}`} onClick={() => removeFile(file)}><Trash2 className="size-3.5" /></Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Organize</CardTitle><CardDescription>Place this product in your catalog.</CardDescription></CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2"><Label>Store</Label><Select value={selectedStore?.id ?? ""} onValueChange={(value) => { setStoreId(value ?? ""); setWarehouseId("none") }}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{stores.map((store) => <SelectItem key={store.id} value={store.id}>{store.name} ({store.status})</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Category</Label><Select value={categoryId || context.data?.categories[0]?.id || ""} onValueChange={(value) => setCategoryId(value ?? "")}><SelectTrigger className="w-full"><SelectValue placeholder="Choose category" /></SelectTrigger><SelectContent>{context.data?.categories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Brand</Label><Select value={brandId} onValueChange={(value) => setBrandId(value ?? "none")}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">No brand</SelectItem>{context.data?.brands.map((brand) => <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Product type</Label><Select value={kind} onValueChange={(value) => { setKind(value as CreateSellerProductInput["kind"]); if (value !== "physical") setWarehouseId("none") }}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="physical">Physical</SelectItem><SelectItem value="digital">Digital</SelectItem><SelectItem value="service">Service</SelectItem></SelectContent></Select></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Pricing</CardTitle><CardDescription>Listed in {selectedStore?.currency ?? "your store currency"}.</CardDescription></CardHeader>
            <CardContent className="space-y-2"><Label htmlFor="product-price">Base price</Label><Input id="product-price" name="price" type="number" min="0" max="1000000000" step="0.0001" required placeholder="0.00" /></CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Inventory</CardTitle><CardDescription>One standard variant; configure its SKU and opening stock.</CardDescription></CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2"><Label htmlFor="product-sku">Seller SKU</Label><Input id="product-sku" name="sku" required maxLength={160} placeholder="e.g. TSHIRT-WHITE-M" /></div>
              {kind === "physical" && <>
                <div className="space-y-2"><Label htmlFor="product-stock">Opening stock</Label><Input id="product-stock" name="stock" type="number" min="0" max="1000000" step="1" defaultValue="0" required /></div>
                <div className="space-y-2"><Label>Warehouse</Label><Select value={warehouseId} onValueChange={(value) => setWarehouseId(value ?? "none")}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">No warehouse (stock 0)</SelectItem>{warehouses.map((warehouse) => <SelectItem key={warehouse.id} value={warehouse.id}>{warehouse.name}</SelectItem>)}</SelectContent></Select></div>
              </>}
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  )
}
