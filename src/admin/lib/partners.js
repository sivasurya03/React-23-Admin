// Pure delivery-partner metrics derived from orders. Delivery progress is simulated from order
// status changes — there is no live GPS, so nothing here pretends to be real-time location data.
import { deliveredAt, pickedUpAt } from './orders.js'

export const OPEN = (o) => !o.cancelled && o.statusIndex < 4

export function partnerMetrics(partnerId, orders, payoutPerDelivery = 0) {
  const mine = orders.filter((o) => o.partnerId === partnerId)
  const delivered = mine.filter((o) => !o.cancelled && o.statusIndex >= 4)
  const cancelled = mine.filter((o) => o.cancelled)
  const active = mine.filter(OPEN)
  const times = delivered
    .map((o) => (new Date(deliveredAt(o)).getTime() - new Date(pickedUpAt(o) ?? o.createdAt).getTime()) / 60000)
    .filter((m) => Number.isFinite(m) && m >= 0)
  const finished = delivered.length + cancelled.length
  return {
    assigned: mine.length,
    active,
    delivered,
    cancelled: cancelled.length,
    completed: delivered.length,
    cancellationRate: finished ? cancelled.length / finished : 0,
    avgDeliveryMinutes: times.length ? Math.round(times.reduce((s, m) => s + m, 0) / times.length) : null,
    earnings: delivered.length * payoutPerDelivery,
  }
}

export const REQUIRED_DOCS = ['ID proof', 'Driving licence', 'Vehicle RC']
