"use client"

import Link from "next/link"
import { useDeferredValue, useState } from "react"

import { FolderTree } from "@gorth-com/primitive/cores/lucide"
import { Badge } from "@gorth-com/primitive/custom/badge"
import { Button } from "@gorth-com/primitive/custom/button"
import { DataTable } from "@gorth-com/primitive/custom/data-table"
import type { ComponentProps } from "react"

import type { AdminResource } from "@/lib/marketplace/admin"
import { type AdminRow, useAdminListQuery } from "@/queries/admin"

const labels: Record<AdminResource, string> = {
  category: "Category",
  product: "Product",
  attribute: "Attribute",
  store: "Store",
  seller: "Seller",
  variant: "Variant",
  order: "Order",
  customer: "Customer",
  warehouse: "Warehouse",
  inventory: "Inventory",
  fulfillment: "Fulfillment",
  return: "Return",
}

const itemLabels: Record<AdminResource, string> = {
  category: "Products",
  product: "Variants",
  attribute: "Choices",
  store: "Products",
  seller: "Stores",
  variant: "Available",
  order: "Items",
  customer: "Orders",
  warehouse: "Items",
  inventory: "Available",
  fulfillment: "Items",
  return: "Items",
}

function columnsFor(
  resource: AdminResource
): ComponentProps<typeof DataTable<AdminRow>>["columns"] {
  return [
    {
      accessorKey: "name",
      header: labels[resource],
      size: 300,
      cell: ({ row }) => (
        <div className="flex min-w-0 items-center gap-3 py-1">
          {resource === "category" && (
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FolderTree className="size-5" aria-hidden="true" />
            </span>
          )}
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate font-medium">{row.original.name}</span>
            <span className="truncate text-xs text-muted-foreground">
              {row.original.slug}
            </span>
          </span>
        </div>
      ),
    },
    {
      accessorKey: "itemCount",
      header: itemLabels[resource],
      size: 125,
      cell: ({ row }) => row.original.itemCount.toLocaleString(),
    },
    {
      accessorKey: "status",
      header: "Status",
      size: 125,
      cell: ({ row }) => (
        <Badge variant="outline" className="capitalize">
          {row.original.status.replaceAll("_", " ")}
        </Badge>
      ),
    },
    {
      accessorKey: "detail",
      header:
        resource === "store"
          ? "Seller"
          : resource === "order"
            ? "Buyer"
            : "Details",
      size: 190,
      cell: ({ row }) => (
        <span className="block truncate text-muted-foreground">
          {row.original.detail || "—"}
        </span>
      ),
    },
    ...(resource === "variant" || resource === "order" || resource === "product"
      ? [
          {
            accessorKey: "price",
            header: "Price",
            size: 130,
            cell: ({ row }: { row: { original: AdminRow } }) =>
              row.original.price == null
                ? "—"
                : new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: row.original.currency ?? "USD",
                  }).format(row.original.price),
          },
        ]
      : []),
    {
      accessorKey: "createdAt",
      header: "Created",
      size: 130,
      cell: ({ row }) =>
        row.original.createdAt
          ? new Date(row.original.createdAt).toLocaleDateString()
          : "—",
    },
    ...(resource === "category" ||
    resource === "product" ||
    resource === "store"
      ? [
          {
            id: "actions",
            header: "Actions",
            size: 110,
            cell: ({ row }: { row: { original: AdminRow } }) => (
              <Button
                nativeButton={false}
                render={<Link href={`/${resource}/${row.original.slug}`} />}
                variant="outline"
                size="sm"
              >
                View
              </Button>
            ),
          },
        ]
      : []),
  ]
}

export function AdminResourceTable({ resource }: { resource: AdminResource }) {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const [search, setSearch] = useState("")
  const query = useDeferredValue(search.trim())
  const result = useAdminListQuery({
    resource,
    limit: pagination.pageSize,
    offset: pagination.pageIndex * pagination.pageSize,
    query,
  })

  return (
    <section className="flex min-w-0 flex-col gap-6">
      <div>
        <p className="text-sm text-muted-foreground">Marketplace / Admin</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          {labels[resource]}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {resource === "category"
            ? "Browse catalog categories and their actual product counts."
            : `Browse and search marketplace ${labels[resource].toLowerCase()} records.`}
        </p>
      </div>
      {result.error && (
        <p role="alert" className="text-sm text-destructive">
          Unable to load {labels[resource].toLowerCase()} data. Please retry.
        </p>
      )}
      <DataTable
        columns={columnsFor(resource)}
        data={result.data?.data ?? []}
        rowCount={result.data?.pagination.total ?? 0}
        pagination={pagination}
        onPaginationChange={setPagination}
        search={{
          placeholder: `Search ${labels[resource].toLowerCase()}...`,
          value: search,
          onValueChange: setSearch,
        }}
        loading={result.isPending || result.isFetching}
        onReload={() => void result.refetch()}
        fluidColumn="name"
        enableRowSelection={false}
        emptyMessage={`No ${labels[resource].toLowerCase()} records found.`}
      />
    </section>
  )
}
