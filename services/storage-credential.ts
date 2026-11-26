import "server-only"
import { storageConfiguration } from "@/schemas/storage-credential"
import {
  awsEndpointUrlS3,
  awsAccessKeyId,
  awsSecretAccessKey,
  awsRegion,
  awsBucket,
} from "@/utils/environment"
import { MarketplaceError } from "@/lib/marketplace-error"
export function rawGetStorageCredential(bucketName: string) {
  const p = storageConfiguration.safeParse({
    endpoint: awsEndpointUrlS3,
    accessKeyId: awsAccessKeyId,
    secretAccessKey: awsSecretAccessKey,
    region: awsRegion,
    bucketName: awsBucket,
  })
  if (!p.success) throw new MarketplaceError("storage_unavailable", 503)
  if (p.data.bucketName !== bucketName)
    throw new MarketplaceError("forbidden_storage_bucket", 403)
  return p.data
}
