// Shared formatting helpers so all components agree on how prices/dates look.

export function formatPrice(price) {
  // en-NG currency formatter: "18,000" (N symbol comes automatically).
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(price)
}

const dateTimeFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const dateFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

// "30 Oct 2026, 10:39" (no seconds). Shows "-" when the date is missing or invalid.
export function formatDateTime(value) {
  const date = value ? new Date(value) : null
  return date && !Number.isNaN(date.getTime()) ? dateTimeFormat.format(date) : '-'
}

// "30 Oct 2026"
export function formatDate(value) {
  const date = value ? new Date(value) : null
  return date && !Number.isNaN(date.getTime()) ? dateFormat.format(date) : '-'
}