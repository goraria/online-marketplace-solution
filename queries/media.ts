"use client"
import { createAccountQueryService } from "@/utils/account-query"


import { caller, defineQuery } from "@/utils/caller"

export interface MediaBucket {
  id: string
  name: string
  allowedTypes: string[]
  maxFileSize: number | null
}

interface MediaAsset {
  id: string
  status: string
  type: string
  visibility: string
}

interface MediaUploadResponse {
  asset: MediaAsset
  upload: {
    id: string
    method: "PUT" | "MULTIPART"
    url: string | null
    headers: Record<string, string>
  }
}

export const useMediaBucketQuery = createAccountQueryService(
  defineQuery<MediaBucket[], undefined>({
    queryKey: ["media", "bucket"],
    query: { url: "/external/media/bucket", method: "GET" },
    queryOptions: { staleTime: 60_000, retry: false },
  })
)

export async function uploadProductImage(
  bucket: MediaBucket,
  file: File,
  productId: string
) {
  if (!file.type.startsWith("image/"))
    throw new Error("Only images are supported")
  if (!file.size || (bucket.maxFileSize && file.size > bucket.maxFileSize)) {
    throw new Error("Image exceeds the media bucket size limit")
  }

  const initialized = await caller<MediaUploadResponse>({
    url: "/external/media/upload",
    method: "POST",
    body: {
      bucket: bucket.id,
      filename: file.name,
      contentType: file.type,
      size: file.size,
      type: "image",
      visibility: "public",
      resourceType: "marketplace-product",
      resourceId: productId,
      multipart: false,
    },
  })

  try {
    if (initialized.upload.method !== "PUT" || !initialized.upload.url) {
      throw new Error("Media service did not return an upload URL")
    }
    const uploaded = await fetch(initialized.upload.url, {
      method: "PUT",
      body: file,
      headers: initialized.upload.headers,
      credentials: "omit",
    })
    if (!uploaded.ok)
      throw new Error(`Image upload failed (${uploaded.status})`)

    const asset = await caller<MediaAsset>({
      url: `/external/media/upload/${initialized.upload.id}/complete`,
      method: "POST",
      body: {},
    })
    if (asset.status !== "ready") throw new Error("Media asset is not ready")
    return asset.id
  } catch (error) {
    try {
      await caller({
        url: `/external/media/upload/${initialized.upload.id}`,
        method: "DELETE",
      })
    } catch {
      // Cleanup failure must not replace the original upload error.
    }
    throw error
  }
}
