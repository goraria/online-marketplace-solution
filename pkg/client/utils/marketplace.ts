export function formatPrice(value: number, currency = "VND") {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "VND" ? 0 : 2,
  }).format(value)
}

const zeroDecimalCurrencies = new Set(["VND", "JPY", "KRW"])

export function toMinorAmount(value: number, currency: string) {
  const multiplier = zeroDecimalCurrencies.has(currency.toUpperCase()) ? 1 : 100
  return Math.round(value * multiplier)
}

export function formatMinorPrice(value: number, currency = "VND") {
  const divisor = zeroDecimalCurrencies.has(currency.toUpperCase()) ? 1 : 100
  return formatPrice(value / divisor, currency)
}

export function mediaUrl(mediaId: string | null | undefined) {
  if (!mediaId) return null
  if (
    mediaId.startsWith("http://") ||
    mediaId.startsWith("https://") ||
    mediaId.startsWith("/")
  ) {
    return mediaId
  }
  return `/media/public/${encodeURIComponent(mediaId)}`
}

export function addressLine(address: {
  line1: string
  line2?: string | null
  ward?: string | null
  district?: string | null
  province?: string | null
  countryCode: string
}) {
  return [
    address.line1,
    address.line2,
    address.ward,
    address.district,
    address.province,
    address.countryCode,
  ]
    .filter(Boolean)
    .join(", ")
}
