import type { Context } from "hono"
import { storageCredentialRequest } from "@/schemas/storage-credential"
import { rawGetStorageCredential as getStorageCredentialServices } from "@/services/storage-credential"
import type { ApiEnv } from "@/utils/interface"
export async function actGetStorageCredential(c: Context<ApiEnv>) {
  const p = storageCredentialRequest.parse(await c.req.json())
  c.header("Cache-Control", "private, no-store")
  c.header("Pragma", "no-cache")
  return c.json(getStorageCredentialServices(p.bucketName))
}
