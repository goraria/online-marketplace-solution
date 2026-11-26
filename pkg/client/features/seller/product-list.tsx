"use client"

import Link from "next/link"
import { useDeferredValue, useState } from "react"

import { Plus } from "@gorth/primitive/cores/lucide"
import { Badge } from "@gorth/primitive/custom/badge"
import { Button } from "@gorth/primitive/custom/button"
import { DataTable } from "@gorth/primitive/custom/data-table"
import type { DataTableProps } from "@gorth/primitive/utils/interface"

import { formatPrice } from "@/utils/marketplace"
import {
  useSellerContextQuery,
  useSellerProductQuery,
  type SellerProduct,
} from "@/services/seller"

const columns: DataTableProps<SellerProduct>["columns"] = [
  {
    accessorKey: "title",
    header: "Product",
    size: 300,
    cell: ({ row }) => (
      <div className="flex min-w-0 flex-col">
        <span className="truncate font-medium">{row.original.title}</span>
        <span className="truncate text-xs text-muted-foreground">{row.original.slug}</span>
      </div>
    ),
  },
  { accessorKey: "storeName", header: "Store", size: 170 },
  {
    accessorKey: "price",
    header: "Price",
    size: 150,
    cell: ({ row }) => formatPrice(row.original.price, row.original.currency),
  },
  {
    accessorKey: "status",
    header: "Status",
    size: 110,
    cell: ({ row }) => <Badge variant="outline" className="capitalize">{row.original.status}</Badge>,
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    size: 120,
    cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
  },
  {
    id: "actions",
    header: "Actions",
    size: 95,
    cell: ({ row }) => row.original.status === "active"
      ? <Button render={<Link href={`/product/${row.original.slug}`} />} size="sm" variant="outline">View</Button>
      : <span className="text-xs text-muted-foreground">Draft</span>,
  },
]

export function SellerProductList() {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const [search, setSearch] = useState("")
  const query = useDeferredValue(search.trim())
  const context = useSellerContextQuery(undefined)
  const products = useSellerProductQuery({
    limit: pagination.pageSize,
    offset: pagination.pageIndex * pagination.pageSize,
    query,
  })

  return (
    <section className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Seller center / Catalog</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">My products</h1>
        </div>
        <Button render={<Link href="/seller/product/create" />} disabled={!context.data?.stores.length}>
          <Plus className="size-4" /> Add product
        </Button>
      </div>
      {!context.isPending && !context.data?.stores.length && (
        <p className="rounded-lg border p-4 text-sm text-muted-foreground">
          No active seller store is linked to your account. A seller store is required before adding products.
        </p>
      )}
      {products.error && (
        <p role="alert" className="text-sm text-destructive">Unable to load seller products.</p>
      )}
      <DataTable
        columns={columns}
        data={products.data?.data ?? []}
        rowCount={products.data?.pagination.total ?? 0}
        pagination={pagination}
        onPaginationChange={setPagination}
        search={{ placeholder: "Search my products…", value: search, onValueChange: setSearch }}
        loading={products.isPending || products.isFetching}
        onReload={() => void products.refetch()}
        fluidColumn="title"
        enableRowSelection={false}
        emptyMessage="No products yet. Add your first product to get started."
      />
    </section>
  )
}
