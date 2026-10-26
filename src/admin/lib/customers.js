// Builds the admin customer list from three clearly separated sources:
//   registered — real demo accounts created through the customer Sign up (id/name/email only: NO password data)
//   guest      — people who placed a live order without a registered account (e.g. the demo guest)
//   demo       — seeded sample customers
import { DEMO_CUSTOMERS } from '../store/seed.js'

export const emailKey = (email) => String(email || '').trim().toLowerCase()

export function deriveCustomers({ users = [], liveOrders = [], demoOrders = [], meta = {} }) {
  const map = new Map()
  const touch = (email, base) => {
    const key = emailKey(email)
    if (!key) return null
    const existing = map.get(key)
    if (existing) return existing
    const row = { id: key, name: base.name || key, email: key, phone: base.phone || '', source: base.source, plus: Boolean(base.plus), joinedAt: base.joinedAt ?? null, city: base.city || '', addresses: [] }
    map.set(key, row)
    return row
  }
  for (const c of DEMO_CUSTOMERS) touch(c.email, { name: c.name, phone: c.phone, source: 'demo', city: c.city })
  for (const u of users) {
    if (u && typeof u.email === 'string') {
      const row = touch(u.email, { name: u.name, source: 'registered', plus: u.plus })
      if (row) { row.source = 'registered'; row.name = u.name || row.name; row.plus = Boolean(u.plus) }
    }
  }
  const all = [...liveOrders.map((o) => ({ o, source: 'guest' })), ...demoOrders.map((o) => ({ o, source: 'demo' }))]
  for (const { o, source } of all) {
    const row = touch(o.customer?.email, { name: o.customer?.name, phone: o.customer?.phone, source })
    if (!row) continue
    if (!row.phone && o.customer?.phone) row.phone = o.customer.phone
    const addr = o.delivery?.address ? `${o.delivery.address}${o.delivery.pincode ? `, ${o.delivery.pincode}` : ''}` : ''
    if (addr && !row.addresses.includes(addr)) row.addresses.push(addr)
  }
  const stats = new Map()
  for (const o of [...liveOrders, ...demoOrders]) {
    const key = emailKey(o.customer?.email)
    const s = stats.get(key) ?? { orders: 0, spent: 0, refunds: 0, lastOrderAt: null }
    s.orders += 1
    if (!o.cancelled) s.spent += Number(o.totals?.total) || 0
    if (o.refund) s.refunds += 1
    if (!s.lastOrderAt || o.createdAt > s.lastOrderAt) s.lastOrderAt = o.createdAt
    stats.set(key, s)
  }
  return [...map.values()].map((c) => {
    const s = stats.get(c.id) ?? { orders: 0, spent: 0, refunds: 0, lastOrderAt: null }
    const m = meta[c.id]
    return { ...c, ...s, status: m?.status ?? 'active', statusReason: m?.reason ?? '', statusAt: m?.at ?? null }
  })
}

export function validateStatusChange(next, reason) {
  if (!['active', 'suspended', 'blocked'].includes(next)) return 'Choose a valid status.'
  if (next !== 'active' && String(reason || '').trim().length < 5) return 'Add a reason (5+ characters) for suspending or blocking this account.'
  return ''
}
