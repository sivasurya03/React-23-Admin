// Node-only tests for the pure business logic (pricing, coupons, cart keys, filters, validation,
// data integrity, reorder). Run with: npm run test:logic
import assert from 'node:assert/strict'
import { calculateTotals, validateCoupon, makeCartKey, unitPriceFor, computeDiscount, COUPONS } from '../src/utils/pricing.js'
import { validateCheckout, isValidPhone, isValidEmail, validateSignup, passwordStrength, validateForgotPassword, validateLogin } from '../src/utils/validation.js'
import { restaurants, getMenuItem, CATEGORIES } from '../src/data/index.js'
import { applyFilters, DEFAULT_FILTERS, searchEverything } from '../src/utils/restaurantFilters.js'
import { generateOrderId } from '../src/utils/ids.js'
import { buildLine } from '../src/utils/cartLines.js'
import { reorderLines } from '../src/utils/reorder.js'

let passed = 0
const test = (name, fn) => {
  try { fn(); passed += 1; console.log(`  ok   ${name}`) } catch (e) { console.error(`  FAIL ${name}\n       ${e.message}`); process.exitCode = 1 }
}
const line = (price, quantity) => ({ unitPrice: price, quantity })

console.log('Pricing')
test('empty cart totals are all zero', () => {
  const t = calculateTotals({ items: [], deliveryFee: 30 })
  assert.equal(t.total, 0); assert.equal(t.itemCount, 0)
})
test('subtotal, platform fee and GST are itemised correctly', () => {
  const t = calculateTotals({ items: [line(100, 2)], deliveryFee: 30 }) // 200
  assert.equal(t.subtotal, 200); assert.equal(t.platformFee, 5); assert.equal(t.gst, 10)
  assert.equal(t.deliveryFee, 30); assert.equal(t.total, 200 + 30 + 5 + 10)
})
test('delivery is free at/above ₹399 subtotal', () => {
  const t = calculateTotals({ items: [line(399, 1)], deliveryFee: 30 })
  assert.equal(t.deliveryFee, 0); assert.equal(t.deliveryWaivedBy, 'threshold')
})
test('delivery is not waived just below the threshold', () => {
  assert.equal(calculateTotals({ items: [line(398, 1)], deliveryFee: 30 }).deliveryFee, 30)
})
test('Plus membership waives delivery', () => {
  const t = calculateTotals({ items: [line(100, 1)], deliveryFee: 30, isPlus: true })
  assert.equal(t.deliveryFee, 0); assert.equal(t.deliveryWaivedBy, 'plus')
})
test('restaurant with free delivery reports no waiver reason', () => {
  const t = calculateTotals({ items: [line(100, 1)], deliveryFee: 0 })
  assert.equal(t.deliveryFee, 0); assert.equal(t.deliveryWaivedBy, null)
})

console.log('Coupons')
test('WELCOME10 gives 10% capped at ₹100', () => {
  assert.equal(calculateTotals({ items: [line(300, 1)], deliveryFee: 0, couponCode: 'WELCOME10' }).discount, 30)
  assert.equal(calculateTotals({ items: [line(2000, 1)], deliveryFee: 0, couponCode: 'WELCOME10' }).discount, 100)
})
test('WELCOME10 needs ₹199 minimum', () => {
  const r = validateCoupon('WELCOME10', 198)
  assert.equal(r.ok, false); assert.match(r.reason, /minimum order of ₹199/)
  assert.equal(validateCoupon('WELCOME10', 199).ok, true)
})
test('CRAVEO50 is flat ₹50 above ₹299', () => {
  assert.equal(validateCoupon('CRAVEO50', 298).ok, false)
  assert.equal(calculateTotals({ items: [line(300, 1)], deliveryFee: 0, couponCode: 'CRAVEO50' }).discount, 50)
})
test('FREEDEL waives the delivery fee under the free-delivery threshold', () => {
  const t = calculateTotals({ items: [line(200, 1)], deliveryFee: 30, couponCode: 'FREEDEL' })
  assert.equal(t.deliveryFee, 0); assert.equal(t.deliveryWaivedBy, 'coupon'); assert.equal(t.discount, 0)
})
test('expired coupon is rejected with a clear message', () => {
  const r = validateCoupon('SUMMER25', 1000, new Date('2026-10-20'))
  assert.equal(r.ok, false); assert.match(r.reason, /expired/)
})
test('unknown / blank codes are rejected; input is case-insensitive and trimmed', () => {
  assert.match(validateCoupon('NOPE', 500).reason, /isn't a valid coupon/)
  assert.match(validateCoupon('   ', 500).reason, /Enter a coupon/)
  assert.equal(validateCoupon('  welcome10 ', 500).ok, true)
})
test('coupon becomes ineligible (not an error) when quantity drops below minimum', () => {
  const t = calculateTotals({ items: [line(100, 1)], deliveryFee: 0, couponCode: 'CRAVEO50' })
  assert.equal(t.discount, 0); assert.equal(t.couponStatus, 'ineligible')
})
test('discount recalculates when quantity changes', () => {
  const a = calculateTotals({ items: [line(150, 2)], deliveryFee: 0, couponCode: 'WELCOME10' }).discount
  const b = calculateTotals({ items: [line(150, 3)], deliveryFee: 0, couponCode: 'WELCOME10' }).discount
  assert.equal(a, 30); assert.equal(b, 45)
})
test('discount can never exceed subtotal and total is never negative', () => {
  assert.equal(computeDiscount({ type: 'flat', value: 500 }, 80), 80)
  for (const code of Object.keys(COUPONS)) for (const p of [1, 49, 150, 999]) {
    const t = calculateTotals({ items: [line(p, 1)], deliveryFee: 0, couponCode: code })
    assert.ok(t.total >= 0, `${code}@${p}`)
  }
})

console.log('Cart keys')
const sizeL = [{ groupId: 'size', optionId: 'lrg', price: 240 }]
const sizeM = [{ groupId: 'size', optionId: 'med', price: 120 }]
test('same dish + different options produce different keys', () => {
  assert.notEqual(makeCartKey('p', sizeL), makeCartKey('p', sizeM))
})
test('same dish + same options produce the same key regardless of option order', () => {
  const a = [{ groupId: 'size', optionId: 'lrg' }, { groupId: 'toppings', optionId: 'cheese' }]
  assert.equal(makeCartKey('p', a), makeCartKey('p', [...a].reverse()))
})
test('special instructions create a separate line (case/space-insensitive)', () => {
  assert.notEqual(makeCartKey('p', [], 'no onion'), makeCartKey('p', [], ''))
  assert.equal(makeCartKey('p', [], 'No  Onion '), makeCartKey('p', [], 'no onion'))
})
test('unit price adds option surcharges to the base price', () => {
  assert.equal(unitPriceFor(249, [...sizeL, { price: 40 }]), 529)
})

console.log('Validation')
test('checkout validation catches empty required fields', () => {
  const e = validateCheckout({ deliveryTime: 'asap', payment: 'cod' })
  for (const k of ['name', 'email', 'phone', 'address', 'pincode']) assert.ok(e[k], k)
})
test('checkout validation accepts a valid form', () => {
  const e = validateCheckout({ name: 'Asha K', email: 'asha@example.com', phone: '98765 43210', address: '12, Main Street, RS Puram', pincode: '641002', deliveryTime: 'asap', payment: 'cod' })
  assert.deepEqual(e, {})
})
test('email and phone formats', () => {
  assert.ok(isValidEmail('a@b.co')); assert.ok(!isValidEmail('a@b')); assert.ok(!isValidEmail('a b@c.com'))
  assert.ok(isValidPhone('+91 98765 43210')); assert.ok(isValidPhone('09876543210')); assert.ok(!isValidPhone('12345')); assert.ok(!isValidPhone('5876543210'))
})
test('signup requires matching passwords and a letter+number', () => {
  assert.ok(validateSignup({ name: 'A', email: 'a@b.co', password: 'abc', confirm: 'abc' }).password)
  assert.ok(validateSignup({ name: 'A', email: 'a@b.co', password: 'abcdefgh', confirm: 'abcdefgh' }).password)
  assert.ok(validateSignup({ name: 'A', email: 'a@b.co', password: 'abcdefg1', confirm: 'abcdefg2' }).confirm)
  assert.deepEqual(validateSignup({ name: 'A', email: 'a@b.co', password: 'abcdefg1', confirm: 'abcdefg1' }), {})
  assert.ok(passwordStrength('Abcdef1!') === 4)
})

console.log('Data integrity')
test('restaurants have unique ids and unique item ids; every restaurant has a menu', () => {
  assert.equal(new Set(restaurants.map((r) => r.id)).size, restaurants.length)
  const all = restaurants.flatMap((r) => r.items.map((i) => i.id))
  assert.equal(new Set(all).size, all.length)
  restaurants.forEach((r) => assert.ok(r.items.length >= 5, r.id))
})
test('every item links back to its restaurant and has a positive price', () => {
  restaurants.forEach((r) => r.items.forEach((i) => { assert.equal(i.restaurantId, r.id); assert.ok(i.price > 0, i.id); assert.ok(i.image, i.id) }))
})
test('option groups are well-formed (unique ids, required groups have options)', () => {
  restaurants.forEach((r) => r.items.forEach((i) => {
    const ids = i.options.map((g) => g.id); assert.equal(new Set(ids).size, ids.length, i.id)
    i.options.forEach((g) => { assert.ok(g.options.length >= 2, `${i.id}/${g.id}`); assert.ok(['single', 'multiple'].includes(g.type)) })
  }))
})
test('all 10 required categories have at least one restaurant and one item', () => {
  for (const c of ['pizza', 'burgers', 'biryani', 'north-indian', 'south-indian', 'chinese', 'rolls-wraps', 'desserts', 'healthy', 'beverages']) {
    assert.ok(restaurants.some((r) => r.categories.includes(c)), c)
  }
  assert.equal(CATEGORIES.length, 10)
  CATEGORIES.forEach((c) => assert.ok(restaurants.some((r) => r.categories.includes(c.id)), c.id))
})
test('catalog size: >=15 restaurants, >=60 items, >=4 items per restaurant, veg and non-veg mix', () => {
  assert.ok(restaurants.length >= 15)
  const items = restaurants.flatMap((r) => r.items)
  assert.ok(items.length >= 60)
  restaurants.forEach((r) => assert.ok(r.items.length >= 4, r.id))
  assert.ok(items.some((i) => i.veg) && items.some((i) => !i.veg))
  assert.equal(new Set(items.map((i) => i.name.toLowerCase())).size, items.length, 'no duplicate dish names')
  assert.ok(items.every((i) => Number.isFinite(i.price) && (i.originalPrice == null || i.originalPrice > i.price)))
})
test('category filter returns only restaurants in that category (new categories too)', () => {
  for (const c of ['north-indian', 'rolls-wraps']) {
    const list = applyFilters({ ...DEFAULT_FILTERS, cuisine: c })
    assert.ok(list.length >= 1); list.forEach((r) => assert.ok(r.categories.includes(c)))
  }
})
test('search finds new dishes by dish, restaurant and cuisine', () => {
  assert.ok(applyFilters({ ...DEFAULT_FILTERS, q: 'lababdar' }).some((r) => r.id === 'tandoor-nights'))
  assert.ok(applyFilters({ ...DEFAULT_FILTERS, q: 'roll republic' }).some((r) => r.id === 'roll-republic'))
  assert.ok(applyFilters({ ...DEFAULT_FILTERS, q: 'kathi' }).some((r) => r.id === 'roll-republic'))
  assert.equal(applyFilters({ ...DEFAULT_FILTERS, q: 'zzzxxqq' }).length, 0)
})

console.log('Forgot password / login validation')
test('forgot-password requires a valid email', () => {
  assert.ok(validateForgotPassword({ email: '' }).email)
  assert.ok(validateForgotPassword({ email: 'nope' }).email)
  assert.deepEqual(validateForgotPassword({ email: 'a@b.co' }), {})
})
test('login requires email format and a password', () => {
  assert.ok(validateLogin({ email: 'x', password: '' }).email)
  assert.ok(validateLogin({ email: 'a@b.co', password: '' }).password)
})

console.log('Search, filters, sort')
test('keyword search matches restaurant names, cuisines and dish names', () => {
  assert.ok(applyFilters({ ...DEFAULT_FILTERS, q: 'biryani' }).length >= 2)
  assert.ok(applyFilters({ ...DEFAULT_FILTERS, q: 'kothu' }).some((r) => r.id === 'madras-filter-and-dosa'))
  assert.equal(applyFilters({ ...DEFAULT_FILTERS, q: 'zzzzqq' }).length, 0)
})
test('cuisine, rating, price, fee and offers filters narrow results correctly', () => {
  assert.ok(applyFilters({ ...DEFAULT_FILTERS, cuisine: 'pizza' }).every((r) => r.categories.includes('pizza')))
  assert.ok(applyFilters({ ...DEFAULT_FILTERS, rating: 4.5 }).every((r) => r.rating >= 4.5))
  assert.ok(applyFilters({ ...DEFAULT_FILTERS, price: [1] }).every((r) => r.priceLevel === 1))
  assert.ok(applyFilters({ ...DEFAULT_FILTERS, fee: 'free' }).every((r) => r.deliveryFee === 0))
  assert.ok(applyFilters({ ...DEFAULT_FILTERS, offers: true }).every((r) => r.offer))
  assert.ok(applyFilters({ ...DEFAULT_FILTERS, veg: true }).every((r) => r.pureVeg))
})
test('sorting by rating, time and price orders results', () => {
  const rating = applyFilters({ ...DEFAULT_FILTERS, sort: 'rating' }).map((r) => r.rating)
  assert.deepEqual(rating, [...rating].sort((a, b) => b - a))
  const time = applyFilters({ ...DEFAULT_FILTERS, sort: 'time' }).map((r) => r.deliveryTime)
  assert.deepEqual(time, [...time].sort((a, b) => a - b))
  const asc = applyFilters({ ...DEFAULT_FILTERS, sort: 'price-asc' }).map((r) => r.costForTwo)
  assert.deepEqual(asc, [...asc].sort((a, b) => a - b))
})
test('global search returns restaurants and dishes', () => {
  const r = searchEverything('paneer'); assert.ok(r.dishes.length > 0)
})

console.log('Orders & reorder')
test('order ids are unique and well-formed', () => {
  const ids = new Set(); for (let i = 0; i < 200; i += 1) ids.add(generateOrderId([...ids]))
  assert.equal(ids.size, 200); ids.forEach((id) => assert.match(id, /^CRV-[A-Z0-9]+$/))
})
test('reorder rebuilds lines with current prices and skips stale items', () => {
  const r = restaurants.find((x) => x.id === 'fire-and-crust')
  const item = getMenuItem(r.id, 'fc-margherita')
  const line1 = buildLine({ restaurant: r, item, selections: [{ groupId: 'size', groupTitle: 'Choose size', optionId: 'lrg', label: 'Large · 12"', price: 240 }, { groupId: 'crust', groupTitle: 'Choose crust', optionId: 'thin', label: 'Thin', price: 0 }], quantity: 2 })
  const order = { restaurant: { id: r.id, name: r.name }, items: [{ ...line1, price: 1 }, { itemId: 'gone', name: 'Retired dish', selections: [], quantity: 1 }] }
  const out = reorderLines(order)
  assert.equal(out.lines.length, 1); assert.deepEqual(out.skipped, ['Retired dish'])
  assert.equal(out.lines[0].unitPrice, 249 + 240); assert.equal(out.lines[0].quantity, 2); assert.equal(out.lines[0].key, line1.key)
})

console.log(`\n${passed} tests passed${process.exitCode ? ' (with failures)' : ''}`)
