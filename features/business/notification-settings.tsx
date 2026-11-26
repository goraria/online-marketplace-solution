"use client"
import { useState } from "react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@gorth-com/primitive/default/card"
import { Button } from "@gorth-com/primitive/custom/button"
import { Checkbox } from "@gorth-com/primitive/default/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@gorth-com/primitive/default/select"
import { Input } from "@gorth-com/primitive/default/input"
import { Label } from "@gorth-com/primitive/default/label"
import { useBusinessQuery, useBusinessMutation } from "@/queries/business"
interface Preference {
  id: string
  notificationType: string
  channel: string
  enabled: boolean
  mutedUntil: string | null
}
export function NotificationSettings() {
  const q = useBusinessQuery<Preference[]>("/notification/preference"),
    m = useBusinessMutation(),
    [type, setType] = useState("marketplace.order.updated"),
    [channel, setChannel] = useState("in_app"),
    [enabled, setEnabled] = useState(true)
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tùy chọn thông báo</CardTitle>
        <CardDescription>
          Cấu hình được lưu ở Notify theo tài khoản. Việc gửi email/push còn phụ
          thuộc provider đã được bật tại service.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {q.error && <p role="alert">{q.error.message}</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            aria-label="Loại thông báo"
            value={type}
            onChange={(e) => setType(e.target.value)}
          />
          <Select value={channel} onValueChange={(v) => v && setChannel(v)}>
            <SelectTrigger className="w-full" aria-label="Kênh nhận">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["in_app", "email", "push", "web_push", "sms", "webhook"].map(
                (c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </div>
        <Label className="flex items-center gap-2">
          <Checkbox
            checked={enabled}
            onCheckedChange={(v) => setEnabled(v === true)}
          />
          Cho phép nhận
        </Label>
        <Button
          disabled={!type.trim() || m.isPending}
          onClick={() =>
            void m.mutateAsync({
              url: "/notification/preference",
              method: "PUT",
              body: { type, channel, enabled },
            })
          }
        >
          Lưu tùy chọn
        </Button>
        <div className="space-y-3">
          {q.data?.map((p) => (
            <div
              key={p.id}
              className="flex justify-between gap-3 rounded-md border p-3"
            >
              <span>
                {p.notificationType} · {p.channel}
              </span>
              <Label className="flex items-center gap-2">
                <Checkbox
                  checked={p.enabled}
                  onCheckedChange={(v) =>
                    void m.mutateAsync({
                      url: "/notification/preference",
                      method: "PUT",
                      body: {
                        type: p.notificationType,
                        channel: p.channel,
                        enabled: v === true,
                      },
                    })
                  }
                />
                Bật
              </Label>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
