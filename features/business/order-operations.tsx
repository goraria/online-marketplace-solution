"use client"
import { useState } from "react"
import { Button } from "@gorth-com/primitive/custom/button"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@gorth-com/primitive/default/card"
import { Input } from "@gorth-com/primitive/default/input"
import { Textarea } from "@gorth-com/primitive/default/textarea"
import { Label } from "@gorth-com/primitive/default/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@gorth-com/primitive/default/select"
import { useBusinessQuery, useBusinessMutation } from "@/queries/business"
const formatMinorPrice = (value: number, currency: string) =>
  new Intl.NumberFormat("en", { style: "currency", currency }).format(
    value /
      10 **
        new Intl.NumberFormat("en", {
          style: "currency",
          currency,
        }).resolvedOptions().maximumFractionDigits!
  )
interface Item {
  id: string
  title: string
  quantity: number
  unit_minor: number
}
interface Fulfillment {
  id: string
  status: string
  version: number
  carrier: string | null
  tracking_code: string | null
}
interface Return {
  id: string
  status: string
  version: number
  quantity: number
  reason: string
}
interface Order {
  id: string
  status: string
  payment_status: string
  currency: string
  total_minor: number
  version: number
  items: Item[]
  fulfillments: Fulfillment[]
  returns: Return[]
  payments: Array<{ id: string }>
}
export function OrderOperations({
  id,
  customer = false,
}: {
  id: string
  customer?: boolean
}) {
  const result = useBusinessQuery<Order>(
      "/commerce/order/" + encodeURIComponent(id)
    ),
    m = useBusinessMutation(),
    [itemId, setItemId] = useState(""),
    [quantity, setQuantity] = useState(1),
    [reason, setReason] = useState(""),
    [carrier, setCarrier] = useState(""),
    [tracking, setTracking] = useState(""),
    [confirm, setConfirm] = useState<{
      url: string
      method: "POST" | "PATCH"
      body: unknown
      label: string
    } | null>(null),
    [error, setError] = useState("")
  const o = result.data
  if (!o)
    return result.error ? (
      <p role="alert">{result.error.message}</p>
    ) : (
      <p>Đang tải đơn…</p>
    )
  function ask(
    label: string,
    url: string,
    body: unknown,
    method: "POST" | "PATCH" = "POST"
  ) {
    setConfirm({ url, body, method, label })
  }
  async function apply() {
    if (!confirm) return
    setError("")
    try {
      await m.mutateAsync(confirm)
      setConfirm(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể thực hiện.")
    }
  }
  return (
    <section className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Vận hành đơn {o.id}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            {o.status} · {o.payment_status} ·{" "}
            {formatMinorPrice(Number(o.total_minor), o.currency)}
          </p>
          <ul className="space-y-2">
            {o.items.map((i) => (
              <li
                key={i.id}
                className="flex justify-between gap-3 rounded-md border p-3"
              >
                <span>{i.title}</span>
                <span>
                  {i.quantity} ×{" "}
                  {formatMinorPrice(Number(i.unit_minor), o.currency)}
                </span>
              </li>
            ))}
          </ul>
          {o.status === "awaiting_payment" && o.payment_status === "unpaid" && (
            <Button
              variant="outline"
              onClick={() =>
                ask(
                  "Hủy đơn chưa thanh toán",
                  "/commerce/order/" + o.id + "/cancel",
                  { version: o.version, reason: "Cancelled from Restaurant" }
                )
              }
            >
              Hủy đơn
            </Button>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Mặt hàng</Label>
              <Select value={itemId} onValueChange={(v) => setItemId(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn mặt hàng" />
                </SelectTrigger>
                <SelectContent>
                  {o.items.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Số lượng</Label>
              <Input
                type="number"
                min={1}
                max={o.items.find((i) => i.id === itemId)?.quantity ?? 1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
            </div>
          </div>
          {customer ? (
            <>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Lý do yêu cầu đổi trả"
              />
              <Button
                disabled={!itemId || reason.trim().length < 3}
                onClick={() =>
                  ask(
                    "Gửi yêu cầu đổi trả",
                    "/commerce/order/" + o.id + "/return",
                    { itemId, quantity, reason }
                  )
                }
              >
                Yêu cầu đổi trả
              </Button>
            </>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  placeholder="Đơn vị giao hàng"
                />
                <Input
                  value={tracking}
                  onChange={(e) => setTracking(e.target.value)}
                  placeholder="Mã tracking"
                />
              </div>
              <Button
                disabled={
                  !itemId ||
                  (o.payment_status !== "paid" &&
                    o.payment_status !== "partially_refunded")
                }
                onClick={() =>
                  ask(
                    "Tạo kiện giao hàng",
                    "/commerce/order/" + o.id + "/fulfillment",
                    {
                      items: [{ itemId, quantity }],
                      ...(carrier ? { carrier } : {}),
                      ...(tracking ? { trackingCode: tracking } : {}),
                    }
                  )
                }
              >
                Tạo kiện giao hàng
              </Button>
            </>
          )}
        </CardContent>
      </Card>
      {o.fulfillments.map((f) => (
        <Card key={f.id}>
          <CardHeader>
            <CardTitle>Kiện {f.id}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p>
              {f.status} · {f.carrier} · {f.tracking_code}
            </p>
            {!customer && (
              <div className="flex flex-wrap gap-2">
                {(f.status === "packing"
                  ? ["shipped", "cancelled"]
                  : f.status === "shipped"
                    ? ["delivered"]
                    : []
                ).map((status) => (
                  <Button
                    key={status}
                    variant="outline"
                    onClick={() =>
                      ask(
                        status,
                        "/commerce/fulfillment/" + f.id,
                        {
                          version: f.version,
                          status,
                          ...(carrier ? { carrier } : {}),
                          ...(tracking ? { trackingCode: tracking } : {}),
                        },
                        "PATCH"
                      )
                    }
                  >
                    {status}
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
      {o.returns.map((r) => (
        <Card key={r.id}>
          <CardHeader>
            <CardTitle>Đổi trả {r.id}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p>
              {r.quantity} · {r.reason} · {r.status}
            </p>
            {!customer && (
              <div className="flex flex-wrap gap-2">
                {(r.status === "requested"
                  ? ["approved", "rejected"]
                  : r.status === "approved"
                    ? ["received"]
                    : []
                ).map((status) => (
                  <Button
                    key={status}
                    variant="outline"
                    onClick={() =>
                      ask(
                        status,
                        "/commerce/return/" + r.id,
                        { version: r.version, status },
                        "PATCH"
                      )
                    }
                  >
                    {status}
                  </Button>
                ))}
                {r.status === "received" &&
                  o.payments.map((p) => (
                    <Button
                      key={p.id}
                      onClick={() =>
                        ask(
                          "Hoàn tiền theo return đã được xác nhận",
                          "/payment/" + p.id + "/refund",
                          { commerceReturnId: r.id }
                        )
                      }
                    >
                      Hoàn tiền qua Payment
                    </Button>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
      {confirm && (
        <Card>
          <CardHeader>
            <CardTitle>{confirm.label}?</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button disabled={m.isPending} onClick={() => void apply()}>
              Xác nhận
            </Button>
            <Button variant="outline" onClick={() => setConfirm(null)}>
              Quay lại
            </Button>
          </CardContent>
        </Card>
      )}
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
    </section>
  )
}
