// Shared formatting helpers so all components agree on how prices/dates look.

export function formatPrice(price) {
  // en-NG currency formatter: "18,000" (N symbol comes automatically).
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(price)
}