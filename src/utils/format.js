const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
})
const inrPrecise = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
})

export function formatCurrency(value) {
  const n = Number.isFinite(value) ? value : 0
  return Number.isInteger(n) ? inr.format(n) : inrPrecise.format(n)
}

export function formatDateTime(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatTime(date) {
  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
}

export function pluralize(n, one, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`
}

export function priceLevelLabel(level) {
  return '₹'.repeat(Math.max(1, Math.min(3, level || 1)))
}

export function selectionSummary(selections = []) {
  return selections.map((s) => s.label).join(' · ')
}
