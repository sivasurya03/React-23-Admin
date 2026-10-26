// Pure analytics over order lists. Every dashboard/report number is derived here from real orders
// (live customer orders + clearly labelled demo orders) — nothing is hard-coded.
import { orderCategory } from './orders.js'

export const RANGE_PRESETS = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: '90d', label: 'Last 90 days' },
  { id: 'all', label: 'All time' },
  { id: 'custom', label: 'Custom' },
]

const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
const endOfDay = (d) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x }
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }

function parseDay(text) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(text || ''))) return null
  const [y, m, d] = text.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d ? date : null
}

/** → { from: Date|null, to: Date|null, error?: string, preset } */
export function resolveRange({ preset = '30d', from = '', to = '' } = {}, now = new Date()) {
  const today = startOfDay(now)
  if (preset === 'all') return { preset, from: null, to: null }
  if (preset === 'today') return { preset, from: today, to: endOfDay(now) }
  if (preset === '7d') return { preset, from: addDays(today, -6), to: endOfDay(now) }
  if (preset === '30d') return { preset, from: addDays(today, -29), to: endOfDay(now) }
  if (preset === '90d') return { preset, from: addDays(today, -89), to: endOfDay(now) }
  if (preset === 'custom') {
    const f = parseDay(from)
    const t = parseDay(to)
    if (!f || !t) return { preset, from: null, to: null, error: 'Choose both a start and an end date.' }
    if (f > t) return { preset, from: null, to: null, error: 'The start date must be on or before the end date.' }
    return { preset, from: startOfDay(f), to: endOfDay(t) }
  }
  return resolveRange({ preset: '30d' }, now)
}

export function filterByRange(orders, range) {
  if (!range || range.error) return orders
  const lo = range.from ? range.from.getTime() : -Infinity
  const hi = range.to ? range.to.getTime() : Infinity
  return orders.filter((o) => {
    const t = new Date(o.createdAt).getTime()
    return Number.isFinite(t) && t >= lo && t <= hi
  })
}

export const netValue = (o) => (o.cancelled ? 0 : Math.max(0, (Number(o.totals?.total) || 0) - (o.refund?.status === 'approved' ? Number(o.refund.amount) || 0 : 0)))

export function summarize(orders) {
  const live = orders.filter((o) => !o.cancelled)
  const gmv = live.reduce((s, o) => s + (Number(o.totals?.total) || 0), 0)
  const revenue = orders.reduce((s, o) => s + netValue(o), 0)
  return {
    orders: orders.length,
    gmv,
    revenue,
    refunded: gmv - revenue,
    avgOrderValue: live.length ? Math.round(gmv / live.length) : 0,
    delivered: orders.filter((o) => orderCategory(o) === 'delivered').length,
    cancelled: orders.filter((o) => o.cancelled).length,
    cancelRate: orders.length ? orders.filter((o) => o.cancelled).length / orders.length : 0,
    openRefunds: orders.filter((o) => o.refund?.status === 'requested').length,
  }
}

const pad = (n) => String(n).padStart(2, '0')
const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
function weekStart(d) { const x = startOfDay(d); const dow = (x.getDay() + 6) % 7; return addDays(x, -dow) }
function bucketKey(d, bucket) {
  if (bucket === 'month') return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
  if (bucket === 'week') return dayKey(weekStart(d))
  return dayKey(d)
}
function bucketLabel(key, bucket) {
  if (bucket === 'month') { const [y, m] = key.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleString('en-IN', { month: 'short', year: '2-digit' }) }
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleString('en-IN', { day: 'numeric', month: 'short' })
}

/** Continuous buckets (zero-filled) so charts show gaps honestly. Capped at 60 buckets. */
export function seriesByBucket(orders, bucket = 'day', range = null) {
  const dates = orders.map((o) => new Date(o.createdAt)).filter((d) => !Number.isNaN(d.getTime()))
  if (!dates.length && !(range?.from && range?.to)) return []
  const lo = range?.from ?? new Date(Math.min(...dates))
  const hi = range?.to ?? new Date(Math.max(...dates))
  const keys = []
  let cursor = startOfDay(lo)
  if (bucket === 'week') cursor = weekStart(cursor)
  if (bucket === 'month') cursor = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  while (cursor <= hi && keys.length < 400) {
    keys.push(bucketKey(cursor, bucket))
    cursor = bucket === 'month' ? new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1) : addDays(cursor, bucket === 'week' ? 7 : 1)
  }
  const trimmed = [...new Set(keys)].slice(-60)
  const rows = new Map(trimmed.map((k) => [k, { key: k, label: bucketLabel(k, bucket), orders: 0, revenue: 0 }]))
  for (const o of orders) {
    const d = new Date(o.createdAt)
    if (Number.isNaN(d.getTime())) continue
    const row = rows.get(bucketKey(d, bucket))
    if (!row) continue
    if (!o.cancelled) row.orders += 1
    row.revenue += netValue(o)
  }
  return [...rows.values()]
}

export function peakHours(orders) {
  const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, orders: 0 }))
  for (const o of orders) {
    const d = new Date(o.createdAt)
    if (!Number.isNaN(d.getTime()) && !o.cancelled) hours[d.getHours()].orders += 1
  }
  return hours
}

export const hourLabel = (h) => `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? 'am' : 'pm'}`

export function statusDistribution(orders) {
  const counts = { pending: 0, confirmed: 0, active: 0, delivered: 0, cancelled: 0 }
  for (const o of orders) counts[orderCategory(o)] += 1
  return [
    { key: 'pending', label: 'Pending', value: counts.pending },
    { key: 'confirmed', label: 'Confirmed / preparing', value: counts.confirmed },
    { key: 'active', label: 'Out for delivery', value: counts.active },
    { key: 'delivered', label: 'Delivered', value: counts.delivered },
    { key: 'cancelled', label: 'Cancelled', value: counts.cancelled },
  ]
}

export function topItems(orders, limit = 5) {
  const map = new Map()
  for (const o of orders) {
    if (o.cancelled) continue
    for (const i of o.items ?? []) {
      const key = `${o.restaurant?.id}:${i.itemId ?? i.name}`
      const row = map.get(key) ?? { key, name: i.name, restaurant: o.restaurant?.name ?? '—', quantity: 0, revenue: 0 }
      row.quantity += Number(i.quantity) || 0
      row.revenue += (Number(i.unitPrice) || 0) * (Number(i.quantity) || 0)
      map.set(key, row)
    }
  }
  return [...map.values()].sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue).slice(0, limit)
}

export function restaurantStats(orders) {
  const map = new Map()
  for (const o of orders) {
    const id = o.restaurant?.id ?? 'unknown'
    const row = map.get(id) ?? { id, name: o.restaurant?.name ?? 'Unknown', orders: 0, delivered: 0, cancelled: 0, revenue: 0, refunds: 0 }
    row.orders += 1
    if (o.cancelled) row.cancelled += 1
    else if (orderCategory(o) === 'delivered') row.delivered += 1
    if (o.refund?.status === 'approved') row.refunds += 1
    row.revenue += netValue(o)
    map.set(id, row)
  }
  return [...map.values()].map((r) => ({ ...r, cancelRate: r.orders ? r.cancelled / r.orders : 0 }))
}

export const topRestaurants = (orders, limit = 5) => restaurantStats(orders).sort((a, b) => b.revenue - a.revenue).slice(0, limit)

const pct = (current, previous) => (previous > 0 ? Math.round(((current - previous) / previous) * 100) : null)

/** Compares the range with the immediately preceding period of equal length. Null if not comparable. */
export function growth(allOrders, range) {
  if (!range?.from || !range?.to || range.error) return null
  const span = range.to.getTime() - range.from.getTime() + 1
  const prevRange = { from: new Date(range.from.getTime() - span), to: new Date(range.from.getTime() - 1) }
  const cur = summarize(filterByRange(allOrders, range))
  const prev = summarize(filterByRange(allOrders, prevRange))
  if (prev.orders === 0) return null
  return { orders: { current: cur.orders, previous: prev.orders, pct: pct(cur.orders, prev.orders) }, revenue: { current: cur.revenue, previous: prev.revenue, pct: pct(cur.revenue, prev.revenue) } }
}

export function bucketForRange(range) {
  if (!range?.from || !range?.to) return 'month'
  const days = (range.to - range.from) / 86400000
  if (days <= 31) return 'day'
  if (days <= 120) return 'week'
  return 'month'
}
