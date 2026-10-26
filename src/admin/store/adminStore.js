// Loads, repairs, saves and publishes the admin state. Corrupt, partial or outdated LocalStorage
// data never crashes the app: each section falls back to its default independently, and existing
// customer data (orders, accounts) is never touched by this module.
import { readStorage, writeStorage, STORAGE_KEYS } from '../../utils/storage.js'
import { applyRuntimeConfig } from '../../utils/runtimeConfig.js'
import { setRuntimeCoupons, setCouponUsageLookup, normalizeCode } from '../../utils/pricing.js'
import { applyCatalogOverlay } from '../../data/index.js'
import { createInitialState, SCHEMA_VERSION } from './seed.js'
import { DEMO_ADMIN_ACCOUNTS } from './adminAccounts.js'
import { normalizeOverlay } from '../lib/catalog.js'
import { normalizeMatrix } from '../lib/rbac.js'
import { buildCouponTable, deriveCouponUsage, usageCounts } from '../lib/coupons.js'
import { isObj, arr } from '../lib/util.js'

const MAX_AUDIT = 400
const MAX_NOTIFICATIONS = 120

function sanitizeOrder(raw) {
  if (!isObj(raw) || typeof raw.id !== 'string') return null
  if (!Array.isArray(raw.items) || !raw.items.length || !isObj(raw.totals) || typeof raw.totals.total !== 'number') return null
  const statusIndex = Math.max(0, Math.min(4, Math.floor(Number(raw.statusIndex)) || 0))
  const history = arr(raw.statusHistory).filter((h) => isObj(h) && typeof h.at === 'string')
  return { ...raw, statusIndex, statusHistory: history.length ? history : [{ index: 0, at: raw.createdAt || new Date().toISOString() }] }
}

const keepWith = (list, test) => arr(list).filter((x) => isObj(x) && test(x))

export function sanitizeState(raw, nowMs = Date.now()) {
  let fresh = null
  const defaults = () => fresh ?? (fresh = createInitialState(nowMs))
  const source = isObj(raw) ? raw : {}
  const pickList = (key, test) => {
    const list = keepWith(source[key], test)
    return Array.isArray(source[key]) ? list : defaults()[key]
  }
  const seen = new Set()
  const demoOrders = Array.isArray(source.demoOrders)
    ? source.demoOrders.map(sanitizeOrder).filter((o) => o && !seen.has(o.id) && seen.add(o.id))
    : defaults().demoOrders

  const adminUsers = keepWith(source.adminUsers, (u) => typeof u.id === 'string' && typeof u.email === 'string' && typeof u.hash === 'string' && typeof u.salt === 'string' && typeof u.role === 'string')
  const hasSuper = adminUsers.some((u) => u.role === 'super_admin' && u.active !== false)
  const settings = { ...defaults().settings, ...(isObj(source.settings) ? source.settings : {}) }
  settings.notifications = { ...defaults().settings.notifications, ...(isObj(settings.notifications) ? settings.notifications : {}) }

  return {
    schema: SCHEMA_VERSION,
    seededAt: typeof source.seededAt === 'string' ? source.seededAt : defaults().seededAt,
    demoOrders,
    customerMeta: isObj(source.customerMeta) ? source.customerMeta : {},
    partners: pickList('partners', (p) => typeof p.id === 'string' && typeof p.name === 'string'),
    overlay: normalizeOverlay(source.overlay ?? defaults().overlay),
    coupons: pickList('coupons', (c) => typeof c.code === 'string' && typeof c.type === 'string'),
    campaigns: pickList('campaigns', (c) => typeof c.id === 'string' && typeof c.name === 'string'),
    referral: { ...defaults().referral, ...(isObj(source.referral) ? source.referral : {}) },
    tickets: pickList('tickets', (t) => typeof t.id === 'string' && Array.isArray(t.messages)),
    reviews: pickList('reviews', (r) => typeof r.id === 'string'),
    notifications: keepWith(source.notifications, (n) => typeof n.id === 'string').slice(0, MAX_NOTIFICATIONS),
    knownLiveOrders: arr(source.knownLiveOrders).filter((x) => typeof x === 'string').slice(-800),
    zones: pickList('zones', (z) => typeof z.id === 'string' && typeof z.name === 'string'),
    settings,
    matrix: normalizeMatrix(source.matrix),
    adminUsers: adminUsers.length && hasSuper ? adminUsers : [...adminUsers.filter((u) => !DEMO_ADMIN_ACCOUNTS.some((d) => d.id === u.id)), ...DEMO_ADMIN_ACCOUNTS.map((a) => ({ ...a }))],
    commissionSnapshots: isObj(source.commissionSnapshots) ? source.commissionSnapshots : {},
    settlements: keepWith(source.settlements, (s) => typeof s.id === 'string' && Array.isArray(s.orderIds)),
    payouts: keepWith(source.payouts, (s) => typeof s.id === 'string' && Array.isArray(s.orderIds)),
    audit: keepWith(source.audit, (a) => typeof a.id === 'string').slice(0, MAX_AUDIT),
  }
}

export function loadAdminState(nowMs = Date.now()) {
  return sanitizeState(readStorage(STORAGE_KEYS.admin, null), nowMs)
}

export function saveAdminState(state) {
  return writeStorage(STORAGE_KEYS.admin, state)
}

let demoUsage = {}

function liveCouponUses(code) {
  const orders = readStorage(STORAGE_KEYS.orders, [])
  if (!Array.isArray(orders)) return 0
  return orders.filter((o) => o && !o.cancelled && normalizeCode(o.couponCode) === code).length
}

/** Publishes admin-managed rules (catalog, coupons, pricing config) to the customer-facing logic. */
export function applyRuntimeFromState(state) {
  applyCatalogOverlay(state.overlay)
  setRuntimeCoupons(buildCouponTable(state.coupons))
  demoUsage = usageCounts(deriveCouponUsage(state.demoOrders))
  setCouponUsageLookup((code) => (demoUsage[code] ?? 0) + liveCouponUses(code))
  const s = state.settings
  applyRuntimeConfig({
    freeDeliveryThreshold: s.freeDeliveryThreshold,
    platformFee: s.platformFee,
    gstRate: Number(s.gstPercent) / 100,
    etaBufferMinutes: s.etaBufferMinutes,
    refundWindowDays: s.refundWindowDays,
  })
}

/** Called once before the app renders so customer pages immediately see admin changes. */
export function initAdminRuntime() {
  try {
    const hadData = Boolean(readStorage(STORAGE_KEYS.admin, null))
    const state = loadAdminState()
    if (!hadData) saveAdminState(state)
    applyRuntimeFromState(state)
    return state
  } catch {
    return null
  }
}
