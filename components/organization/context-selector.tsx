"use client"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@gorth-com/primitive/default/select"
import { Spinner } from "@gorth-com/primitive/default/spinner"
import {
  useOrganizationContext,
  useOrganizationMutation,
} from "@/queries/organization"
export function OrganizationContextSelector() {
  const query = useOrganizationContext(),
    mutation = useOrganizationMutation(),
    data = query.data
  const selected = data?.selected,
    org = data?.organizations.find((o) => o.id === selected?.organizationId)
  if (query.isLoading) return <Spinner aria-label="Loading organization" />
  if (query.error)
    return (
      <p role="alert" className="text-sm text-destructive">
        {query.error.message}
      </p>
    )
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        value={selected?.organizationId ?? ""}
        disabled={mutation.isPending}
        onValueChange={(id) =>
          id &&
          mutation.mutate({
            operation: "context",
            body: {
              organizationId: id === "personal" ? null : id,
              teamId: null,
            },
          })
        }
      >
        <SelectTrigger className="w-60">
          <SelectValue placeholder="Personal account" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="personal">Personal account</SelectItem>
          {data?.organizations.map((o) => (
            <SelectItem key={o.id} value={o.id}>
              {o.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {org && (
        <Select
          value={selected?.teamId ?? ""}
          disabled={mutation.isPending}
          onValueChange={(id) =>
            id &&
            mutation.mutate({
              operation: "context",
              body: {
                organizationId: org.id,
                teamId: id === "all" ? null : id,
              },
            })
          }
        >
          <SelectTrigger className="w-56">
            <SelectValue
              placeholder={org.canManage ? "All branches" : "Select branch"}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {org.canManage ? "All branches" : "Organization"}
            </SelectItem>
            {org.teams.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {mutation.isPending && <Spinner aria-label="Saving context" />}
    </div>
  )
}
