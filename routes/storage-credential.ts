import { Hono } from "hono"
import { bodyLimit } from "hono/body-limit"
import { requireMediaStorageReader } from "@/middlewares/storage-credential"
import { actGetStorageCredential } from "@/controllers/storage-credential"
export const storageCredentialRoutes = new Hono()
storageCredentialRoutes.post(
  "/credential",
  bodyLimit({ maxSize: 1024 }),
  requireMediaStorageReader(),
  actGetStorageCredential
)
