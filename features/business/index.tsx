"use client"
import { useRef, useState, type ComponentProps } from "react"
import Link from "next/link"
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
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@gorth-com/primitive/default/card"
import { BusinessRecordForm } from "@/components/business/record-form"
import { OrganizationContextSelector } from "@/components/organization/context-selector"
import {
  useBusinessContext,
  useBusinessQuery,
  useBusinessMutation,
  type BusinessRow,
} from "@/queries/business"
import {
  businessEntities,
  businessListPath,
  camelBusinessRow,
} from "@/features/business/entity"
import { OrderOperations } from "@/features/business/order-operations"
export function BusinessWorkspace({ resource }: { resource: string }) {
  const e = businessEntities[resource]
  if (!e) return <p role="alert">Unknown business module.</p>
  return <BusinessModule key={resource} resource={resource} />
}
function BusinessModule({ resource }: { resource: string }) {
  const e = businessEntities[resource],
    ctx = useBusinessContext(),
    mutation = useBusinessMutation()
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 }),
    [search, setSearch] = useState(""),
    [record, setRecord] = useState<BusinessRow | null>(null),
    [mode, setMode] = useState<"show" | "edit" | "create" | null>(null),
    [command, setCommand] = useState<{
      label: string
      url: string
      method: "POST" | "PUT" | "PATCH"
      body: BusinessRow
    } | null>(null),
    [error, setError] = useState("")
  const retry = useRef<{ fingerprint: string; key: string } | null>(null)
  const merchant = ctx.merchantId,
    base = "/commerce/merchant/" + merchant
  const branchBound = [
    "warehouse",
    "inventory",
    "movement",
    "transfer",
    "purchase",
    "order",
    "return",
    "fulfillment",
    "customer",
  ].includes(resource)
  const enabled =
    (!branchBound || !ctx.team || !!ctx.storeId) &&
    !!ctx.org &&
    (resource === "merchant" || !!merchant)
  const query = useBusinessQuery<
    | BusinessRow[]
    | {
        data: BusinessRow[]
        total?: number
        pagination?: { total?: number; hasMore?: boolean }
      }
  >(
    businessListPath(resource, merchant),
    {
      ...(resource !== "merchant"
        ? {
            limit: pagination.pageSize,
            offset: pagination.pageIndex * pagination.pageSize,
            q: search,
          }
        : { organizationId: ctx.org?.id }),
      ...(["order", "customer", "fulfillment", "return"].includes(resource)
        ? { merchantId: merchant }
        : {}),
      ...(branchBound && ctx.storeId ? { storeId: ctx.storeId } : {}),
      ...(resource === "store" && ctx.team ? { teamId: ctx.team.id } : {}),
    },
    enabled,
    true
  )
  const raw = query.data,
    values = Array.isArray(raw) ? raw : (raw?.data ?? [])
  let rows = values.map(camelBusinessRow)
  if (resource === "merchant")
    rows = rows.filter((r) => r.ssoOrganizationId === ctx.org?.id)
  if (resource === "store" && ctx.team)
    rows = rows.filter((r) => r.ssoTeamId === ctx.team!.id)
  const array = Array.isArray(raw)
  const total = array
    ? rows.length
    : (raw?.total ??
      raw?.pagination?.total ??
      pagination.pageIndex * pagination.pageSize +
        rows.length +
        (raw?.pagination?.hasMore ? 1 : 0))
  const pageRows = array
    ? rows.slice(
        pagination.pageIndex * pagination.pageSize,
        (pagination.pageIndex + 1) * pagination.pageSize
      )
    : rows
  const canManage = ctx.org?.canManage || ctx.team?.actions.includes("manage")
  const capability = [
    "inventory",
    "movement",
    "transfer",
    "warehouse",
    "supplier",
    "purchase",
  ].includes(resource)
    ? "inventory:write"
    : ["tax", "promotion"].includes(resource)
      ? "finance:write"
      : "catalog:write"
  const organizationWide = [
    "merchant",
    "category",
    "attribute",
    "product",
    "variant",
    "tax",
    "promotion",
    "supplier",
  ].includes(resource)
  const canWrite =
    !!ctx.org?.canManage ||
    (!organizationWide &&
      (!!canManage || !!ctx.team?.actions.includes(capability)))
  const canCreate =
    !!e.create &&
    !!ctx.org &&
    (["merchant", "store"].includes(resource)
      ? !!ctx.org.canManage &&
        (resource === "merchant"
          ? !ctx.merchant
          : !!ctx.team && !rows.some((r) => r.ssoTeamId === ctx.team!.id))
      : !!merchant && canWrite && (!branchBound || !ctx.team || !!ctx.storeId))
  const fields = mode === "edit" ? (e.editFields ?? e.fields) : e.fields
  const columns: ComponentProps<typeof DataTable<BusinessRow>>["columns"] = [
    {
      id: "name",
      header: e.title,
      cell: ({ row }) => (
        <div>
          <div className="font-medium">
            {String(
              row.original.title ??
                row.original.name ??
                row.original.sku ??
                row.original.variantId ??
                row.original.id ??
                "—"
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {String(
              row.original.code ?? row.original.slug ?? row.original.id ?? ""
            )}
          </div>
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) =>
        String(
          row.original.status ??
            (row.original.active === undefined
              ? "—"
              : row.original.active
                ? "Active"
                : "Inactive")
        ),
    },
    {
      id: "quantity",
      header: "Amount / available",
      cell: ({ row }) =>
        String(
          row.original.priceMinor ??
            row.original.totalMinor ??
            row.original.onHand ??
            row.original.quantity ??
            row.original.itemCount ??
            "—"
        ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setRecord(row.original)
              setMode("show")
            }}
          >
            Show
          </Button>
          {canWrite &&
            (e.editMethod || ["merchant", "store"].includes(resource)) && (
              <Button
                variant="outline"
                onClick={() => {
                  setRecord(row.original)
                  setMode("edit")
                }}
              >
                Edit
              </Button>
            )}
          {canWrite && e.state && (
            <Button
              variant="outline"
              onClick={() =>
                setCommand({
                  label: row.original.active
                    ? "Deactivate record"
                    : "Activate record",
                  url: base + "/" + resource + "/" + row.original.id + "/state",
                  method: "PATCH",
                  body: { active: !row.original.active },
                })
              }
            >
              {row.original.active ? "Deactivate" : "Activate"}
            </Button>
          )}
          {canWrite &&
            resource === "purchase" &&
            ["draft", "sent"].includes(String(row.original.status)) && (
              <>
                {(row.original.status === "draft"
                  ? ["sent", "cancelled"]
                  : ["received", "cancelled"]
                ).map((status) => (
                  <Button
                    key={status}
                    variant="outline"
                    onClick={() =>
                      setCommand({
                        label: "Mark purchase " + status,
                        url: base + "/purchase/" + row.original.id,
                        method: "PATCH",
                        body: { version: row.original.version, status },
                      })
                    }
                  >
                    {status}
                  </Button>
                ))}
              </>
            )}
        </div>
      ),
    },
  ]
  async function save(value: BusinessRow) {
    const body = { ...value }
    let url = base + "/" + (e.resource ?? resource),
      method: "POST" | "PUT" | "PATCH" = "POST"
    if (mode === "edit") {
      url += "/" + record!.id
      method = e.editMethod ?? "PUT"
      if (record?.version) body.version = record.version
    }
    if (resource === "merchant") {
      url = mode === "edit" ? base : "/commerce/merchant"
      body.ssoOrganizationId = ctx.org!.id
    }
    if (resource === "store")
      body.ssoTeamId = mode === "edit" ? record!.ssoTeamId : ctx.team!.id
    if (e.idempotent && mode !== "edit") {
      const fingerprint = JSON.stringify({ resource, merchant, body })
      if (retry.current?.fingerprint !== fingerprint)
        retry.current = { fingerprint, key: crypto.randomUUID() }
      body.idempotencyKey = retry.current!.key
    }
    await mutation.mutateAsync({ url, method, body })
    setMode(null)
    setRecord(null)
    retry.current = null
  }
  const root = "/seller/workspace"
  return (
    <section className="space-y-6">
      <OrganizationContextSelector />
      <nav className="flex flex-wrap gap-2">
        {Object.entries(businessEntities).map(([key, value]) => (
          <Button
            key={key}
            variant={key === resource ? "default" : "outline"}
            nativeButton={false}
            render={<Link href={root + "/" + key} />}
          >
            {value.title}
          </Button>
        ))}
      </nav>
      {(ctx.error || query.error) && (
        <p role="alert" className="text-destructive">
          {(ctx.error ?? query.error)?.message}
        </p>
      )}
      {!ctx.org ? (
        <Card>
          <CardHeader>
            <CardTitle>Select an organization</CardTitle>
            <CardDescription>
              Create or join an organization in Organization & branch first.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : !merchant && resource !== "merchant" ? (
        <Card>
          <CardHeader>
            <CardTitle>Create the business profile first</CardTitle>
            <CardDescription>
              The profile links this SSO organization to Commerce without
              duplicating membership.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              nativeButton={false}
              render={<Link href={root + "/merchant"} />}
            >
              Business profile
            </Button>
          </CardContent>
        </Card>
      ) : (
        <DataTable
          nav={{
            name: e.title,
            description:
              ctx.org.name +
              (ctx.team ? " / " + ctx.team.name : " / all permitted branches"),
          }}
          columns={columns}
          data={pageRows}
          rowCount={total}
          pagination={pagination}
          onPaginationChange={setPagination}
          search={
            resource !== "merchant"
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
          onCreate={
            canCreate
              ? () => {
                  setRecord(null)
                  setMode("create")
                }
              : undefined
          }
          onReload={() => void query.refetch()}
          loading={query.isFetching || ctx.loading}
          enableRowSelection={false}
        />
      )}
      {resource === "store" && ctx.org && !ctx.team && (
        <p className="text-sm text-muted-foreground">
          Select a team above before linking a new branch.
        </p>
      )}
      <Dialog
        open={!!mode}
        onOpenChange={(open) => {
          if (!open && !mutation.isPending) {
            setMode(null)
            setRecord(null)
          }
        }}
      >
        <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {mode === "create" ? "Create " : mode === "edit" ? "Edit " : ""}
              {e.title}
            </DialogTitle>
            <DialogDescription>
              {mode === "show"
                ? "Current record from Commerce."
                : "Server permissions, stock and version checks apply to every operation."}
            </DialogDescription>
          </DialogHeader>
          {mode === "show" ? (
            resource === "order" ? (
              <OrderOperations id={String(record?.id)} />
            ) : (
              <dl className="space-y-3">
                {Object.entries(record ?? {}).map(([key, value]) => (
                  <div
                    key={key}
                    className="grid gap-1 border-b pb-2 sm:grid-cols-3"
                  >
                    <dt>{key.replace(/([A-Z])/g, " $1")}</dt>
                    <dd className="break-words sm:col-span-2">
                      {Array.isArray(value)
                        ? value
                            .map((v) =>
                              typeof v === "object"
                                ? Object.values(v ?? {}).join(" · ")
                                : String(v)
                            )
                            .join(", ")
                        : value && typeof value === "object"
                          ? Object.values(value).join(" · ")
                          : String(value ?? "—")}
                    </dd>
                  </div>
                ))}
              </dl>
            )
          ) : (
            <BusinessRecordForm
              key={mode + String(record?.id)}
              fields={fields}
              initial={
                record ?? {
                  ...(resource === "store"
                    ? { name: ctx.team?.name, businessKind: "retail" }
                    : { name: ctx.org?.name }),
                }
              }
              pending={mutation.isPending}
              onSubmit={save}
            />
          )}
        </DialogContent>
      </Dialog>
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
              Confirm this change. Stock receipt and state transitions are
              checked atomically by Commerce.
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
      {canManage && (
        <p className="text-xs text-muted-foreground">
          Permissions come from your live SSO organization/team role.
        </p>
      )}
    </section>
  )
}
