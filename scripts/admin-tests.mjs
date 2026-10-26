// Node-only tests for the Admin panel's pure logic. Run with: npm run test:admin
import assert from 'node:assert/strict'
import { advance, cancel, createRefund, reviewRefund, paymentStatusOf, assignPartner, orderCategory, matchesTab } from '../src/admin/lib/orders.js'
import { orderFinancials, commissionOf, financeSummary, buildSettlement, buildPayout, markPaid, settlementAdjustments, rateFor } from '../src/admin/lib/finance.js'
import { resolveRange, filterByRange, summarize, peakHours, topItems, growth, seriesByBucket } from '../src/admin/lib/analytics.js'
import { validateCouponDraft, normalizeCouponDraft, buildCouponTable, couponStatus, deriveCouponUsage } from '../src/admin/lib/coupons.js'
import { can, normalizeMatrix, DEFAULT_MATRIX, moduleForPath } from '../src/admin/lib/rbac.js'
import { buildCatalog, normalizeOverlay } from '../src/admin/lib/catalog.js'
import { validateRestaurant, validateMenuItem, validatePartner, validateCommission, validateSettings } from '../src/admin/lib/validators.js'
import { changeStatus, resolveDispute, openDispute } from '../src/admin/lib/support.js'
import { toCsv, escapeCell } from '../src/admin/lib/csv.js'
import { queryRows } from '../src/admin/lib/table.js'
import { partnerMetrics } from '../src/admin/lib/partners.js'
import { validateStatusChange } from '../src/admin/lib/customers.js'
import { sanitizeState, applyRuntimeFromState } from '../src/admin/store/adminStore.js'
import { createInitialState } from '../src/admin/store/seed.js'
import { createActions } from '../src/admin/store/actions.js'
import { DEMO_ADMIN_ACCOUNTS } from '../src/admin/store/adminAccounts.js'
import { hashPassword, sha256Hex, verifyPassword } from '../src/utils/passwordHash.js'
import { createHash } from 'node:crypto'
import { DEMO_CREDENTIALS } from '../src/admin/store/demoCredentials.js'
import { calculateTotals, validateCoupon, setRuntimeCoupons, setCouponUsageLookup } from '../src/utils/pricing.js'
import { applyRuntimeConfig, resetRuntimeConfig } from '../src/utils/runtimeConfig.js'
import { restaurants as baseRestaurants } from '../src/data/restaurants.js'
import { applyCatalogOverlay, restaurants as liveRestaurants, getMenuItem } from '../src/data/index.js'

let passed = 0
const queue = []
const test = (name, fn) => queue.push([name, fn])
const NOW = new Date('2026-10-23T12:00:00')

const mkOrder = (over = {}) => ({
  id: 'CRV-T1', createdAt: '2026-10-23T09:00:00.000Z', statusIndex: 0, statusHistory: [{ index: 0, at: '2026-10-23T09:00:00.000Z' }],
  restaurant: { id: 'r1', name: 'R1' }, items: [{ itemId: 'a', name: 'A', quantity: 2, unitPrice: 200 }],
  totals: { subtotal: 400, discount: 40, deliveryFee: 30, platformFee: 5, gst: 18, total: 413 }, payment: { method: 'upi', label: 'UPI' },
  customer: { name: 'Test', email: 't@x.in' }, ...over,
})

// ---- orders
test('valid forward transition appends history; no skipping', () => {
  const r = advance(mkOrder(), { now: NOW })
  assert.ok(r.ok); assert.equal(r.order.statusIndex, 1); assert.equal(r.order.statusHistory.length, 2)
})
test('picked-up requires an assigned partner', () => {
  const o = mkOrder({ statusIndex: 2 })
  assert.equal(advance(o).ok, false)
  assert.ok(advance({ ...o, partnerId: 'dp-1' }).ok)
})
test('cancelled and delivered orders cannot advance', () => {
  assert.equal(advance(mkOrder({ cancelled: { at: 'x', reason: 'r', by: 'a' } })).ok, false)
  assert.equal(advance(mkOrder({ statusIndex: 4 })).ok, false)
})
test('cancellation needs a reason and creates a refund request for prepaid orders', () => {
  assert.equal(cancel(mkOrder(), { reason: 'no' }).ok, false)
  const r = cancel(mkOrder(), { reason: 'Restaurant closed', now: NOW })
  assert.ok(r.ok && r.refundCreated); assert.equal(r.order.refund.status, 'requested'); assert.equal(r.order.refund.amount, 413)
  const cod = cancel(mkOrder({ payment: { method: 'cod' } }), { reason: 'Customer asked' })
  assert.ok(cod.ok && !cod.refundCreated && !cod.order.refund)
})
test('delivered orders cannot be cancelled', () => assert.equal(cancel(mkOrder({ statusIndex: 4 }), { reason: 'too late now' }).ok, false))
test('refund validation: eligibility, amount, reason, duplicates', () => {
  assert.equal(createRefund(mkOrder(), { reason: 'cold food' }).ok, false)
  const d = mkOrder({ statusIndex: 4, statusHistory: [{ index: 4, at: NOW.toISOString() }] })
  assert.equal(createRefund(d, { reason: 'x' }).ok, false)
  assert.equal(createRefund(d, { reason: 'cold food', amount: 9999 }).ok, false)
  assert.equal(createRefund(d, { reason: 'cold food', amount: 0 }).ok, false)
  const ok = createRefund(d, { reason: 'cold food', amount: 100, now: NOW })
  assert.ok(ok.ok); assert.equal(ok.order.refund.simulated, true)
  assert.equal(createRefund(ok.order, { reason: 'again please' }).ok, false)
})
test('customer refund window is enforced', () => {
  const old = mkOrder({ statusIndex: 4, statusHistory: [{ index: 4, at: '2026-09-01T00:00:00.000Z' }] })
  assert.equal(createRefund(old, { reason: 'too late?', requestedBy: 'customer', now: NOW, windowDays: 7 }).ok, false)
  assert.ok(createRefund(old, { reason: 'admin override', requestedBy: 'admin', now: NOW, windowDays: 7 }).ok)
})
test('refund review needs a reason; approve/reject updates status; payment becomes refunded', () => {
  const d = mkOrder({ statusIndex: 4, statusHistory: [{ index: 4, at: NOW.toISOString() }] })
  const req = createRefund(d, { reason: 'cold food', now: NOW }).order
  assert.equal(reviewRefund(req, { decision: 'approve', note: '' }).ok, false)
  const approved = reviewRefund(req, { decision: 'approve', note: 'Verified with kitchen' }).order
  assert.equal(approved.refund.status, 'approved'); assert.equal(paymentStatusOf(approved), 'refunded')
  assert.equal(reviewRefund(approved, { decision: 'reject', note: 'changed my mind' }).ok, false)
  assert.equal(reviewRefund(req, { decision: 'reject', note: 'Photo mismatch' }).order.refund.status, 'rejected')
})
test('payment status derivation', () => {
  assert.equal(paymentStatusOf(mkOrder()), 'success')
  assert.equal(paymentStatusOf(mkOrder({ payment: { method: 'cod' } })), 'pending')
  assert.equal(paymentStatusOf(mkOrder({ payment: { method: 'cod' }, statusIndex: 4 })), 'success')
  assert.equal(paymentStatusOf(mkOrder({ payment: { method: 'upi', status: 'failed' } })), 'failed')
})
test('tab categories', () => {
  assert.equal(orderCategory(mkOrder()), 'pending'); assert.equal(orderCategory(mkOrder({ statusIndex: 2 })), 'confirmed')
  assert.equal(orderCategory(mkOrder({ statusIndex: 3 })), 'active'); assert.equal(orderCategory(mkOrder({ statusIndex: 4 })), 'delivered')
  assert.ok(matchesTab(mkOrder({ refund: { status: 'requested' } }), 'refunds'))
})

// ---- partner assignment
const partner = { id: 'dp-1', name: 'P', vehicle: 'Bike', plate: 'TN 38 AB 1', verification: 'approved', online: true, active: true, rating: 4.5 }
test('assignment rejects unverified, offline, inactive, overloaded and closed orders', () => {
  const o = mkOrder()
  assert.equal(assignPartner(o, { ...partner, verification: 'pending' }).ok, false)
  assert.equal(assignPartner(o, { ...partner, online: false }).ok, false)
  assert.equal(assignPartner(o, { ...partner, active: false }).ok, false)
  assert.equal(assignPartner(o, null).ok, false)
  assert.equal(assignPartner(mkOrder({ statusIndex: 4 }), partner).ok, false)
  const busy = [mkOrder({ id: 'a', partnerId: 'dp-1' }), mkOrder({ id: 'b', partnerId: 'dp-1' })]
  assert.equal(assignPartner(o, partner, { orders: busy, maxActive: 2 }).ok, false)
  const ok = assignPartner(o, partner, { orders: [], maxActive: 2 })
  assert.ok(ok.ok && ok.order.partnerId === 'dp-1' && ok.order.partner.name === 'P')
  assert.equal(assignPartner(ok.order, partner).ok, false)
})
test('partner metrics', () => {
  const del = (id) => mkOrder({ id, partnerId: 'dp-1', statusIndex: 4, statusHistory: [{ index: 3, at: '2026-10-23T09:10:00.000Z' }, { index: 4, at: '2026-10-23T09:30:00.000Z' }] })
  const m = partnerMetrics('dp-1', [del('a'), del('b'), mkOrder({ id: 'c', partnerId: 'dp-1', cancelled: { at: 'x' } }), mkOrder({ id: 'd', partnerId: 'dp-1', statusIndex: 3 })], 30)
  assert.equal(m.completed, 2); assert.equal(m.cancelled, 1); assert.equal(m.active.length, 1)
  assert.equal(m.earnings, 60); assert.equal(m.avgDeliveryMinutes, 20); assert.equal(Math.round(m.cancellationRate * 100), 33)
})

// ---- finance
test('commission maths and the total identity', () => {
  assert.equal(commissionOf(360, 15), 54)
  const f = orderFinancials(mkOrder(), { rate: 15, payoutPerDelivery: 30 })
  assert.equal(f.foodNet, 360); assert.equal(f.commission, 54); assert.equal(f.restaurantPayable, 306)
  assert.equal(f.restaurantPayable + f.commission + f.deliveryCollected + f.platformFee + f.tax, f.total)
  assert.equal(f.platformNet, 54 + 5 + 0)
})
test('commission rate precedence: snapshot > restaurant > default', () => {
  const o = mkOrder()
  assert.equal(rateFor(o, { snapshots: { 'CRV-T1': 10 }, restaurantRates: { r1: 20 }, defaultRate: 15 }), 10)
  assert.equal(rateFor(o, { snapshots: {}, restaurantRates: { r1: 20 }, defaultRate: 15 }), 20)
  assert.equal(rateFor(o, { snapshots: {}, restaurantRates: {}, defaultRate: 15 }), 15)
})
const ctx = { snapshots: {}, restaurantRates: {}, defaultRate: 15, payoutPerDelivery: 30 }
const delivered = (id, extra = {}) => mkOrder({ id, statusIndex: 4, partnerId: 'dp-1', ...extra })
test('finance summary excludes cancelled orders and subtracts approved refunds', () => {
  const orders = [delivered('a'), delivered('b', { refund: { status: 'approved', amount: 100 } }), mkOrder({ id: 'c', cancelled: { at: 'x' } })]
  const s = financeSummary(orders, ctx)
  assert.equal(s.gmv, 826); assert.equal(s.refunded, 100); assert.equal(s.netRevenue, 726); assert.equal(s.recognisedCount, 1)
})
test('settlements: only delivered, no refunds, no duplicates', () => {
  const orders = [delivered('a'), delivered('b', { refund: { status: 'approved', amount: 10 } }), mkOrder({ id: 'c' })]
  const first = buildSettlement({ orders, restaurantId: 'r1', restaurantName: 'R1', settlements: [], ctx, now: NOW })
  assert.ok(first.ok); assert.deepEqual(first.record.orderIds, ['a']); assert.equal(first.record.net, 306)
  const dup = buildSettlement({ orders, restaurantId: 'r1', restaurantName: 'R1', settlements: [first.record], ctx, now: NOW })
  assert.equal(dup.ok, false)
  assert.equal(buildSettlement({ orders, restaurantId: 'other', restaurantName: 'x', settlements: [], ctx }).ok, false)
})
test('payouts: no duplicates and flat amount; paid cannot be re-paid', () => {
  const orders = [delivered('a'), delivered('b')]
  const p = buildPayout({ orders, partnerId: 'dp-1', partnerName: 'P', payouts: [], ctx, now: NOW })
  assert.equal(p.record.amount, 60)
  assert.equal(buildPayout({ orders, partnerId: 'dp-1', partnerName: 'P', payouts: [p.record], ctx }).ok, false)
  const paid = markPaid(p.record, NOW)
  assert.equal(paid.record.status, 'paid'); assert.equal(markPaid(paid.record).ok, false)
})
test('refund after settlement is flagged for adjustment', () => {
  const s = buildSettlement({ orders: [delivered('a')], restaurantId: 'r1', restaurantName: 'R1', settlements: [], ctx }).record
  assert.equal(settlementAdjustments([delivered('a', { refund: { status: 'approved', amount: 5 } })], [s]).length, 1)
})

// ---- analytics
const dayOrders = [mkOrder({ id: '1', createdAt: new Date(2026, 9, 23, 13, 5).toISOString() }), mkOrder({ id: '2', createdAt: new Date(2026, 9, 23, 13, 40).toISOString() }), mkOrder({ id: '3', createdAt: new Date(2026, 9, 22, 20, 0).toISOString(), cancelled: { at: 'x' } }), mkOrder({ id: '4', createdAt: new Date(2026, 8, 1, 12, 0).toISOString() })]
test('date ranges: presets, custom, invalid', () => {
  assert.equal(filterByRange(dayOrders, resolveRange({ preset: '7d' }, NOW)).length, 3)
  assert.equal(filterByRange(dayOrders, resolveRange({ preset: 'all' }, NOW)).length, 4)
  assert.equal(filterByRange(dayOrders, resolveRange({ preset: 'custom', from: '2026-10-23', to: '2026-10-23' }, NOW)).length, 2)
  assert.ok(resolveRange({ preset: 'custom', from: '2026-10-25', to: '2026-10-23' }, NOW).error)
  assert.ok(resolveRange({ preset: 'custom', from: '', to: '' }, NOW).error)
})
test('summary, peak hours and top items come from the data', () => {
  const s = summarize(dayOrders); assert.equal(s.orders, 4); assert.equal(s.cancelled, 1)
  assert.equal(peakHours(dayOrders)[13].orders, 2); assert.equal(topItems(dayOrders, 1)[0].quantity, 6)
})
test('growth compares with the previous equal period and is null without history', () => {
  const g = growth(dayOrders, resolveRange({ preset: 'today' }, NOW))
  assert.ok(g === null || typeof g.orders.pct === 'number' || g.orders.pct === null)
  assert.equal(growth(dayOrders, resolveRange({ preset: 'all' }, NOW)), null)
})
test('series are zero-filled', () => {
  const s = seriesByBucket(dayOrders, 'day', resolveRange({ preset: '7d' }, NOW))
  assert.equal(s.length, 7); assert.equal(s.at(-1).orders, 2)
})

// ---- coupons
const draft = { code: 'SAVE20', title: 'Save', type: 'percent', value: '20', minSubtotal: '100', maxDiscount: '80' }
test('coupon form validation rejects invalid, duplicate and out-of-range', () => {
  assert.deepEqual(validateCouponDraft(draft), {})
  assert.ok(validateCouponDraft({ ...draft, code: 'a b' }).code)
  assert.ok(validateCouponDraft({ ...draft, value: '150' }).value)
  assert.ok(validateCouponDraft({ ...draft, value: '0' }).value)
  assert.ok(validateCouponDraft({ ...draft, type: 'flat', value: '500', minSubtotal: '100' }).minSubtotal)
  assert.ok(validateCouponDraft({ ...draft, type: 'flat', maxDiscount: '50', value: '10' }).maxDiscount)
  assert.ok(validateCouponDraft(draft, { existing: [{ code: 'save20' }] }).code)
  assert.deepEqual(validateCouponDraft(draft, { existing: [{ code: 'SAVE20' }], editingCode: 'SAVE20' }), {})
  assert.ok(validateCouponDraft({ ...draft, startsAt: '2026-11-02T10:00', expiresAt: '2026-11-01T10:00' }).expiresAt)
  assert.ok(validateCouponDraft({ ...draft, usageLimit: '0' }).usageLimit)
})
test('admin coupons are validated by the SAME cart logic (expired, inactive, scheduled, limit, min order)', () => {
  const c = (extra) => normalizeCouponDraft({ ...draft, ...extra })
  const table = buildCouponTable([c({}), c({ code: 'OLDONE', expiresAt: '2020-01-01T00:00' }), c({ code: 'OFFONE', active: false }), c({ code: 'SOONER', startsAt: '2030-01-01T00:00' }), c({ code: 'LIMITED', usageLimit: '2' })])
  setRuntimeCoupons(table); setCouponUsageLookup((code) => (code === 'LIMITED' ? 2 : 0))
  assert.equal(validateCoupon('SAVE20', 500, NOW).ok, true)
  assert.equal(validateCoupon('SAVE20', 50, NOW).ok, false)
  assert.equal(validateCoupon('OLDONE', 500, NOW).ok, false)
  assert.match(validateCoupon('OFFONE', 500, NOW).reason, /not active/)
  assert.match(validateCoupon('SOONER', 500, NOW).reason, /isn't live/)
  assert.match(validateCoupon('LIMITED', 500, NOW).reason, /usage limit/)
  assert.equal(validateCoupon('NOPE', 500, NOW).ok, false)
  const t = calculateTotals({ items: [{ unitPrice: 500, quantity: 1 }], deliveryFee: 30, couponCode: 'SAVE20', now: NOW })
  assert.equal(t.discount, 80) // 20% of 500 = 100, capped at 80
  setRuntimeCoupons(null); setCouponUsageLookup(null)
})
test('coupon status + derived usage records', () => {
  assert.equal(couponStatus({ active: true, usageLimit: 1 }, NOW, 1), 'exhausted')
  assert.equal(couponStatus({ active: true, expiresAt: '2020-01-01' }, NOW), 'expired')
  const u = deriveCouponUsage([mkOrder({ couponCode: 'SAVE20', totals: { ...mkOrder().totals, discount: 40 } }), mkOrder({ id: 'x' })])
  assert.equal(u.length, 1); assert.equal(u[0].savings, 40)
})
test('runtime pricing rules apply to new totals only', () => {
  applyRuntimeConfig({ platformFee: 9, gstRate: 0.1, freeDeliveryThreshold: 100 })
  const t = calculateTotals({ items: [{ unitPrice: 200, quantity: 1 }], deliveryFee: 30 })
  assert.equal(t.platformFee, 9); assert.equal(t.gst, 20); assert.equal(t.deliveryFee, 0)
  applyRuntimeConfig({ platformFee: -5, gstRate: 'abc' }); assert.equal(calculateTotals({ items: [{ unitPrice: 200, quantity: 1 }], deliveryFee: 30 }).platformFee, 9)
  resetRuntimeConfig()
  assert.equal(calculateTotals({ items: [{ unitPrice: 200, quantity: 1 }], deliveryFee: 30 }).platformFee, 5)
})

// ---- rbac
test('RBAC: least privilege defaults', () => {
  const m = normalizeMatrix(DEFAULT_MATRIX)
  assert.ok(can(m, 'super_admin', 'roles', 'delete'))
  assert.ok(!can(m, 'support', 'finance', 'view')); assert.ok(!can(m, 'restaurant_manager', 'orders', 'edit'))
  assert.ok(can(m, 'finance', 'orders', 'refund')); assert.ok(!can(m, 'operations', 'orders', 'refund'))
  assert.ok(!can(m, 'operations', 'roles', 'view')); assert.ok(!can(m, 'finance', 'audit', 'view'))
  assert.ok(!can(m, 'nobody', 'orders', 'view')); assert.ok(!can(null, 'operations', 'orders', 'view'))
})
test('RBAC: corrupt matrices are repaired and super admin stays full', () => {
  const m = normalizeMatrix({ support: { orders: ['hack', 'view'] }, super_admin: { orders: [] }, ghost: {} })
  assert.deepEqual(m.support.orders, ['view']); assert.ok(can(m, 'super_admin', 'audit', 'delete')); assert.equal(m.ghost, undefined)
})
test('route → module mapping', () => {
  assert.equal(moduleForPath('/admin/finance'), 'finance'); assert.equal(moduleForPath('/admin/orders/x'), 'orders')
  assert.equal(moduleForPath('/admin'), 'dashboard'); assert.equal(moduleForPath('/admin/audit-logs'), 'audit')
})

// ---- catalog overlay
test('catalog overlay hides, edits, adds and deletes without mutating the base', () => {
  const base = baseRestaurants[0]; const dish = base.items[0]
  const overlay = { restaurants: { [base.id]: { active: false } }, items: { [dish.id]: { price: 999, available: false } }, customItems: [], deletedItems: [base.items[1].id], customRestaurants: [{ id: 'new-r', name: 'New R', primaryCuisine: 'pizza', status: 'x', application: { status: 'pending' } }], deletedRestaurants: [baseRestaurants[1].id], extraCategories: {} }
  const { all, publicList } = buildCatalog(baseRestaurants, overlay)
  assert.equal(all.length, baseRestaurants.length)           // +1 custom −1 deleted
  assert.ok(!publicList.find((r) => r.id === base.id)); assert.ok(!publicList.find((r) => r.id === 'new-r')) // inactive + pending
  const edited = all.find((r) => r.id === base.id).items.find((i) => i.id === dish.id)
  assert.equal(edited.price, 999); assert.equal(edited.available, false)
  assert.ok(!all.find((r) => r.id === base.id).items.find((i) => i.id === base.items[1].id))
  assert.equal(dish.price === 999, false) // base untouched
})
test('approved custom restaurant is public; sold-out items stay listed', () => {
  const { publicList } = buildCatalog(baseRestaurants, { customRestaurants: [{ id: 'new-r', name: 'New R', primaryCuisine: 'pizza', application: { status: 'pending' } }], restaurants: { 'new-r': { status: 'approved' } }, customItems: [{ id: 'new-r-dish', restaurantId: 'new-r', name: 'Dish', price: 120, category: 'Mains' }] })
  const r = publicList.find((x) => x.id === 'new-r'); assert.ok(r); assert.equal(r.menu[0].items[0].price, 120); assert.equal(r.items[0].available, true)
})
test('live customer catalog follows the overlay', () => {
  const id = baseRestaurants[0].id
  applyCatalogOverlay({ restaurants: { [id]: { active: false } } })
  assert.ok(!liveRestaurants.find((r) => r.id === id))
  applyCatalogOverlay({ items: { [baseRestaurants[2].items[0].id]: { available: false } } })
  assert.equal(getMenuItem(baseRestaurants[2].id, baseRestaurants[2].items[0].id).available, false)
  applyCatalogOverlay({}); assert.equal(liveRestaurants.length, baseRestaurants.length)
})
test('malformed overlay never throws', () => {
  for (const bad of [null, 5, 'x', [], { restaurants: 7, customItems: 'no', deletedItems: [1, 2] }]) assert.ok(Array.isArray(buildCatalog(baseRestaurants, bad).all))
  assert.deepEqual(normalizeOverlay(undefined).deletedItems, [])
})

// ---- validators
const goodRestaurant = { name: 'Tandoor House', primaryCuisine: 'pizza', ownerName: 'Asha', phone: '9876543210', email: 'a@b.in', area: 'RS Puram', address: '12 Main Road, RS Puram', deliveryTime: '30', deliveryFee: '30', costForTwo: '500', priceLevel: '2', about: '', hours: [{ day: 'Daily', hours: '10–10' }] }
test('restaurant, item, partner, commission and settings validation', () => {
  assert.deepEqual(validateRestaurant(goodRestaurant), {})
  assert.ok(validateRestaurant({ ...goodRestaurant, phone: '123' }).phone); assert.ok(validateRestaurant({ ...goodRestaurant, email: 'bad' }).email)
  assert.ok(validateRestaurant({ ...goodRestaurant, name: 'x' }).name); assert.ok(validateRestaurant({ ...goodRestaurant, name: 'tandoor house' }, { existingNames: ['Tandoor House'] }).name)
  assert.ok(validateRestaurant({ ...goodRestaurant, commissionRate: '55' }).commissionRate); assert.ok(validateRestaurant({ ...goodRestaurant, hours: [{ day: '', hours: '' }] })['hours.0'])
  assert.equal(validateCommission('12.5').value, 12.5); assert.equal(validateCommission('').value, null); assert.equal(validateCommission('12.3').ok, false); assert.equal(validateCommission('-1').ok, false)
  const item = { restaurantId: 'r', name: 'Dish', category: 'Mains', price: '100', options: [] }
  assert.deepEqual(validateMenuItem(item), {}); assert.ok(validateMenuItem({ ...item, price: '0' }).price); assert.ok(validateMenuItem({ ...item, price: '10.5' }).price)
  assert.ok(validateMenuItem({ ...item, originalPrice: '50' }).originalPrice); assert.ok(validateMenuItem({ ...item, image: 'javascript:alert(1)' }).image)
  assert.ok(validateMenuItem(item, { siblings: [{ id: 'z', name: 'dish' }] }).name); assert.ok(validateMenuItem({ ...item, options: [{ title: '', options: [] }] }).options)
  assert.deepEqual(validatePartner({ name: 'Ravi', phone: '9876500000', vehicle: 'Bike', plate: 'TN 38 AB 1234' }), {})
  assert.ok(validatePartner({ name: 'Ravi', phone: '9876500000', vehicle: 'Car', plate: 'TN 38 AB 1234' }).vehicle); assert.ok(validatePartner({ name: 'R', phone: '1', vehicle: 'Bike', plate: '??' }).plate)
  assert.ok(validatePartner({ name: 'Ravi', phone: '9876500000', vehicle: 'Bike', plate: 'TN 38 AB 1234' }, { existing: [{ id: 'q', phone: '9876500000' }] }).phone)
  const s = createInitialState(NOW.getTime()).settings
  assert.deepEqual(validateSettings({ ...s, gstPercent: 5 }), {}); assert.ok(validateSettings({ ...s, gstPercent: 90 }).gstPercent); assert.ok(validateSettings({ ...s, platformName: '' }).platformName)
})
test('support transitions and dispute rules', () => {
  const t = { id: 'TK-1', status: 'open', messages: [], dispute: null }
  assert.ok(changeStatus(t, 'in_progress').ok); assert.equal(changeStatus({ ...t, status: 'closed' }, 'resolved').ok, false); assert.equal(changeStatus(t, 'open').ok, false)
  const d = openDispute(t).ticket
  assert.equal(changeStatus(d, 'resolved').ok, false); assert.equal(resolveDispute(d, 'short').ok, false)
  const r = resolveDispute(d, 'Refund approved, restaurant warned'); assert.ok(r.ok); assert.equal(r.ticket.status, 'resolved'); assert.ok(changeStatus(r.ticket, 'closed').ok)
})
test('customer status change needs a reason to suspend', () => { assert.ok(validateStatusChange('suspended', '')); assert.equal(validateStatusChange('active', ''), ''); assert.ok(validateStatusChange('weird', 'xxxxx')) })
test('csv export escapes quotes and blocks formula injection', () => {
  assert.equal(escapeCell('a,"b"'), '"a,""b"""'); assert.equal(escapeCell('=SUM(A1)'), "'=SUM(A1)"); assert.equal(escapeCell(-5), '-5'); assert.equal(escapeCell(null), '')
  assert.equal(toCsv([{ a: 1, b: '+x' }], [{ label: 'A', value: (r) => r.a }, { label: 'B', value: (r) => r.b }]), "A,B\r\n1,'+x")
})
test('table helper: search, filter, sort and pagination clamp', () => {
  const rows = Array.from({ length: 25 }, (_, i) => ({ n: `item ${i}`, v: i % 2 }))
  const r = queryRows(rows, { search: 'item 1', searchKeys: ['n'], page: 99, pageSize: 5 })
  assert.equal(r.total, 11); assert.equal(r.page, 3); assert.equal(queryRows(rows, { filters: { v: '1' } }).total, 12)
  assert.equal(queryRows(rows, { sortKey: 'n', sortDir: 'desc' }).rows[0].n, 'item 24')
})

// ---- storage repair + demo data + auth hashing
test('stored admin state is repaired, never crashes, and keeps a super admin', () => {
  for (const bad of [null, 'x', 5, [], { demoOrders: 'no', adminUsers: [{ id: 1 }], settings: 7, matrix: 'x' }, { demoOrders: [{ id: 'a' }, null] }]) {
    const s = sanitizeState(bad, NOW.getTime())
    assert.ok(Array.isArray(s.demoOrders) && s.settings.platformName && s.adminUsers.some((u) => u.role === 'super_admin' && u.active !== false))
  }
  const s = sanitizeState({ settings: { gstPercent: 12 }, demoOrders: [] }, NOW.getTime()); assert.equal(s.settings.gstPercent, 12); assert.equal(s.demoOrders.length, 0)
})
test('demo seed is deterministic, flagged as demo, and internally consistent', () => {
  const a = createInitialState(NOW.getTime()), b = createInitialState(NOW.getTime())
  assert.deepEqual(a.demoOrders.map((o) => o.id), b.demoOrders.map((o) => o.id))
  assert.ok(a.demoOrders.every((o) => o.demo === true && o.id.startsWith('CRV-DM')))
  assert.equal(new Set(a.demoOrders.map((o) => o.id)).size, a.demoOrders.length)
  for (const o of a.demoOrders) { const f = orderFinancials(o, { rate: 15, payoutPerDelivery: 30 }); assert.equal(f.restaurantPayable + f.commission + f.deliveryCollected + f.platformFee + f.tax, f.total, o.id) }
  assert.ok(a.partners.every((p) => p.demo) && a.tickets.every((t) => t.demo))
})
test('demo admin passwords are stored only as salted hashes and verify', async () => {
  const sup = DEMO_ADMIN_ACCOUNTS.find((a) => a.role === 'super_admin')
  assert.ok(!JSON.stringify(DEMO_ADMIN_ACCOUNTS).includes('Super@12345'))
  assert.equal(await hashPassword('Super@12345', sup.salt), sup.hash); assert.notEqual(await hashPassword('wrong', sup.salt), sup.hash)
})

test('every documented demo admin login verifies, wrong passwords and other emails do not', async () => {
  const docs = { 'super@craveo.demo': 'Super@12345', 'ops@craveo.demo': 'Ops@12345', 'restaurants@craveo.demo': 'Rest@12345', 'finance@craveo.demo': 'Fin@12345', 'support@craveo.demo': 'Sup@12345' }
  assert.equal(DEMO_ADMIN_ACCOUNTS.length, 5)
  for (const a of DEMO_ADMIN_ACCOUNTS) { assert.ok(await verifyPassword(docs[a.email], a.salt, a.hash), a.email); assert.equal(await verifyPassword('nope', a.salt, a.hash), false) }
  assert.deepEqual(DEMO_ADMIN_ACCOUNTS.map((a) => a.role).sort(), ['finance', 'operations', 'restaurant_manager', 'super_admin', 'support'])
})
test('one-click demo credentials match the accounts the login really accepts', async () => {
  assert.equal(DEMO_CREDENTIALS.length, 5)
  for (const c of DEMO_CREDENTIALS) {
    const acct = DEMO_ADMIN_ACCOUNTS.find((a) => a.email === c.email)
    assert.ok(acct, c.email); assert.equal(acct.role, c.role)
    assert.ok(await verifyPassword(c.password, acct.salt, acct.hash), `${c.email} password does not match its hash`)
  }
})
test('pure-JS SHA-256 fallback matches Web Crypto (plain-http pages still log in)', () => {
  for (const t of ['', 'abc', 'a1f4c9e07b3d5582:Super@12345', 'x'.repeat(200), 'ünïcode ✓']) assert.equal(sha256Hex(t), createHash('sha256').update(t).digest('hex'))
})

// ---- actions: permissions, audit, persistence of state transitions
function harness(role = 'super_admin') {
  let state = createInitialState(NOW.getTime()); const live = []
  const orders = () => [...live.map((o) => ({ ...o, source: 'live' })), ...state.demoOrders.map((o) => ({ ...o, source: 'demo' }))]
  const catalogRef = () => buildCatalog(baseRestaurants, state.overlay)
  const actions = createActions({ commit: (fn) => { const n = fn(state); if (n) state = n }, getState: () => state, getOrders: orders, getCatalog: catalogRef, getActor: () => (role ? { id: 'adm-x', name: 'Tester', role } : null), updateLiveOrder: (id, fn) => { const i = live.findIndex((o) => o.id === id); live[i] = fn(live[i]) } })
  return { actions, get state() { return state }, live }
}
test('actions: unauthenticated and unauthorised calls are refused and not audited', () => {
  const none = harness(null); assert.equal(none.actions.cancelOrder('x', 'reason here').ok, false)
  const sup = harness('support'); assert.equal(sup.actions.saveCoupon({ ...draft }).ok, false); assert.equal(sup.actions.deleteRestaurant('x').ok, false); assert.equal(sup.actions.setPermission('support', 'finance', 'view', true).ok, false)
  assert.equal(sup.state.audit.length, 0)
})
test('actions: order lifecycle on a demo order writes audit entries', () => {
  const h = harness('operations'); const o = h.state.demoOrders.find((x) => x.statusIndex === 0 && !x.cancelled)
  if (!o) return
  assert.ok(h.actions.advanceOrder(o.id).ok); assert.equal(h.state.demoOrders.find((x) => x.id === o.id).statusIndex, 1)
  const c = h.actions.cancelOrder(o.id, 'Kitchen closed'); assert.ok(c.ok); assert.ok(h.state.demoOrders.find((x) => x.id === o.id).cancelled)
  assert.equal(h.actions.advanceOrder(o.id).ok, false)
  assert.ok(h.state.audit.length >= 2); assert.equal(h.state.audit.at(-1).action, 'order.advance'); assert.equal(h.state.audit[0].before.status.length > 0, true)
  assert.equal(h.actions.reviewRefund(o.id, { decision: 'approve', note: 'fine with me' }).ok, false) // operations lacks refund permission
})
test('actions: restaurant approval requires verified documents; approval makes it public', () => {
  const h = harness(); const app = h.state.overlay.customRestaurants[0]
  assert.equal(h.actions.approveRestaurant(app.id).ok, false)
  for (const d of ['FSSAI licence', 'GST certificate', 'PAN card', 'Bank proof']) { h.actions.submitDocument(app.id, d, 'file.pdf'); assert.ok(h.actions.setDocumentStatus(app.id, d, 'verified').ok) }
  assert.ok(h.actions.approveRestaurant(app.id).ok)
  assert.ok(buildCatalog(baseRestaurants, h.state.overlay).publicList.find((r) => r.id === app.id))
  assert.ok(h.actions.setRestaurantActive(app.id, false).ok); assert.ok(!buildCatalog(baseRestaurants, h.state.overlay).publicList.find((r) => r.id === app.id))
})
test('actions: menu CRUD, availability, categories and duplicate protection', () => {
  const h = harness(); const r = baseRestaurants[0]
  const add = h.actions.saveItem({ restaurantId: r.id, name: 'Test Special', category: 'Specials', price: '149', options: [{ title: 'Size', type: 'single', required: true, options: [{ label: 'Small', price: '0' }, { label: 'Large', price: '40' }] }] })
  assert.ok(add.ok); assert.equal(h.actions.saveItem({ restaurantId: r.id, name: 'test special', category: 'Specials', price: '10' }).ok, false)
  const item = buildCatalog(baseRestaurants, h.state.overlay).all.find((x) => x.id === r.id).items.find((i) => i.id === add.id)
  assert.equal(item.options[0].options[1].price, 40)
  assert.ok(h.actions.setItemAvailable(add.id, false).ok); assert.ok(h.actions.saveItem({ restaurantId: r.id, name: 'Test Special', category: 'Specials', price: '159' }, add.id).ok)
  assert.equal(h.actions.deleteCategory(r.id, 'Specials').ok, false)
  assert.ok(h.actions.deleteItem(add.id).ok); assert.ok(h.actions.deleteItem(r.items[0].id).ok)
  assert.equal(h.actions.addCategory(r.id, 'X').ok, false); assert.ok(h.actions.addCategory(r.id, 'Brand new').ok); assert.ok(h.actions.deleteCategory(r.id, 'Brand new').ok)
})
test('actions: commission change is validated and audited with before/after', () => {
  const h = harness(); const id = baseRestaurants[0].id
  assert.equal(h.actions.setCommission(id, '80').ok, false); assert.ok(h.actions.setCommission(id, '12').ok)
  const a = h.state.audit[0]; assert.equal(a.action, 'restaurant.commission'); assert.equal(a.after.commissionRate, 12)
})
test('actions: partner verification, availability and deletion guards', () => {
  const h = harness(); const pending = h.state.partners.find((p) => p.verification === 'pending')
  assert.equal(h.actions.setOnline(pending.id, true).ok, false); assert.equal(h.actions.setVerification(pending.id, 'approve').ok, false)
  assert.equal(h.actions.setVerification(pending.id, 'reject', 'no').ok, false)
  for (const d of pending.documents) h.actions.setPartnerDocument(pending.id, d.type, 'submitted', 'f.pdf'), h.actions.setPartnerDocument(pending.id, d.type, 'verified')
  assert.ok(h.actions.setVerification(pending.id, 'approve').ok); assert.ok(h.actions.setOnline(pending.id, true).ok)
  const open = h.state.demoOrders.find((o) => !o.cancelled && o.statusIndex < 4)
  if (open) { assert.ok(h.actions.assignPartner(open.id, pending.id).ok); assert.equal(h.actions.setOnline(pending.id, false).ok, false); assert.equal(h.actions.deletePartner(pending.id).ok, false) }
})
test('actions: settlements are never duplicated and mark-paid is one-way', () => {
  const h = harness(); const rid = h.state.demoOrders.find((o) => o.statusIndex === 4 && !o.cancelled).restaurant.id
  const s = h.actions.createSettlement(rid); assert.ok(s.ok)
  assert.equal(h.actions.createSettlement(rid).ok, false); assert.ok(h.actions.markSettlementPaid(s.record.id).ok); assert.equal(h.actions.markSettlementPaid(s.record.id).ok, false)
  const fin = harness('finance'); assert.ok(fin.actions.createSettlement(rid).ok)
  const ops = harness('operations'); assert.equal(ops.actions.createSettlement(rid).ok, false)
})
test('actions: coupons — create, duplicate, delete guards, settings & roles safety', () => {
  const h = harness()
  assert.ok(h.actions.saveCoupon({ ...draft, code: 'NEWCODE' }).ok); assert.equal(h.actions.saveCoupon({ ...draft, code: 'newcode' }).ok, false)
  assert.equal(h.actions.deleteCoupon('WELCOME10').ok, false) // attached to an active campaign
  assert.ok(h.actions.deleteCoupon('NEWCODE').ok)
  assert.equal(h.actions.saveSettings({ ...h.state.settings, gstPercent: '99' }).ok, false); assert.ok(h.actions.saveSettings({ ...h.state.settings, gstPercent: '12' }).ok); assert.equal(h.state.settings.gstPercent, 12)
  assert.equal(h.actions.setAdminRole('adm-1', 'support').ok, false) // last super admin
  assert.equal(h.actions.setPermission('super_admin', 'orders', 'view', false).ok, false)
  assert.ok(h.actions.setPermission('support', 'finance', 'view', true).ok); assert.ok(can(h.state.matrix, 'support', 'finance', 'view'))
  assert.ok(h.actions.setPermission('support', 'finance', 'view', false).ok); assert.ok(!can(h.state.matrix, 'support', 'finance', 'view'))
})
test('actions: customer suspension and ticket dispute flow', () => {
  const h = harness(); assert.equal(h.actions.setCustomerStatus('a@b.in', 'suspended', '').ok, false)
  assert.ok(h.actions.setCustomerStatus('a@b.in', 'suspended', 'Chargeback abuse').ok); assert.equal(h.state.customerMeta['a@b.in'].status, 'suspended')
  const t = h.state.tickets.find((x) => x.dispute?.open); assert.equal(h.actions.setTicketStatus(t.id, 'resolved').ok, false)
  assert.ok(h.actions.resolveDispute(t.id, 'Duplicate charge reversed in ledger').ok); assert.ok(h.actions.setTicketStatus(t.id, 'closed').ok)
})
test('applyRuntimeFromState publishes coupons, catalog and pricing to the customer logic', () => {
  const s = createInitialState(NOW.getTime()); s.settings = { ...s.settings, platformFee: 7 }
  applyRuntimeFromState(s)
  assert.equal(calculateTotals({ items: [{ unitPrice: 100, quantity: 1 }], deliveryFee: 30 }).platformFee, 7)
  assert.equal(validateCoupon('LUNCH30', 300, NOW).ok, true)
  resetRuntimeConfig(); setRuntimeCoupons(null); setCouponUsageLookup(null); applyCatalogOverlay({})
})

console.log('Admin logic')
for (const [name, fn] of queue) {
  try { await fn(); passed += 1; console.log(`  ok   ${name}`) } catch (e) { process.exitCode = 1; console.error(`  FAIL ${name}\n       ${e.message}`) }
}
console.log(`\n${passed}/${queue.length} admin tests passed`)
