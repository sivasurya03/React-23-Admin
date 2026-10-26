// Pure pricing + coupon logic. No React imports so it can be unit-tested in Node.
//
// RULES (also documented in the README):
//   subtotal      = Σ (unit price × quantity)
//   discount      = coupon discount, applied to the food subtotal only, capped so it can
//                   never exceed the subtotal
//   delivery fee  = restaurant fee. Waived when subtotal >= FREE_DELIVERY_THRESHOLD,
//                   when the FREEDEL coupon is active, or for demo Craveo Plus members
//   platform fee  = flat ₹5 per order
//   GST           = 5% of (subtotal − discount), rounded to the nearest rupee
//   total         = max(0, subtotal − discount + delivery + platform fee + GST)

import { getRuntimeConfig } from './runtimeConfig.js'

// Defaults. The live values come from runtimeConfig (editable by admins in Settings).
export const FREE_DELIVERY_THRESHOLD = 399
export const PLATFORM_FEE = 5
export const GST_RATE = 0.05

export const COUPONS = {
  WELCOME10: {
    code: 'WELCOME10',
    title: '10% off your order',
    description: '10% off the food subtotal, up to ₹100. Minimum order ₹199.',
    type: 'percent',
    value: 10,
    maxDiscount: 100,
    minSubtotal: 199,
  },
  CRAVEO50: {
    code: 'CRAVEO50',
    title: '₹50 off',
    description: 'Flat ₹50 off the food subtotal. Minimum order ₹299.',
    type: 'flat',
    value: 50,
    minSubtotal: 299,
  },
  FREEDEL: {
    code: 'FREEDEL',
    title: 'Free delivery',
    description: 'Delivery fee waived. Minimum order ₹149.',
    type: 'freeDelivery',
    minSubtotal: 149,
  },
  SUMMER25: {
    code: 'SUMMER25',
    title: '25% off (expired)',
    description: 'Seasonal offer — expired.',
    type: 'percent',
    value: 25,
    maxDiscount: 150,
    minSubtotal: 249,
    expiresAt: '2025-08-31T23:59:59',
  },
}

const money = (n) => `₹${Math.round(n)}`

// Admin-managed coupons. When the Admin store has loaded it publishes the full coupon table here
// (built-ins included) so the cart, checkout and admin panel share ONE validation path.
let runtimeCoupons = null
let usageLookup = () => 0

export function setRuntimeCoupons(table) {
  runtimeCoupons = table && typeof table === 'object' ? table : null
}
export function setCouponUsageLookup(fn) {
  usageLookup = typeof fn === 'function' ? fn : () => 0
}
export function getCouponTable() {
  return runtimeCoupons ?? COUPONS
}

export function normalizeCode(code) {
  return String(code ?? '').trim().toUpperCase()
}

/** Returns { ok, coupon } or { ok:false, reason }. Never throws. */
export function validateCoupon(code, subtotal, now = new Date()) {
  const normalized = normalizeCode(code)
  if (!normalized) return { ok: false, reason: 'Enter a coupon code to apply it.' }
  const coupon = getCouponTable()[normalized]
  if (!coupon) return { ok: false, reason: `"${normalized}" isn't a valid coupon code.` }
  if (coupon.active === false) return { ok: false, reason: `${coupon.code} is not active right now.` }
  if (coupon.startsAt && new Date(coupon.startsAt).getTime() > now.getTime()) {
    return { ok: false, reason: `${coupon.code} isn't live yet.` }
  }
  if (coupon.usageLimit && usageLookup(coupon.code) >= coupon.usageLimit) {
    return { ok: false, reason: `${coupon.code} has reached its usage limit.` }
  }
  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < now.getTime()) {
    return { ok: false, reason: `${coupon.code} has expired.` }
  }
  if (subtotal < coupon.minSubtotal) {
    return {
      ok: false,
      reason: `${coupon.code} needs a minimum order of ${money(coupon.minSubtotal)}. Add ${money(coupon.minSubtotal - subtotal)} more.`,
    }
  }
  return { ok: true, coupon }
}

export function computeDiscount(coupon, subtotal) {
  if (!coupon || subtotal <= 0) return 0
  let amount = 0
  if (coupon.type === 'percent') {
    amount = Math.floor((subtotal * coupon.value) / 100)
    if (coupon.maxDiscount) amount = Math.min(amount, coupon.maxDiscount)
  } else if (coupon.type === 'flat') {
    amount = coupon.value
  }
  return Math.max(0, Math.min(amount, subtotal))
}

export function unitPriceFor(basePrice, selections = []) {
  const extras = selections.reduce((sum, s) => sum + (Number(s.price) || 0), 0)
  return Math.max(0, (Number(basePrice) || 0) + extras)
}

/** Stable key so the same dish with different options/instructions never merges. */
export function makeCartKey(itemId, selections = [], instructions = '') {
  const optionKey = selections
    .map((s) => `${s.groupId}:${s.optionId}`)
    .sort()
    .join('|')
  const note = String(instructions || '').trim().toLowerCase().replace(/\s+/g, ' ')
  return `${itemId}::${optionKey}::${note}`
}

export function calculateTotals({ items = [], deliveryFee = 0, couponCode = null, isPlus = false, now = new Date() }) {
  const rules = getRuntimeConfig()
  const safeItems = Array.isArray(items) ? items : []
  const subtotal = safeItems.reduce((sum, i) => sum + (Number(i.unitPrice) || 0) * (Number(i.quantity) || 0), 0)
  const itemCount = safeItems.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0)

  if (itemCount === 0) {
    return {
      subtotal: 0, discount: 0, deliveryFee: 0, deliveryFeeBase: 0, platformFee: 0, gst: 0, total: 0,
      itemCount: 0, couponStatus: null, couponMessage: '', freeDeliveryThreshold: getRuntimeConfig().freeDeliveryThreshold,
      freeDeliveryRemaining: getRuntimeConfig().freeDeliveryThreshold, deliveryWaivedBy: null,
    }
  }

  let coupon = null
  let couponStatus = null
  let couponMessage = ''
  if (couponCode) {
    const result = validateCoupon(couponCode, subtotal, now)
    if (result.ok) {
      coupon = result.coupon
      couponStatus = 'applied'
    } else {
      couponStatus = 'ineligible'
      couponMessage = result.reason
    }
  }

  const discount = computeDiscount(coupon, subtotal)
  const baseFee = Math.max(0, Number(deliveryFee) || 0)
  let deliveryWaivedBy = null
  if (baseFee > 0) {
    if (subtotal >= rules.freeDeliveryThreshold) deliveryWaivedBy = 'threshold'
    else if (coupon?.type === 'freeDelivery') deliveryWaivedBy = 'coupon'
    else if (isPlus) deliveryWaivedBy = 'plus'
  }
  const appliedDelivery = deliveryWaivedBy ? 0 : baseFee
  const platformFee = rules.platformFee
  const gst = Math.round(Math.max(0, subtotal - discount) * rules.gstRate)
  const total = Math.max(0, subtotal - discount + appliedDelivery + platformFee + gst)

  return {
    subtotal,
    discount,
    deliveryFee: appliedDelivery,
    deliveryFeeBase: baseFee,
    platformFee,
    gst,
    total,
    itemCount,
    couponStatus,
    couponMessage,
    appliedCoupon: coupon,
    freeDeliveryThreshold: rules.freeDeliveryThreshold,
    freeDeliveryRemaining: Math.max(0, rules.freeDeliveryThreshold - subtotal),
    deliveryWaivedBy,
  }
}
