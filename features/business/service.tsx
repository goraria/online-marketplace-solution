"use client"
import Link from "next/link"
import { useState, type ComponentProps } from "react"
import { DataTable } from "@gorth-com/primitive/custom/data-table"
import { Button } from "@gorth-com/primitive/custom/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@gorth-com/primitive/default/dialog"
import {
  useBusinessQuery,
  useBusinessMutation,
  type BusinessRow,
} from "@/queries/business"
import { NotificationSettings } from "@/features/business/notification-settings"
const domains = {
  notification: { name: "Notification", url: "/notification" },
  resource: { name: "Saved items", url: "/resource/me/bookmark" },
  discovery: { name: "Discovery", url: "/discovery/search" },
  media: { name: "Media library", url: "/media/asset" },
  payment: { name: "Payment history", url: "/payment" },
  billing: { name: "Invoice", url: "/billing/invoice" },
  insight: { name: "Personal activity", url: "/insight/me/event" },
} as const
export function BusinessServicePanel({ domain }: { domain: string }) {
  if (!Object.hasOwn(domains, domain))
    return <p role="alert">Unknown service.</p>
  return <ServicePanel key={domain} domain={domain as keyof typeof domains} />
}
function ServicePanel({ domain }: { domain: keyof typeof domains }) {
  const definition = domains[domain],
    mutation = useBusinessMutation()
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 }),
    [search, setSearch] = useState(""),
    [command, setCommand] = useState<{
      label: string
      url: string
      method: "POST" | "PATCH" | "DELETE"
    } | null>(null),
    [error, setError] = useState("")
  const result = useBusinessQuery<
    | { data: BusinessRow[]; pagination?: { total?: number }; total?: number }
    | BusinessRow[]
  >(
    definition.url,
    {
      limit: pagination.pageSize,
      offset: pagination.pageIndex * pagination.pageSize,
      ...(domain === "discovery" ? { query: search } : {}),
      ...(domain === "media" ? { owner: "me" } : {}),
    },
    true,
    true
  )
  const raw = result.data,
    rows = Array.isArray(raw) ? raw : (raw?.data ?? [])
  const columns: ComponentProps<typeof DataTable<BusinessRow>>["columns"] = [
    {
      id: "title",
      header: definition.name,
      cell: ({ row }) => {
        const r = row.original,
          resource = r.resource as BusinessRow | undefined
        return (
          <div>
            <div className="font-medium">
              {String(
                r.title ??
                  r.originalFilename ??
                  r.filename ??
                  r.name ??
                  r.referenceId ??
                  resource?.title ??
                  r.action ??
                  r.id ??
                  ""
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              {String(
                r.body ??
                  r.description ??
                  r.resourceType ??
                  resource?.resourceType ??
                  ""
              )}
            </div>
          </div>
        )
      },
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) =>
        String(
          row.original.status ??
            (row.original.readAt
              ? "Read"
              : domain === "notification"
                ? "Unread"
                : "—")
        ),
    },
    {
      id: "time",
      header: "Time",
      cell: ({ row }) => {
        const time = row.original.createdAt ?? row.original.occurredAt
        return time ? new Date(String(time)).toLocaleString() : "—"
      },
    },
    {
      id: "action",
      header: "Action",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-2">
          {domain === "notification" && (
            <>
              <Button
                variant="outline"
                disabled={mutation.isPending}
                onClick={() =>
                  mutation.mutate({
                    url: "/notification/read?id=" + row.original.id,
                    method: "PATCH",
                  })
                }
              >
                Read
              </Button>
              <Button
                variant="outline"
                disabled={mutation.isPending}
                onClick={() =>
                  mutation.mutate({
                    url: "/notification/archive?id=" + row.original.id,
                    method: "PATCH",
                  })
                }
              >
                Archive
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  setCommand({
                    label: "Delete notification",
                    url: "/notification?id=" + row.original.id,
                    method: "DELETE",
                  })
                }
              >
                Delete
              </Button>
            </>
          )}
          {domain === "payment" && (
            <Button
              variant="outline"
              disabled={mutation.isPending}
              onClick={() =>
                mutation.mutate({
                  url: "/payment/" + row.original.id + "/query",
                  method: "POST",
                })
              }
            >
              Refresh status
            </Button>
          )}
          {domain === "media" && (
            <Button
              variant="outline"
              onClick={() =>
                setCommand({
                  label: "Delete media",
                  url: "/media/asset/" + row.original.id,
                  method: "DELETE",
                })
              }
            >
              Delete
            </Button>
          )}
          {domain === "billing" && (
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href="/account/subscription" />}
            >
              Subscription & invoice
            </Button>
          )}
        </div>
      ),
    },
  ]
  return (
    <section className="space-y-6">
      <nav className="flex flex-wrap gap-2">
        {Object.entries(domains).map(([key, value]) => (
          <Button
            key={key}
            variant={domain === key ? "default" : "outline"}
            nativeButton={false}
            render={<Link href={"/seller/service/" + key} />}
          >
            {value.name}
          </Button>
        ))}
      </nav>
      {result.error && (
        <p role="alert" className="text-destructive">
          {result.error.message}
        </p>
      )}
      <DataTable
        nav={{ name: definition.name }}
        columns={columns}
        data={rows}
        rowCount={
          Array.isArray(raw)
            ? raw.length
            : (raw?.pagination?.total ?? raw?.total ?? rows.length)
        }
        pagination={pagination}
        onPaginationChange={setPagination}
        enableRowSelection={false}
        loading={result.isFetching}
        search={
          domain === "discovery"
            ? {
                value: search,
                onValueChange: (value) => {
                  setSearch(value)
                  setPagination((p) => ({ ...p, pageIndex: 0 }))
                },
                placeholder: "Search…",
              }
            : undefined
        }
        onReload={() => void result.refetch()}
      />
      {domain === "notification" && <NotificationSettings />}
      <Dialog
        open={!!command}
        onOpenChange={(open) => {
          if (!open && !mutation.isPending) {
            setCommand(null)
            setError("")
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{command?.label}</DialogTitle>
            <DialogDescription>
              Confirm this action. The owning service checks your access before
              making changes.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p role="alert" className="text-destructive">
              {error}
            </p>
          )}
          <Button
            disabled={mutation.isPending}
            onClick={async () => {
              if (!command) return
              try {
                await mutation.mutateAsync(command)
                setCommand(null)
              } catch (e) {
                setError(e instanceof Error ? e.message : "Request failed")
              }
            }}
          >
            Confirm
          </Button>
        </DialogContent>
      </Dialog>
    </section>
  )
}
