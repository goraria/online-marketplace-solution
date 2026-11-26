"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, MapPin, Plus } from "@gorth-com/primitive/cores/lucide"
import { Button } from "@gorth-com/primitive/custom/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@gorth-com/primitive/default/card"
import { Input } from "@gorth-com/primitive/default/input"
import { Label } from "@gorth-com/primitive/default/label"
import { Textarea } from "@gorth-com/primitive/default/textarea"
import {
  Select,
  SelectGroup,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@gorth-com/primitive/custom/select"

import { StripePayment } from "@/features/payment/stripe-payment"
import { useAuth } from "@/hooks/use-auth"
import type { PaymentProvider } from "@/utils/payment-types"
import { addressLine, formatPrice, formatMinorPrice } from "@/utils/marketplace"
import {
  useAddressQuery,
  useCartQuery,
  useCheckoutMutation,
  useCreateAddressMutation,
  useQuoteMutation,
} from "@/queries/marketplace"
import { useCreatePaymentMutation } from "@/queries/payment"

interface StripeCheckoutState {
  clientSecret: string
  publishableKey: string
  returnUrl: string
  orderId: string
}

export function CheckoutView() {
  const auth = useAuth()
  const router = useRouter()
  const cart = useCartQuery(auth.authenticated)
  const addresses = useAddressQuery(auth.authenticated)
  const [selected, setSelected] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [note, setNote] = useState("")
  const [provider, setProvider] = useState<PaymentProvider>("stripe")
  const [stripeCheckout, setStripeCheckout] =
    useState<StripeCheckoutState | null>(null)
  const [createAddress, createState] = useCreateAddressMutation()
  const [placeOrder, checkoutState] = useCheckoutMutation()
  const [createPayment, paymentState] = useCreatePaymentMutation()
  const [quoteOrder] = useQuoteMutation()
  const [checkoutKey] = useState(() => crypto.randomUUID())
  const addressId =
    selected ??
    addresses.data?.find((entry) => entry.isDefaultShipping)?.id ??
    addresses.data?.[0]?.id

  async function saveAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    try {
      const created = await createAddress({
        label: "Home",
        recipientName: String(form.get("recipientName") ?? ""),
        phone: String(form.get("phone") ?? ""),
        line1: String(form.get("line1") ?? ""),
        line2: null,
        ward: String(form.get("ward") ?? "") || null,
        district: String(form.get("district") ?? "") || null,
        province: String(form.get("province") ?? "") || null,
        postalCode: null,
        countryCode: String(form.get("countryCode") ?? "VN"),
        isDefaultShipping: true,
        isDefaultBilling: true,
      }).unwrap()
      setSelected(created.id)
      setShowForm(false)
    } catch {
      /* caller shows error */
    }
  }

  async function submitOrder() {
    if (!addressId) return setShowForm(true)
    try {
      const quote = await quoteOrder({ shippingAddressId: addressId }).unwrap()
      if (
        !window.confirm(
          "Confirm order total: " +
            formatMinorPrice(quote.totalMinor, quote.currency)
        )
      )
        return
      const order = await placeOrder({
        shippingAddressId: addressId,
        expectedTotalMinor: quote.totalMinor,
        version: quote.version,
        idempotencyKey: checkoutKey,
        note: note || undefined,
      }).unwrap()
      const returnUrl = new URL(
        `/order/${order.id}?payment=return`,
        window.location.origin
      ).toString()
      const result = await createPayment({
        orderId: order.id,
        orderNumber: order.orderNumber,
        provider,
        returnUrl,
      }).unwrap()

      if (result.checkout?.url) {
        window.location.assign(result.checkout.url)
        return
      }
      if (result.checkout?.clientSecret && result.checkout.publishableKey) {
        setStripeCheckout({
          clientSecret: result.checkout.clientSecret,
          publishableKey: result.checkout.publishableKey,
          returnUrl,
          orderId: order.id,
        })
        return
      }
      router.push(`/order/${order.id}`)
    } catch {
      /* caller shows error */
    }
  }

  if (!auth.loading && !auth.authenticated) {
    auth.login("/checkout")
    return null
  }
  if (!cart.data?.items.length && !cart.isPending)
    return (
      <div className="rounded-2xl border p-8 text-center">
        Your cart is empty.
      </div>
    )

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        <div>
          <p className="text-sm text-muted-foreground">Secure checkout</p>
          <h1 className="text-3xl font-semibold">Delivery and contact</h1>
        </div>
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Shipping address</CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowForm((value) => !value)}
            >
              <Plus /> New address
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {addresses.data?.map((address) => (
              <button
                key={address.id}
                type="button"
                onClick={() => setSelected(address.id)}
                className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition ${addressId === address.id ? "border-primary bg-primary/5" : "hover:bg-muted/40"}`}
              >
                <MapPin className="mt-0.5 size-5 text-primary" />
                <span className="flex-1">
                  <span className="font-medium">{address.recipientName}</span>
                  <span className="ml-2 text-sm text-muted-foreground">
                    {address.phone}
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    {addressLine(address)}
                  </span>
                </span>
                {addressId === address.id ? (
                  <Check className="size-5 text-primary" />
                ) : null}
              </button>
            ))}
            {showForm || !addresses.data?.length ? (
              <form
                onSubmit={saveAddress}
                className="grid gap-4 rounded-xl border border-dashed p-4 sm:grid-cols-2"
              >
                <Field label="Recipient" name="recipientName" />
                <Field label="Phone" name="phone" />
                <div className="sm:col-span-2">
                  <Field label="Address line" name="line1" />
                </div>
                <Field label="Ward" name="ward" required={false} />
                <Field label="District" name="district" required={false} />
                <Field label="Province" name="province" required={false} />
                <Field
                  label="Country code"
                  name="countryCode"
                  defaultValue="VN"
                />
                <Button
                  type="submit"
                  disabled={createState.isLoading}
                  className="sm:col-span-2"
                >
                  {createState.isLoading ? "Saving…" : "Save address"}
                </Button>
              </form>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Payment method</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              value={provider}
              onValueChange={(value) => setProvider(value as PaymentProvider)}
              disabled={Boolean(stripeCheckout)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="stripe">Stripe</SelectItem>
                  <SelectItem value="momo">MoMo</SelectItem>
                  <SelectItem value="zalopay">ZaloPay</SelectItem>
                  <SelectItem value="vnpay">VNPay</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            {stripeCheckout ? (
              <StripePayment
                clientSecret={stripeCheckout.clientSecret}
                publishableKey={stripeCheckout.publishableKey}
                returnUrl={stripeCheckout.returnUrl}
                onCancel={() => router.push(`/order/${stripeCheckout.orderId}`)}
              />
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Order note</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Delivery instructions or a note for the seller"
            />
          </CardContent>
        </Card>
      </div>
      <Card className="h-fit lg:sticky lg:top-24">
        <CardHeader>
          <CardTitle>Review order</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {cart.data?.items.map((item) => (
            <div key={item.id} className="flex justify-between gap-4 text-sm">
              <span className="line-clamp-2">
                {item.quantity} × {item.productTitle}
              </span>
              <span className="shrink-0">
                {formatPrice(item.lineTotal, item.currency)}
              </span>
            </div>
          ))}
          <div className="flex justify-between border-t pt-4 text-lg font-semibold">
            <span>Total</span>
            <span>
              {formatPrice(cart.data?.subtotal ?? 0, cart.data?.currency)}
            </span>
          </div>
          <Button
            size="lg"
            className="w-full"
            disabled={
              auth.signingIn ||
              !addressId ||
              checkoutState.isLoading ||
              paymentState.isLoading ||
              Boolean(stripeCheckout)
            }
            onClick={() => void submitOrder()}
          >
            {checkoutState.isLoading || paymentState.isLoading
              ? "Preparing payment…"
              : "Place order and pay"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Inventory is reserved atomically when you place the order. Payment
            is completed by the Payment service.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function Field({
  label,
  name,
  defaultValue,
  required = true,
}: {
  label: string
  name: string
  defaultValue?: string
  required?: boolean
}) {
  return (
    <label className="grid gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        defaultValue={defaultValue}
        required={required}
      />
    </label>
  )
}
