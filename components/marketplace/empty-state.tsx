import { PackageOpen } from "@gorth-com/primitive/cores/lucide"

export function EmptyState({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed bg-muted/20 p-8 text-center">
      <div>
        <PackageOpen className="mx-auto size-10 text-muted-foreground" />
        <h2 className="mt-4 font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}
