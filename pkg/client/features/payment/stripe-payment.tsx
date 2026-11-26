"use client"

import { FormEvent, useMemo, useState } from "react"
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"
import { Button } from "@gorth/primitive/custom/button"

interface StripePaymentProps {
  clientSecret: string
  publishableKey: string
  returnUrl: string
  onCancel?: () => void
}

function StripePaymentForm({
  returnUrl,
  onCancel,
}: Pick<StripePaymentProps, "returnUrl" | "onCancel">) {
  const stripe = useStripe()
  const elements = useElements()
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!stripe || !elements) return
    setSubmitting(true)
    setMessage(null)
    const result = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
    })
    if (result.error) {
      setMessage(result.error.message ?? "Payment confirmation failed")
      setSubmitting(false)
    }
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <PaymentElement />
      {message ? <p className="text-sm text-destructive">{message}</p> : null}
      <div className="flex justify-end gap-2">
        {onCancel ? (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </Button>
        ) : null}
        <Button type="submit" disabled={!stripe || !elements || submitting}>
          {submitting ? "Confirming…" : "Confirm payment"}
        </Button>
      </div>
    </form>
  )
}

export function StripePayment({
  clientSecret,
  publishableKey,
  returnUrl,
  onCancel,
}: StripePaymentProps) {
  const stripe = useMemo(() => loadStripe(publishableKey), [publishableKey])

  return (
    <Elements stripe={stripe} options={{ clientSecret }}>
      <StripePaymentForm returnUrl={returnUrl} onCancel={onCancel} />
    </Elements>
  )
}
