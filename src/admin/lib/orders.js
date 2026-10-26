// Pure order-management rules for the admin panel. Orders keep the customer app's shape
// (statusIndex 0..4 + statusHistory); admin-only state is stored in optional fields:
//   cancelled: { at, reason, by }      refund: { id, status, amount, reason, ... }      partnerId
import { ORDER_STATUSES } from '../../data/orderStatuses.js'

export const LAST = ORDER_STATUSES.length - 1
export const MIN_NOTE = 5

export const CATEGORY_TABS = [
  { id: 'all', label: 'All orders' },
  { id: 'pending', label: 'Pending' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'active', label: 'Active deliveries' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'cancelled', label: 'Cancelled' },
  { id: 'refunds', label: 'Refund requests' },
]

/** pending = just placed · confirmed = accepted/preparing · active = out for delivery */
export function orderCategory(order) {
  if (order.cancelled) return 'cancelled'
  if (order.statusIndex <= 0) return 'pending'
  if (order.statusIndex <= 2) return 'confirmed'
  if (order.statusIndex === 3) return 'active'
  return 'delivered'
}

export const matchesTab = (order, tab) => {
  if (tab === 'all') return true
  if (tab === 'refunds') return order.refund?.status === 'requested'
  return orderCategory(order) === tab
}

export const statusLabel = (order) => (order.cancelled ? 'Cancelled' : ORDER_STATUSES[order.statusIndex]?.label ?? 'Unknown')
export const nextStatus = (order) => (order.cancelled || order.statusIndex >= LAST ? null : ORDER_STATUSES[order.statusIndex + 1])
export const canCancel = (order) => !order.cancelled && order.statusIndex < LAST

const fail = (error) => ({ ok: false, error })
const clean = (text) => String(text ?? '').trim()

export function advance(order, { now = new Date(), by = 'admin' } = {}) {
  if (order.cancelled) return fail('This order is cancelled and cannot move forward.')
  if (order.statusIndex >= LAST) return fail('This order is already delivered.')
  const next = order.statusIndex + 1
  if (next === 3 && !order.partnerId) return fail('Assign an available delivery partner before marking the order as picked up.')
  return {
    ok: true,
    order: { ...order, statusIndex: next, statusHistory: [...order.statusHistory, { index: next, at: now.toISOString(), by }] },
  }
}

export function cancel(order, { reason, by = 'admin', now = new Date() }) {
  if (!canCancel(order)) return fail(order.cancelled ? 'This order is already cancelled.' : 'Delivered orders cannot be cancelled. Use a refund instead.')
  const text = clean(reason)
  if (text.length < MIN_NOTE) return fail(`Enter a cancellation reason (at least ${MIN_NOTE} characters).`)
  const at = now.toISOString()
  let next = {
    ...order,
    cancelled: { at, reason: text, by },
    statusHistory: [...order.statusHistory, { type: 'cancelled', at, reason: text, by }],
  }
  let refundCreated = false
  // Prepaid orders get a refund request automatically so the money trail is reviewed, never silently dropped.
  if (order.payment?.method && order.payment.method !== 'cod' && !order.refund) {
    const r = createRefund(next, { reason: `Order cancelled: ${text}`, requestedBy: 'admin', by, now })
    if (r.ok) { next = r.order; refundCreated = true }
  }
  return { ok: true, order: next, refundCreated }
}

export function refundIdFor(order) {
  return `RF-${String(order.id).replace(/^CRV-/, '')}`
}

export function createRefund(order, { reason, amount, requestedBy = 'customer', by = 'customer', now = new Date(), windowDays = 7 }) {
  if (order.refund && order.refund.status !== 'rejected') {
    return fail(order.refund.status === 'approved' ? 'A refund was already approved for this order.' : 'A refund request is already open for this order.')
  }
  if (!order.cancelled && order.statusIndex < LAST) return fail('Refunds can only be requested for delivered or cancelled orders.')
  if (order.cancelled && (!order.payment?.method || order.payment.method === 'cod')) return fail('No payment was collected for this cancelled order, so there is nothing to refund.')
  const text = clean(reason)
  if (text.length < MIN_NOTE) return fail(`Enter a refund reason (at least ${MIN_NOTE} characters).`)
  const total = Math.round(Number(order.totals?.total) || 0)
  const value = amount === undefined || amount === '' || amount === null ? total : Math.round(Number(amount))
  if (!Number.isFinite(value) || value <= 0) return fail('Refund amount must be greater than ₹0.')
  if (value > total) return fail(`Refund amount cannot exceed the order total (₹${total}).`)
  if (requestedBy === 'customer' && !order.cancelled) {
    const deliveredAt = order.statusHistory.find((h) => h.index === LAST)?.at ?? order.createdAt
    const ageDays = (now.getTime() - new Date(deliveredAt).getTime()) / 86400000
    if (ageDays > windowDays) return fail(`The ${windowDays}-day refund window for this order has passed.`)
  }
  const refund = {
    id: refundIdFor(order), status: 'requested', amount: value, reason: text, requestedAt: now.toISOString(),
    requestedBy, requestedByName: by, reviewedAt: null, reviewedBy: null, reviewNote: '', simulated: true,
  }
  return { ok: true, order: { ...order, refund } }
}

export function reviewRefund(order, { decision, note, by = 'admin', now = new Date() }) {
  if (order.refund?.status !== 'requested') return fail('There is no open refund request on this order.')
  if (decision !== 'approve' && decision !== 'reject') return fail('Choose approve or reject.')
  const text = clean(note)
  if (text.length < MIN_NOTE) return fail(`Add a short reason for your decision (at least ${MIN_NOTE} characters).`)
  return {
    ok: true,
    order: {
      ...order,
      refund: {
        ...order.refund, status: decision === 'approve' ? 'approved' : 'rejected', reviewedAt: now.toISOString(), reviewedBy: by, reviewNote: text,
      },
    },
  }
}

/** success | pending | failed | refunded — derived, so it can never drift from the order itself. */
export function paymentStatusOf(order) {
  if (order.refund?.status === 'approved') return 'refunded'
  const explicit = order.payment?.status
  if (explicit === 'success' || explicit === 'pending' || explicit === 'failed') return explicit
  const cod = !order.payment?.method || order.payment.method === 'cod'
  if (order.cancelled) return cod ? 'failed' : 'success'
  if (cod) return order.statusIndex >= LAST ? 'success' : 'pending'
  return 'success'
}

export const deliveredAt = (order) => order.statusHistory?.find((h) => h.index === LAST)?.at ?? null
export const pickedUpAt = (order) => order.statusHistory?.find((h) => h.index === 3)?.at ?? null

/** Assigns/reassigns a partner. Pure validation: the partner and order must both be valid. */
export function assignPartner(order, partner, { orders = [], maxActive = 2, now = new Date(), by = 'admin' } = {}) {
  if (!partner) return fail('Choose a delivery partner.')
  if (order.cancelled) return fail('Cancelled orders cannot be assigned.')
  if (order.statusIndex >= LAST) return fail('Delivered orders cannot be reassigned.')
  if (partner.verification !== 'approved') return fail(`${partner.name} is not verified yet.`)
  if (partner.active === false) return fail(`${partner.name}'s account is inactive.`)
  if (!partner.online) return fail(`${partner.name} is offline.`)
  if (order.partnerId === partner.id) return fail(`${partner.name} is already assigned to this order.`)
  const load = orders.filter((o) => o.partnerId === partner.id && !o.cancelled && o.statusIndex < LAST && o.id !== order.id).length
  if (load >= maxActive) return fail(`${partner.name} already has ${load} active deliveries (limit ${maxActive}).`)
  const entry = { partnerId: partner.id, name: partner.name, at: now.toISOString(), by }
  return {
    ok: true,
    order: {
      ...order,
      partnerId: partner.id,
      partner: { name: partner.name, vehicle: `${partner.vehicle} · ${partner.plate}`, rating: partner.rating ?? 0 },
      assignments: [...(order.assignments ?? []), entry],
    },
  }
}
