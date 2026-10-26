// Pure finance maths. EVERY figure in the admin panel comes from these functions.
//
//   foodNet           = subtotal − discount                (what the restaurant's food actually sold for)
//   commission        = round(foodNet × rate / 100)        rate = snapshot taken when the order was first seen
//   restaurantPayable = foodNet − commission
//   tax               = GST collected on the order (from the saved order totals)
//   platformFee       = flat fee collected on the order
//   deliveryCollected = delivery fee charged to the customer
//   partnerPayout     = flat payout per delivery (Settings)
//   platformNet       = commission + platformFee + (deliveryCollected − partnerPayout)
//
// Identity (verified in tests): restaurantPayable + commission + deliveryCollected + platformFee + tax = order total.
// Revenue (dashboard)  = Σ total of non-cancelled orders − Σ approved refunds.
// Settlements/payouts only include DELIVERED orders without an approved refund, and each order can be settled once.
import { LAST, paymentStatusOf } from './orders.js'

export const DEFAULT_FINANCE = { defaultCommission: 15, partnerPayoutPerDelivery: 30 }

export const round = (n) => Math.round(Number(n) || 0)

export function rateFor(order, { snapshots = {}, restaurantRates = {}, defaultRate = DEFAULT_FINANCE.defaultCommission } = {}) {
  const snap = snapshots[order.id]
  if (Number.isFinite(snap)) return snap
  const own = restaurantRates[order.restaurant?.id]
  return Number.isFinite(own) ? own : defaultRate
}

export function commissionOf(foodNet, rate) {
  return round((Math.max(0, foodNet) * Math.max(0, rate)) / 100)
}

export function orderFinancials(order, { rate, payoutPerDelivery = DEFAULT_FINANCE.partnerPayoutPerDelivery }) {
  const t = order.totals ?? {}
  const foodNet = Math.max(0, round(t.subtotal) - round(t.discount))
  const commission = commissionOf(foodNet, rate)
  const deliveryCollected = round(t.deliveryFee)
  const platformFee = round(t.platformFee)
  const tax = round(t.gst)
  const deliveryMargin = deliveryCollected - payoutPerDelivery
  return {
    foodNet, commission, rate, restaurantPayable: foodNet - commission, tax, platformFee, deliveryCollected,
    partnerPayout: payoutPerDelivery, deliveryMargin, platformNet: commission + platformFee + deliveryMargin, total: round(t.total),
  }
}

export const hasApprovedRefund = (o) => o.refund?.status === 'approved'
export const isRecognised = (o) => !o.cancelled && o.statusIndex >= LAST && !hasApprovedRefund(o)

const sum = (list, pick) => list.reduce((s, x) => s + pick(x), 0)

export function financeSummary(orders, ctx) {
  const live = orders.filter((o) => !o.cancelled)
  const gmv = sum(live, (o) => round(o.totals?.total))
  const refunded = sum(orders.filter(hasApprovedRefund), (o) => round(o.refund.amount))
  const recognised = orders.filter(isRecognised).map((o) => orderFinancials(o, { rate: rateFor(o, ctx), payoutPerDelivery: ctx.payoutPerDelivery }))
  const acc = (k) => sum(recognised, (f) => f[k])
  return {
    orderCount: orders.length,
    liveOrderCount: live.length,
    gmv,
    refunded,
    netRevenue: gmv - refunded,
    pendingRefunds: sum(orders.filter((o) => o.refund?.status === 'requested'), (o) => round(o.refund.amount)),
    recognisedCount: recognised.length,
    foodNet: acc('foodNet'),
    commission: acc('commission'),
    platformFee: acc('platformFee'),
    tax: acc('tax'),
    deliveryCollected: acc('deliveryCollected'),
    partnerPayout: acc('partnerPayout'),
    deliveryMargin: acc('deliveryMargin'),
    restaurantPayable: acc('restaurantPayable'),
    platformNet: acc('platformNet'),
  }
}

const pad = (n, w) => String(n).padStart(w, '0')
const ymd = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1, 2)}${pad(d.getDate(), 2)}`

function nextId(prefix, existing, now) {
  const taken = new Set(existing.map((r) => r.id))
  for (let n = existing.length + 1; n < existing.length + 1000; n += 1) {
    const id = `${prefix}-${ymd(now)}-${pad(n, 3)}`
    if (!taken.has(id)) return id
  }
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`
}

export const settledOrderIds = (records) => new Set(records.flatMap((r) => r.orderIds))

export function eligibleForSettlement(orders, restaurantId, settlements) {
  const done = settledOrderIds(settlements)
  return orders.filter((o) => isRecognised(o) && o.restaurant?.id === restaurantId && !done.has(o.id))
}

export function buildSettlement({ orders, restaurantId, restaurantName, settlements, ctx, now = new Date(), by = 'admin' }) {
  const eligible = eligibleForSettlement(orders, restaurantId, settlements)
  if (!eligible.length) return { ok: false, error: 'No unsettled delivered orders for this restaurant. Nothing to settle (duplicates are blocked).' }
  const f = eligible.map((o) => orderFinancials(o, { rate: rateFor(o, ctx), payoutPerDelivery: ctx.payoutPerDelivery }))
  return {
    ok: true,
    record: {
      id: nextId('ST', settlements, now), restaurantId, restaurantName, orderIds: eligible.map((o) => o.id), orderCount: eligible.length,
      gross: sum(f, (x) => x.foodNet), commission: sum(f, (x) => x.commission), net: sum(f, (x) => x.restaurantPayable),
      status: 'pending', createdAt: now.toISOString(), createdBy: by, paidAt: null, simulated: true,
    },
  }
}

export function eligibleForPayout(orders, partnerId, payouts) {
  const done = settledOrderIds(payouts)
  return orders.filter((o) => isRecognised(o) && o.partnerId === partnerId && !done.has(o.id))
}

export function buildPayout({ orders, partnerId, partnerName, payouts, ctx, now = new Date(), by = 'admin' }) {
  const eligible = eligibleForPayout(orders, partnerId, payouts)
  if (!eligible.length) return { ok: false, error: 'No unpaid delivered orders for this partner. Nothing to pay out (duplicates are blocked).' }
  return {
    ok: true,
    record: {
      id: nextId('PO', payouts, now), partnerId, partnerName, orderIds: eligible.map((o) => o.id), orderCount: eligible.length,
      amount: eligible.length * ctx.payoutPerDelivery, status: 'pending', createdAt: now.toISOString(), createdBy: by, paidAt: null, simulated: true,
    },
  }
}

export function markPaid(record, now = new Date()) {
  if (record.status === 'paid') return { ok: false, error: 'Already marked as paid (simulated).' }
  return { ok: true, record: { ...record, status: 'paid', paidAt: now.toISOString() } }
}

/** Orders that were settled/paid out and later had a refund approved: finance must adjust manually. */
export function settlementAdjustments(orders, settlements) {
  const done = settledOrderIds(settlements)
  return orders.filter((o) => hasApprovedRefund(o) && done.has(o.id))
}

/** Transactions are derived from orders so payment state can never disagree with the order. */
export function buildTransactions(orders) {
  return orders.map((o) => ({
    id: `TXN-${String(o.id).replace(/^CRV-/, '')}`,
    orderId: o.id,
    at: o.createdAt,
    customer: o.customer?.name ?? '—',
    method: o.payment?.label ?? o.payment?.method ?? '—',
    amount: round(o.totals?.total),
    status: paymentStatusOf(o),
    refundAmount: hasApprovedRefund(o) ? round(o.refund.amount) : 0,
    source: o.source ?? 'live',
    simulated: true,
  }))
}

export function taxSummary(orders) {
  const months = new Map()
  for (const o of orders.filter((x) => !x.cancelled && !hasApprovedRefund(x))) {
    const d = new Date(o.createdAt)
    if (Number.isNaN(d.getTime())) continue
    const key = `${d.getFullYear()}-${pad(d.getMonth() + 1, 2)}`
    const row = months.get(key) ?? { month: key, orders: 0, taxableValue: 0, gst: 0, platformFees: 0 }
    row.orders += 1
    row.taxableValue += Math.max(0, round(o.totals?.subtotal) - round(o.totals?.discount))
    row.gst += round(o.totals?.gst)
    row.platformFees += round(o.totals?.platformFee)
    months.set(key, row)
  }
  return [...months.values()].sort((a, b) => (a.month < b.month ? 1 : -1))
}
