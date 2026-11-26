import { z } from "@gorth-com/structure/cores/zod"
export const selectedOrganizationInput = z
  .object({ organizationId: z.uuid().nullable(), teamId: z.uuid().nullable() })
  .strict()
  .refine((p) => !p.teamId || !!p.organizationId, {
    message: "team_requires_organization",
  })
export const commerceAuthorizationInput = z.object({
  subject: z.string(),
  audience: z.url(),
  authorization_details: z
    .array(
      z.object({
        type: z.literal("commerce"),
        locations: z.array(z.url()),
        organization_id: z.uuid(),
        team_id: z.uuid().optional(),
        actions: z.array(z.string()).max(20),
      })
    )
    .max(2000),
})
export interface OrganizationContext {
  selected: { organizationId: string | null; teamId: string | null }
  organizations: Array<{
    id: string
    name: string
    slug: string
    canManage: boolean
    teams: Array<{ id: string; name: string; actions: string[] }>
  }>
}
