import { z } from "@gorth-com/structure/cores/zod"
export const storageCredentialRequest = z
  .object({
    bucketName: z.string().regex(/^[a-z0-9][a-z0-9.-]{1,253}[a-z0-9]$/),
  })
  .strict()
export const storageConfiguration = z
  .object({
    endpoint: z.url().refine((raw) => {
      const u = new URL(raw)
      return (
        u.protocol === "https:" &&
        !u.username &&
        !u.password &&
        !u.search &&
        !u.hash &&
        u.pathname === "/"
      )
    }),
    accessKeyId: z.string().min(1).max(4096),
    secretAccessKey: z.string().min(1).max(4096),
    region: z.string().min(1).max(100),
    bucketName: z.string().min(3).max(255),
  })
  .strict()
