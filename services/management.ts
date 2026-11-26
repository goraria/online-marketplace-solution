import "server-only"
import { rawCommerceRequest } from "@/services/commerce-client"
import { adminListQuerySchema, adminResourceSchema } from "@/schemas/admin"
import type { StudioRow, CommercePage } from "@/utils/commerce-types"
export type AdminListRow = StudioRow
export async function rawListResourceManagement(
  resource: unknown,
  query: unknown,
  token: string
) {
  const r = adminResourceSchema.parse(resource),
    q = adminListQuerySchema.parse(query)
  return rawCommerceRequest<CommercePage<StudioRow>>("/studio/" + r, {
    token,
    query: { limit: q.limit, offset: q.offset, q: q.query },
    raw: true,
  })
}
