"use client"
import { ProductMediaPicker } from "@/components/business/product-media"
import { useId, useState, type FormEvent } from "react"
import { Button } from "@gorth-com/primitive/custom/button"
import { Input } from "@gorth-com/primitive/default/input"
import { Textarea } from "@gorth-com/primitive/default/textarea"
import { Checkbox } from "@gorth-com/primitive/default/checkbox"
import { Label } from "@gorth-com/primitive/default/label"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@gorth-com/primitive/default/select"
import {
  useBusinessContext,
  useBusinessQuery,
  type BusinessRow,
} from "@/queries/business"
import {
  businessListPath,
  type BusinessField,
} from "@/features/business/entity"
export function initialBusinessRecord(
  fields: BusinessField[],
  row: BusinessRow = {}
): BusinessRow {
  return Object.fromEntries(
    fields.map((f) => {
      let value =
        row[f.name] ??
        f.initial ??
        (f.kind === "array" || f.kind === "list" || f.kind === "media"
          ? []
          : f.kind === "object"
            ? {}
            : f.nullable
              ? null
              : f.kind === "boolean"
                ? false
                : "")
      if (f.kind === "number" && value !== null && value !== "")
        value = Number(value)
      if (f.kind === "object")
        value = initialBusinessRecord(f.fields ?? [], value as BusinessRow)
      if (f.kind === "array")
        value = (value as BusinessRow[]).map((v) =>
          initialBusinessRecord(f.fields ?? [], v)
        )
      return [f.name, value]
    })
  )
}
export function BusinessRecordForm({
  fields,
  initial = {},
  pending,
  onSubmit,
}: {
  fields: BusinessField[]
  initial?: BusinessRow
  pending: boolean
  onSubmit: (values: BusinessRow) => Promise<void>
}) {
  const [value, setValue] = useState(() =>
      initialBusinessRecord(fields, initial)
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false)
  async function submit(e: FormEvent) {
    e.preventDefault()
    setError("")
    try {
      await onSubmit(value)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed")
    }
  }
  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((field) => (
          <BusinessRecordField
            key={field.name}
            field={field}
            value={value[field.name]}
            productId={initial.id ? String(initial.id) : undefined}
            onBusyChange={setBusy}
            onChange={(next) => setValue((v) => ({ ...v, [field.name]: next }))}
          />
        ))}
      </div>
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      <Button disabled={pending || busy} type="submit">
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  )
}
function BusinessRecordField({
  field: f,
  value,
  onChange,
  productId,
  onBusyChange,
}: {
  field: BusinessField
  value: unknown
  onChange: (v: unknown) => void
  productId?: string
  onBusyChange?: (busy: boolean) => void
}) {
  const id = useId(),
    context = useBusinessContext(),
    [search, setSearch] = useState(""),
    [page, setPage] = useState(0)
  const result = useBusinessQuery<
    BusinessRow[] | { data: BusinessRow[]; total?: number }
  >(
    f.reference
      ? businessListPath(f.reference, context.merchantId)
      : "/commerce/merchant",
    { limit: 20, offset: page * 20, q: search },
    !!f.reference && !!context.merchantId,
    true
  )
  const rows = Array.isArray(result.data)
    ? result.data
    : (result.data?.data ?? [])
  if (f.kind === "media")
    return (
      <ProductMediaPicker
        productId={productId}
        value={Array.isArray(value) ? (value as string[]) : []}
        onChange={onChange}
        onBusyChange={onBusyChange ?? (() => {})}
      />
    )
  if (f.kind === "object") {
    const record = (value as BusinessRow) ?? {}
    return (
      <fieldset className="grid gap-4 rounded-lg border p-4 sm:col-span-2">
        <legend>{f.label}</legend>
        {f.fields?.map((child) => (
          <BusinessRecordField
            key={child.name}
            field={child}
            value={record[child.name]}
            onChange={(v) => onChange({ ...record, [child.name]: v })}
          />
        ))}
      </fieldset>
    )
  }
  if (f.kind === "array") {
    const records = Array.isArray(value) ? (value as BusinessRow[]) : []
    return (
      <fieldset className="space-y-3 rounded-lg border p-4 sm:col-span-2">
        <legend>{f.label}</legend>
        {records.map((record, index) => (
          <div
            key={index}
            className="grid gap-3 rounded-md border p-3 sm:grid-cols-2"
          >
            {f.fields?.map((child) => (
              <BusinessRecordField
                key={child.name}
                field={child}
                value={record[child.name]}
                onChange={(v) =>
                  onChange(
                    records.map((r, i) =>
                      i === index ? { ...r, [child.name]: v } : r
                    )
                  )
                }
              />
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() => onChange(records.filter((_, i) => i !== index))}
            >
              Remove row
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            onChange([...records, initialBusinessRecord(f.fields ?? [])])
          }
        >
          Add row
        </Button>
      </fieldset>
    )
  }
  if (f.kind === "boolean")
    return (
      <Label className="flex items-center gap-2">
        <Checkbox
          checked={value === true}
          onCheckedChange={(v) => onChange(v === true)}
        />
        {f.label}
      </Label>
    )
  if (f.kind === "reference" || f.kind === "choice")
    return (
      <div className="space-y-2">
        <Label htmlFor={id}>{f.label}</Label>
        {f.reference && (
          <Input
            aria-label={"Search " + f.label}
            placeholder="Search…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(0)
            }}
          />
        )}
        <Select
          value={String(value ?? "")}
          onValueChange={(v) => onChange(v === "none" ? null : v)}
        >
          <SelectTrigger id={id}>
            <SelectValue placeholder={"Choose " + f.label.toLowerCase()} />
          </SelectTrigger>
          <SelectContent>
            {f.nullable && <SelectItem value="none">None</SelectItem>}
            {f.options?.map((v) => (
              <SelectItem key={v} value={v}>
                {v}
              </SelectItem>
            ))}
            {rows.map((r) => (
              <SelectItem key={String(r.id)} value={String(r.id)}>
                {String(r.title ?? r.name ?? r.sku ?? r.id)}
              </SelectItem>
            ))}
            {!!f.reference && !!value && !rows.some((r) => r.id === value) && (
              <SelectItem value={String(value)}>{String(value)}</SelectItem>
            )}
          </SelectContent>
        </Select>
        {f.reference && (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={!page}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={rows.length < 20}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        )}
        {result.error && f.reference && (
          <p role="alert" className="text-destructive">
            {result.error.message}
          </p>
        )}
      </div>
    )
  if (f.kind === "list")
    return (
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={id}>{f.label}</Label>
        <Textarea
          id={id}
          value={Array.isArray(value) ? value.join("\n") : ""}
          onChange={(e) =>
            onChange(
              e.target.value
                .split("\n")
                .map((v) => v.trim())
                .filter(Boolean)
            )
          }
        />
      </div>
    )
  const str = String(value ?? ""),
    date = f.kind === "datetime" && str ? new Date(str) : null
  const dateValue =
    date && Number.isFinite(date.getTime())
      ? new Date(date.getTime() - date.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16)
      : ""
  return (
    <div
      className={"space-y-2 " + (f.kind === "textarea" ? "sm:col-span-2" : "")}
    >
      <Label htmlFor={id}>{f.label}</Label>
      {f.kind === "textarea" ? (
        <Textarea
          id={id}
          required={f.required}
          value={str}
          onChange={(e) => onChange(e.target.value || (f.nullable ? null : ""))}
        />
      ) : (
        <Input
          id={id}
          required={f.required}
          type={
            f.kind === "number"
              ? "number"
              : f.kind === "datetime"
                ? "datetime-local"
                : "text"
          }
          step={f.kind === "number" ? "any" : undefined}
          value={f.kind === "datetime" ? dateValue : str}
          onChange={(e) =>
            onChange(
              e.target.value === ""
                ? f.nullable
                  ? null
                  : ""
                : f.kind === "number"
                  ? Number(e.target.value)
                  : f.kind === "datetime"
                    ? new Date(e.target.value).toISOString()
                    : e.target.value
            )
          }
        />
      )}
    </div>
  )
}
