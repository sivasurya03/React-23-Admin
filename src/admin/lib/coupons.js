// Pure coupon rules. The cart and checkout use pricing.js validateCoupon(); this module only
// manages the coupon definitions and publishes them into that SAME validation path (no second
// discount engine). Eligibility is limited to what the existing cart logic supports:
// minimum order value, maximum discount, start/expiry, usage limit and active flag.
import { isObj } from './util.js'

export const COUPON_TYPES = [
  { id: 'percent', label: 'Percentage off' },
  { id: 'flat', label: 'Fixed amount off' },
  { id: 'freeDelivery', label: 'Free delivery' },
]

const CODE_RE = /^[A-Z0-9]{4,16}$/
export const normalizeCode = (c) => String(c ?? '').trim().toUpperCase()
const blank = (v) => v === '' || v === null || v === undefined
const toDateTime = (v) => (blank(v) ? null : new Date(v).getTime())

export function describeCoupon(c) {
  const min = c.minSubtotal ? ` Minimum order ₹${c.minSubtotal}.` : ''
  if (c.type === 'percent') return `${c.value}% off the food subtotal${c.maxDiscount ? `, up to ₹${c.maxDiscount}` : ''}.${min}`
  if (c.type === 'flat') return `Flat ₹${c.value} off the food subtotal.${min}`
  return `Delivery fee waived.${min}`
}

export function validateCouponDraft(draft, { existing = [], editingCode = null } = {}) {
  const e = {}
  const code = normalizeCode(draft.code)
  if (!code) e.code = 'Enter a coupon code.'
  else if (!CODE_RE.test(code)) e.code = 'Use 4–16 letters or digits, no spaces (e.g. FEAST20).'
  else if (existing.some((c) => normalizeCode(c.code) === code && normalizeCode(editingCode) !== code)) e.code = `${code} already exists.`

  if (!COUPON_TYPES.some((t) => t.id === draft.type)) e.type = 'Choose a discount type.'
  if (String(draft.title ?? '').trim().length < 3) e.title = 'Add a short title (3+ characters).'

  if (draft.type === 'percent') {
    const v = Number(draft.value)
    if (blank(draft.value) || !Number.isFinite(v)) e.value = 'Enter the discount percentage.'
    else if (v < 1 || v > 100) e.value = 'Percentage must be between 1 and 100.'
    else if (!Number.isInteger(v)) e.value = 'Use a whole-number percentage.'
  }
  if (draft.type === 'flat') {
    const v = Number(draft.value)
    if (blank(draft.value) || !Number.isFinite(v)) e.value = 'Enter the discount amount in ₹.'
    else if (v < 1 || v > 5000) e.value = 'Fixed discount must be between ₹1 and ₹5,000.'
    else if (!Number.isInteger(v)) e.value = 'Use a whole-rupee amount.'
  }
  if (!blank(draft.maxDiscount)) {
    const m = Number(draft.maxDiscount)
    if (draft.type !== 'percent') e.maxDiscount = 'A maximum discount only applies to percentage coupons.'
    else if (!Number.isFinite(m) || m < 1 || m > 5000) e.maxDiscount = 'Maximum discount must be between ₹1 and ₹5,000.'
  }
  const min = blank(draft.minSubtotal) ? 0 : Number(draft.minSubtotal)
  if (!Number.isFinite(min) || min < 0 || min > 10000) e.minSubtotal = 'Minimum order must be between ₹0 and ₹10,000.'
  else if (draft.type === 'flat' && !e.value && min > 0 && Number(draft.value) > min) e.minSubtotal = 'The discount cannot be larger than the minimum order value.'

  const start = toDateTime(draft.startsAt)
  const end = toDateTime(draft.expiresAt)
  if (start !== null && Number.isNaN(start)) e.startsAt = 'Enter a valid start date.'
  if (end !== null && Number.isNaN(end)) e.expiresAt = 'Enter a valid expiry date.'
  if (!e.startsAt && !e.expiresAt && start !== null && end !== null && end <= start) e.expiresAt = 'Expiry must be after the start date.'

  if (!blank(draft.usageLimit)) {
    const u = Number(draft.usageLimit)
    if (!Number.isInteger(u) || u < 1 || u > 1000000) e.usageLimit = 'Usage limit must be a whole number of 1 or more (leave blank for unlimited).'
  }
  return e
}

/** Clean, typed coupon object from form strings. Assumes the draft already passed validation. */
export function normalizeCouponDraft(draft) {
  const type = draft.type
  const out = {
    code: normalizeCode(draft.code),
    title: String(draft.title).trim(),
    description: '',
    type,
    minSubtotal: blank(draft.minSubtotal) ? 0 : Number(draft.minSubtotal),
    startsAt: blank(draft.startsAt) ? null : new Date(draft.startsAt).toISOString(),
    expiresAt: blank(draft.expiresAt) ? null : new Date(draft.expiresAt).toISOString(),
    usageLimit: blank(draft.usageLimit) ? null : Number(draft.usageLimit),
    active: draft.active !== false,
    campaignId: draft.campaignId || null,
  }
  if (type !== 'freeDelivery') out.value = Number(draft.value)
  if (type === 'percent' && !blank(draft.maxDiscount)) out.maxDiscount = Number(draft.maxDiscount)
  out.description = String(draft.description || '').trim() || describeCoupon(out)
  return out
}

/** Shape consumed by pricing.js validateCoupon / computeDiscount. */
export function toRuntimeCoupon(c) {
  const out = { code: c.code, title: c.title, description: c.description, type: c.type, minSubtotal: Number(c.minSubtotal) || 0, active: c.active !== false }
  if (c.type !== 'freeDelivery') out.value = Number(c.value)
  if (c.type === 'percent' && c.maxDiscount) out.maxDiscount = Number(c.maxDiscount)
  if (c.startsAt) out.startsAt = c.startsAt
  if (c.expiresAt) out.expiresAt = c.expiresAt
  if (c.usageLimit) out.usageLimit = Number(c.usageLimit)
  return out
}

export function buildCouponTable(coupons) {
  const table = {}
  for (const c of coupons) if (isObj(c) && c.code) table[normalizeCode(c.code)] = toRuntimeCoupon(c)
  return table
}

export function couponStatus(c, now = new Date(), used = 0) {
  if (c.active === false) return 'inactive'
  if (c.expiresAt && new Date(c.expiresAt).getTime() < now.getTime()) return 'expired'
  if (c.startsAt && new Date(c.startsAt).getTime() > now.getTime()) return 'scheduled'
  if (c.usageLimit && used >= c.usageLimit) return 'exhausted'
  return 'active'
}

/** One usage record per non-cancelled order that used a coupon — derived, never stored separately. */
export function deriveCouponUsage(orders) {
  return orders
    .filter((o) => o.couponCode)
    .map((o) => {
      const waived = o.totals?.deliveryWaivedBy === 'coupon' ? Number(o.totals?.deliveryFeeBase) || 0 : 0
      return {
        id: `${o.id}:${o.couponCode}`, code: normalizeCode(o.couponCode), orderId: o.id, at: o.createdAt,
        customer: o.customer?.name ?? '—', subtotal: Number(o.totals?.subtotal) || 0,
        savings: (Number(o.totals?.discount) || 0) + waived, orderTotal: Number(o.totals?.total) || 0,
        cancelled: Boolean(o.cancelled), source: o.source ?? 'live',
      }
    })
    .sort((a, b) => (a.at < b.at ? 1 : -1))
}

export const usageCounts = (usage) => {
  const map = {}
  for (const u of usage) if (!u.cancelled) map[u.code] = (map[u.code] ?? 0) + 1
  return map
}

export function validateCampaign(draft, { existing = [], editingId = null, couponCodes = [] } = {}) {
  const e = {}
  const name = String(draft.name ?? '').trim()
  if (name.length < 3) e.name = 'Campaign name needs 3+ characters.'
  else if (existing.some((c) => c.name.toLowerCase() === name.toLowerCase() && c.id !== editingId)) e.name = 'A campaign with this name already exists.'
  const start = toDateTime(draft.startsAt)
  const end = toDateTime(draft.endsAt)
  if (blank(draft.startsAt)) e.startsAt = 'Choose a start date.'
  else if (Number.isNaN(start)) e.startsAt = 'Enter a valid start date.'
  if (blank(draft.endsAt)) e.endsAt = 'Choose an end date.'
  else if (Number.isNaN(end)) e.endsAt = 'Enter a valid end date.'
  if (!e.startsAt && !e.endsAt && end <= start) e.endsAt = 'End must be after the start.'
  const codes = Array.isArray(draft.couponCodes) ? draft.couponCodes : []
  if (!codes.length) e.couponCodes = 'Attach at least one coupon.'
  else if (codes.some((c) => !couponCodes.includes(c))) e.couponCodes = 'One of the selected coupons no longer exists.'
  return e
}

export function validateReferral(draft) {
  const e = {}
  const num = (k, min, max, msg) => { const v = Number(draft[k]); if (blank(draft[k]) || !Number.isFinite(v) || v < min || v > max) e[k] = msg }
  num('referrerReward', 0, 1000, 'Reward must be ₹0–₹1,000.')
  num('refereeReward', 0, 1000, 'Reward must be ₹0–₹1,000.')
  num('minOrderValue', 0, 5000, 'Minimum order must be ₹0–₹5,000.')
  num('maxReferralsPerUser', 1, 100, 'Limit must be 1–100.')
  num('rewardExpiryDays', 1, 365, 'Expiry must be 1–365 days.')
  return e
}

export function campaignAnalytics(campaign, usage, orders) {
  const codes = new Set(campaign.couponCodes ?? [])
  const rows = usage.filter((u) => codes.has(u.code) && !u.cancelled)
  const ids = new Set(rows.map((r) => r.orderId))
  const used = orders.filter((o) => ids.has(o.id))
  const savings = rows.reduce((s, r) => s + r.savings, 0)
  const revenue = rows.reduce((s, r) => s + r.orderTotal, 0)
  return {
    redemptions: rows.length,
    savings,
    revenue,
    avgOrderValue: rows.length ? Math.round(revenue / rows.length) : 0,
    discountRate: revenue ? savings / revenue : 0,
    delivered: used.filter((o) => !o.cancelled && o.statusIndex >= 4).length,
  }
}
