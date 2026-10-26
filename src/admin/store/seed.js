// Deterministic DEMO data for the admin panel. Everything created here is flagged `demo: true`
// (or lives under demoOrders) and is shown with a "Demo" badge — it is never presented as real
// business data. Live customer orders/accounts always stay separate (OrderContext / users store).
import { restaurants as baseRestaurants } from '../../data/restaurants.js'
import { calculateTotals } from '../../utils/pricing.js'
import { DEFAULT_MATRIX, normalizeMatrix } from '../lib/rbac.js'
import { DEFAULT_FINANCE } from '../lib/finance.js'
import { EMPTY_OVERLAY } from '../lib/catalog.js'
import { COUPONS } from '../../utils/pricing.js'
import { DEMO_ADMIN_ACCOUNTS } from './adminAccounts.js'
import { ORDER_STATUSES } from '../../data/orderStatuses.js'

export const SCHEMA_VERSION = 1

function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a += 0x6d2b79f5
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const DAY = 86400000
const iso = (ms) => new Date(ms).toISOString()

export const DEMO_CUSTOMERS = [
  { id: 'demo-c1', name: 'Ananya Ravi', email: 'ananya.r@demo.craveo', phone: '9840012345', city: 'Coimbatore', address: '12, Race Course Road, RS Puram, Coimbatore', pincode: '641002', joinedDaysAgo: 120 },
  { id: 'demo-c2', name: 'Karthik Subramani', email: 'karthik.s@demo.craveo', phone: '9843123456', city: 'Tiruppur', address: '45, Kumaran Road, Tiruppur', pincode: '641601', joinedDaysAgo: 98 },
  { id: 'demo-c3', name: 'Meera Pandian', email: 'meera.p@demo.craveo', phone: '9944234567', city: 'Coimbatore', address: '7, Avinashi Road, Peelamedu, Coimbatore', pincode: '641004', joinedDaysAgo: 76 },
  { id: 'demo-c4', name: 'Rahul Deshmukh', email: 'rahul.d@demo.craveo', phone: '9791345678', city: 'Coimbatore', address: '88, Gandhipuram Cross Cut Road, Coimbatore', pincode: '641012', joinedDaysAgo: 64 },
  { id: 'demo-c5', name: 'Sowmya Narayanan', email: 'sowmya.n@demo.craveo', phone: '9894456789', city: 'Tiruppur', address: '23, Palladam Road, Tiruppur', pincode: '641604', joinedDaysAgo: 51 },
  { id: 'demo-c6', name: 'Imran Sheikh', email: 'imran.s@demo.craveo', phone: '9677567890', city: 'Coimbatore', address: '5, Saibaba Colony Main Road, Coimbatore', pincode: '641011', joinedDaysAgo: 40 },
  { id: 'demo-c7', name: 'Divya Krishnan', email: 'divya.k@demo.craveo', phone: '9585678901', city: 'Coimbatore', address: '31, Trichy Road, Singanallur, Coimbatore', pincode: '641005', joinedDaysAgo: 22 },
  { id: 'demo-c8', name: 'Arjun Balaji', email: 'arjun.b@demo.craveo', phone: '9361789012', city: 'Tiruppur', address: '9, Mangalam Road, Tiruppur', pincode: '641604', joinedDaysAgo: 9 },
]

const doc = (type, status, fileName = '') => ({ type, status, fileName })

export const DEMO_PARTNERS = [
  { id: 'dp-1', name: 'Arjun Kumar', phone: '9876501001', email: 'arjun.k@demo.craveo', vehicle: 'Bike', plate: 'TN 38 DM 1024', rating: 4.8, verification: 'approved', online: true, active: true, joinedDaysAgo: 140, documents: [doc('ID proof', 'verified', 'aadhaar-masked.pdf'), doc('Driving licence', 'verified', 'dl.pdf'), doc('Vehicle RC', 'verified', 'rc.pdf')] },
  { id: 'dp-2', name: 'Divya Selvam', phone: '9876501002', email: 'divya.s@demo.craveo', vehicle: 'Scooter', plate: 'TN 37 DM 2210', rating: 4.9, verification: 'approved', online: true, active: true, joinedDaysAgo: 118, documents: [doc('ID proof', 'verified', 'id.pdf'), doc('Driving licence', 'verified', 'dl.pdf'), doc('Vehicle RC', 'verified', 'rc.pdf')] },
  { id: 'dp-3', name: 'Imran Basha', phone: '9876501003', email: 'imran.b@demo.craveo', vehicle: 'Bike', plate: 'TN 66 DM 7781', rating: 4.7, verification: 'approved', online: false, active: true, joinedDaysAgo: 90, documents: [doc('ID proof', 'verified', 'id.pdf'), doc('Driving licence', 'verified', 'dl.pdf'), doc('Vehicle RC', 'verified', 'rc.pdf')] },
  { id: 'dp-4', name: 'Saranya Mohan', phone: '9876501004', email: 'saranya.m@demo.craveo', vehicle: 'Scooter', plate: 'TN 41 DM 3345', rating: 4.6, verification: 'approved', online: true, active: true, joinedDaysAgo: 60, documents: [doc('ID proof', 'verified', 'id.pdf'), doc('Driving licence', 'verified', 'dl.pdf'), doc('Vehicle RC', 'verified', 'rc.pdf')] },
  { id: 'dp-5', name: 'Vignesh Raja', phone: '9876501005', email: '', vehicle: 'Bike', plate: 'TN 38 DM 9012', rating: 4.5, verification: 'pending', online: false, active: true, joinedDaysAgo: 3, documents: [doc('ID proof', 'submitted', 'id.pdf'), doc('Driving licence', 'submitted', 'dl.pdf'), doc('Vehicle RC', 'missing')] },
  { id: 'dp-6', name: 'Bharath Kannan', phone: '9876501006', email: '', vehicle: 'Bicycle', plate: 'TN 37 DM 4400', rating: 4.5, verification: 'pending', online: false, active: true, joinedDaysAgo: 1, documents: [doc('ID proof', 'submitted', 'id.pdf'), doc('Driving licence', 'missing'), doc('Vehicle RC', 'missing')] },
  { id: 'dp-7', name: 'Rohit Verma', phone: '9876501007', email: '', vehicle: 'Bike', plate: 'TN 38 DM 5566', rating: 4.5, verification: 'rejected', rejectionReason: 'Driving licence image was unreadable.', online: false, active: false, joinedDaysAgo: 30, documents: [doc('ID proof', 'verified', 'id.pdf'), doc('Driving licence', 'rejected', 'dl-blurry.jpg'), doc('Vehicle RC', 'verified', 'rc.pdf')] },
]

const SLOTS = [8, 9, 12, 12, 13, 13, 13, 14, 15, 17, 18, 19, 19, 20, 20, 20, 21, 21, 22, 23]
const METHODS = [
  { method: 'cod', label: 'Cash on Delivery' },
  { method: 'upi', label: 'UPI (demo)' },
  { method: 'card', label: 'Card (demo)' },
]

function buildOrders(rand, now) {
  const pickR = () => baseRestaurants[Math.floor(rand() * baseRestaurants.length)]
  const orders = []
  const total = 84
  for (let n = 0; n < total; n += 1) {
    const r = pickR()
    const customer = DEMO_CUSTOMERS[Math.floor(rand() * DEMO_CUSTOMERS.length)]
    const daysAgo = Math.floor(Math.pow(rand(), 1.35) * 44)
    const hour = SLOTS[Math.floor(rand() * SLOTS.length)]
    const created = new Date(now - daysAgo * DAY)
    created.setHours(hour, Math.floor(rand() * 60), Math.floor(rand() * 60), 0)
    let createdMs = created.getTime()
    if (createdMs > now - 20 * 60000) createdMs = now - (20 + Math.floor(rand() * 90)) * 60000
    const lineCount = 1 + Math.floor(rand() * 3)
    const lines = []
    const used = new Set()
    for (let i = 0; i < lineCount; i += 1) {
      const item = r.items[Math.floor(rand() * r.items.length)]
      if (used.has(item.id)) continue
      used.add(item.id)
      lines.push({
        key: `${item.id}::::`, itemId: item.id, restaurantId: r.id, name: item.name, image: item.image, veg: item.veg,
        basePrice: item.price, selections: [], instructions: '', unitPrice: item.price, quantity: 1 + Math.floor(rand() * 2),
      })
    }
    const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0)
    const couponPool = ['WELCOME10', 'CRAVEO50', 'FREEDEL']
    let couponCode = rand() < 0.28 ? couponPool[Math.floor(rand() * couponPool.length)] : null
    let totals = calculateTotals({ items: lines, deliveryFee: r.deliveryFee, couponCode, now: new Date(createdMs) })
    if (couponCode && totals.couponStatus !== 'applied') { couponCode = null; totals = calculateTotals({ items: lines, deliveryFee: r.deliveryFee, now: new Date(createdMs) }) }
    const { appliedCoupon: _drop, ...cleanTotals } = totals
    const ageMin = (now - createdMs) / 60000
    const roll = rand()
    let statusIndex
    let cancelled = null
    if (ageMin < 15) statusIndex = 0
    else if (ageMin < 40) statusIndex = 1 + Math.floor(rand() * 2)
    else if (ageMin < 75) statusIndex = 3
    else statusIndex = 4
    const pay = METHODS[Math.floor(rand() * METHODS.length)]
    let payment = { method: pay.method, label: pay.label, demo: true }
    const history = [{ index: 0, at: iso(createdMs) }]
    let cursor = createdMs
    for (let i = 1; i <= statusIndex; i += 1) { cursor += (4 + Math.floor(rand() * 10)) * 60000; history.push({ index: i, at: iso(cursor) }) }
    if (roll > 0.9 && ageMin > 30) {
      const at = createdMs + (3 + Math.floor(rand() * 20)) * 60000
      statusIndex = Math.min(statusIndex, 1)
      history.length = statusIndex + 1
      const reasons = ['Customer asked to cancel', 'Restaurant closed early', 'Item out of stock', 'Payment could not be verified']
      const reason = reasons[Math.floor(rand() * reasons.length)]
      cancelled = { at: iso(at), reason, by: 'demo seed' }
      history.push({ type: 'cancelled', at: iso(at), reason, by: 'demo seed' })
      if (reason === 'Payment could not be verified') payment = { ...payment, method: 'upi', label: 'UPI (demo)', status: 'failed' }
    }
    const partner = statusIndex >= 3 && !cancelled ? DEMO_PARTNERS[Math.floor(rand() * 4)] : null
    const order = {
      id: `CRV-DM${String(n + 1).padStart(4, '0')}`,
      demo: true,
      clientToken: null,
      createdAt: iso(createdMs),
      statusIndex,
      statusHistory: history,
      restaurant: { id: r.id, name: r.name, address: r.address, area: r.area, deliveryTime: r.deliveryTime },
      items: lines,
      totals: { ...cleanTotals, subtotal },
      couponCode,
      customer: { name: customer.name, email: customer.email, phone: customer.phone },
      delivery: { address: customer.address, pincode: customer.pincode, landmark: '', instructions: '', timeLabel: 'ASAP' },
      payment,
      etaMinutes: r.deliveryTime + 10,
      partner: partner
        ? { name: partner.name, vehicle: `${partner.vehicle} · ${partner.plate}`, rating: partner.rating }
        : { name: 'Unassigned', vehicle: '—', rating: 0 },
      partnerId: partner ? partner.id : null,
      cancelled,
    }
    if (cancelled && payment.method !== 'cod' && payment.status !== 'failed') {
      const k = rand()
      order.refund = {
        id: `RF-DM${String(n + 1).padStart(4, '0')}`, status: k < 0.4 ? 'requested' : k < 0.8 ? 'approved' : 'rejected',
        amount: Math.round(order.totals.total), reason: `Order cancelled: ${cancelled.reason}`, requestedAt: cancelled.at, requestedBy: 'admin', requestedByName: 'demo seed',
        reviewedAt: k < 0.4 ? null : iso(new Date(cancelled.at).getTime() + 3600000), reviewedBy: k < 0.4 ? null : 'Vikram Nair',
        reviewNote: k < 0.4 ? '' : k < 0.8 ? 'Prepaid amount returned in the simulated ledger.' : 'Order had already been prepared.', simulated: true,
      }
    } else if (statusIndex === 4 && !cancelled && rand() < 0.08) {
      const k = rand()
      const amt = Math.round(order.totals.total * (k < 0.5 ? 1 : 0.4))
      order.refund = {
        id: `RF-DM${String(n + 1).padStart(4, '0')}`, status: k < 0.45 ? 'requested' : k < 0.8 ? 'approved' : 'rejected',
        amount: amt, reason: k < 0.5 ? 'Food arrived cold and one item was missing.' : 'Wrong item delivered.', requestedAt: iso(cursor + 40 * 60000), requestedBy: 'customer', requestedByName: customer.name,
        reviewedAt: k < 0.45 ? null : iso(cursor + 6 * 3600000), reviewedBy: k < 0.45 ? null : 'Sneha Pillai',
        reviewNote: k < 0.45 ? '' : k < 0.8 ? 'Verified with the restaurant — partial refund approved.' : 'Photo evidence did not match the order.', simulated: true,
      }
    }
    orders.push(order)
  }
  return orders.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

function buildTickets(orders, now) {
  const list = (i) => orders[Math.min(i, orders.length - 1)]
  const mk = (id, daysAgo, subject, category, priority, status, c, order, thread, extra = {}) => ({
    id, subject, category, priority, status, demo: true,
    customerId: c.id, customerName: c.name, customerEmail: c.email, orderId: order?.id ?? null,
    assigneeId: extra.assigneeId ?? null,
    createdAt: iso(now - daysAgo * DAY), updatedAt: iso(now - Math.max(0, daysAgo - 0.2) * DAY),
    messages: thread.map(([from, author, textBody], i) => ({ id: `${id}-m${i + 1}`, from, author, text: textBody, at: iso(now - (daysAgo - i * 0.05) * DAY) })),
    dispute: extra.dispute ?? null,
  })
  const C = DEMO_CUSTOMERS
  return [
    mk('TK-1001', 1, 'Food arrived cold', 'delivery', 'high', 'open', C[0], list(8), [['customer', C[0].name, 'My biryani arrived cold and 50 minutes late.']]),
    mk('TK-1002', 2, 'Charged twice for one order', 'payment', 'urgent', 'in_progress', C[1], list(14), [['customer', C[1].name, 'I see two debits for a single order.'], ['admin', 'Vikram Nair', 'Looking into the transaction now — will update shortly.']], { assigneeId: 'adm-4', dispute: { open: true, note: '', resolvedAt: null } }),
    mk('TK-1003', 3, 'Missing item in order', 'order', 'medium', 'resolved', C[2], list(20), [['customer', C[2].name, 'The garlic bread was not in the bag.'], ['admin', 'Sneha Pillai', 'Sorry about that — we have recorded a partial refund request.']], { assigneeId: 'adm-5' }),
    mk('TK-1004', 5, 'How do I change my address?', 'account', 'low', 'closed', C[3], null, [['customer', C[3].name, 'Where can I edit my saved address?'], ['admin', 'Sneha Pillai', 'You can enter a new address at checkout.']], { assigneeId: 'adm-5' }),
    mk('TK-1005', 4, 'Refund not reflected', 'refund', 'high', 'in_progress', C[4], list(26), [['customer', C[4].name, 'My refund was approved but I cannot see it.']], { assigneeId: 'adm-4' }),
    mk('TK-1006', 0.4, 'Delivery partner was rude', 'delivery', 'medium', 'open', C[5], list(3), [['customer', C[5].name, 'The partner argued about finding my house.']]),
    mk('TK-1007', 7, 'Restaurant ignored allergy note', 'order', 'urgent', 'resolved', C[6], list(31), [['customer', C[6].name, 'I asked for no nuts. The dessert had nuts.'], ['admin', 'Priya Raman', 'Escalated to the restaurant manager; compensation recorded.']], { assigneeId: 'adm-1', dispute: { open: false, note: 'Restaurant acknowledged the error; full refund approved in the simulated ledger and a warning noted on their account.', resolvedAt: iso(now - 6 * DAY) } }),
    mk('TK-1008', 0.1, 'Coupon not applying', 'payment', 'low', 'open', C[7], null, [['customer', C[7].name, 'WELCOME10 says the order is too small.']]),
  ]
}

export const DEMO_RESTAURANT_APPLICATIONS = (now) => [
  {
    id: 'spice-route-kitchen', name: 'Spice Route Kitchen', primaryCuisine: 'north-indian', categories: ['north-indian'], cuisines: ['North Indian', 'Mughlai'],
    area: 'Gandhipuram', address: '120, Cross Cut Road, Gandhipuram', about: 'Family-run North Indian kitchen applying to join Craveo.',
    deliveryTime: 35, deliveryFee: 30, priceLevel: 2, costForTwo: 550, ownerName: 'Harish Gopal', phone: '9842011111', email: 'harish@spiceroute.demo',
    demo: true, submittedAt: iso(now - 2 * DAY), application: { status: 'pending' },
    documents: [doc('FSSAI licence', 'submitted', 'fssai.pdf'), doc('GST certificate', 'submitted', 'gst.pdf'), doc('PAN card', 'submitted', 'pan.pdf'), doc('Bank proof', 'missing')],
  },
  {
    id: 'green-leaf-cafe', name: 'Green Leaf Cafe', primaryCuisine: 'healthy', categories: ['healthy'], cuisines: ['Healthy', 'Salads'],
    area: 'Peelamedu', address: '14, Hope College Road, Peelamedu', about: 'Salads and smoothie bowls.',
    deliveryTime: 28, deliveryFee: 25, priceLevel: 2, costForTwo: 420, ownerName: 'Nisha Thomas', phone: '9842022222', email: 'nisha@greenleaf.demo',
    demo: true, submittedAt: iso(now - 1 * DAY), application: { status: 'pending' },
    documents: [doc('FSSAI licence', 'submitted', 'fssai.pdf'), doc('GST certificate', 'missing'), doc('PAN card', 'submitted', 'pan.pdf'), doc('Bank proof', 'submitted', 'bank.pdf')],
  },
]

const REVIEW_TEXT = [
  [5, 'Fantastic food, arrived hot.'], [4, 'Good portions, slightly delayed.'], [5, 'Loved the packaging and flavour.'],
  [3, 'Taste was fine but the delivery was slow.'], [4, 'Great value for the price.'], [2, 'Order was missing an item.'],
  [5, 'Best biryani I have had in months.'], [4, 'Fresh and tasty.'],
]

function buildReviews(orders, rand) {
  const delivered = orders.filter((o) => o.statusIndex === 4 && !o.cancelled).slice(0, 26)
  return delivered.filter((_, i) => i % 2 === 0).map((o, i) => {
    const [rating, textBody] = REVIEW_TEXT[Math.floor(rand() * REVIEW_TEXT.length)]
    const c = DEMO_CUSTOMERS.find((x) => x.email === o.customer.email)
    return { id: `rv-${i + 1}`, demo: true, customerId: c?.id ?? null, customerName: o.customer.name, restaurantId: o.restaurant.id, restaurantName: o.restaurant.name, orderId: o.id, rating, text: textBody, at: o.statusHistory.at(-1)?.at ?? o.createdAt }
  })
}

const builtinCoupons = () => Object.values(COUPONS).map((c) => ({
  code: c.code, title: c.title, description: c.description, type: c.type, value: c.value ?? null, maxDiscount: c.maxDiscount ?? null,
  minSubtotal: c.minSubtotal ?? 0, startsAt: null, expiresAt: c.expiresAt ? new Date(c.expiresAt).toISOString() : null, usageLimit: null,
  active: true, campaignId: null, builtin: true,
}))

export const DEFAULT_SETTINGS = Object.freeze({
  platformName: 'Craveo', tagline: 'Hungry? Sorted.', currency: 'INR', locale: 'en-IN',
  defaultDeliveryFee: 30, gstPercent: 5, platformFee: 5, freeDeliveryThreshold: 399, etaBufferMinutes: 10, refundWindowDays: 7,
  defaultCommission: DEFAULT_FINANCE.defaultCommission, partnerPayoutPerDelivery: DEFAULT_FINANCE.partnerPayoutPerDelivery, partnerMaxActive: 2,
  notifications: Object.freeze({ orders: true, refunds: true, restaurants: true, partners: true, support: true }),
})

export function createInitialState(nowMs = Date.now()) {
  const rand = mulberry32(20261023)
  const demoOrders = buildOrders(rand, nowMs)
  const coupons = [
    ...builtinCoupons().map((c) => (c.code === 'WELCOME10' ? { ...c, campaignId: 'cmp-welcome' } : c.code === 'CRAVEO50' ? { ...c, campaignId: 'cmp-biryani' } : c)),
    { code: 'LUNCH30', title: '₹30 off lunch', description: 'Flat ₹30 off the food subtotal. Minimum order ₹199.', type: 'flat', value: 30, maxDiscount: null, minSubtotal: 199, startsAt: null, expiresAt: null, usageLimit: 500, active: true, campaignId: 'cmp-welcome', builtin: false },
  ]
  return {
    schema: SCHEMA_VERSION,
    seededAt: iso(nowMs),
    demoOrders,
    customerMeta: {},
    partners: DEMO_PARTNERS.map(({ joinedDaysAgo, ...p }) => ({ ...p, demo: true, joinedAt: iso(nowMs - joinedDaysAgo * DAY), rejectionReason: p.rejectionReason ?? '' })),
    overlay: { ...EMPTY_OVERLAY, customRestaurants: DEMO_RESTAURANT_APPLICATIONS(nowMs), restaurants: {}, items: {}, customItems: [], deletedItems: [], deletedRestaurants: [], extraCategories: {} },
    coupons,
    campaigns: [
      { id: 'cmp-welcome', name: 'Welcome Week', description: 'Win over first-time customers with small discounts.', couponCodes: ['WELCOME10', 'LUNCH30'], startsAt: iso(nowMs - 20 * DAY), endsAt: iso(nowMs + 30 * DAY), active: true },
      { id: 'cmp-biryani', name: 'Biryani Nights', description: 'Weekend push on biryani orders.', couponCodes: ['CRAVEO50'], startsAt: iso(nowMs - 10 * DAY), endsAt: iso(nowMs + 20 * DAY), active: true },
    ],
    referral: { enabled: false, referrerReward: 75, refereeReward: 50, minOrderValue: 249, maxReferralsPerUser: 10, rewardExpiryDays: 30, terms: 'Configuration only — the customer app has no referral flow yet, so no rewards are issued.' },
    tickets: buildTickets(demoOrders, nowMs),
    reviews: buildReviews(demoOrders, rand),
    notifications: [
      { id: 'ntf-seed-1', type: 'system', title: 'Demo workspace ready', body: 'Sample data is loaded and clearly labelled "Demo". Live customer orders appear alongside it.', at: iso(nowMs), read: false, link: '/admin' },
    ],
    knownLiveOrders: [],
    zones: [
      { id: 'zone-1', name: 'Coimbatore Central', coverage: 'RS Puram, Gandhipuram, Race Course, Saibaba Colony (PIN 641001–641012)', deliveryFee: 25, minOrder: 149, etaExtra: 0, active: true },
      { id: 'zone-2', name: 'Coimbatore East', coverage: 'Peelamedu, Singanallur, Avinashi Road (PIN 641004–641005, 641014)', deliveryFee: 35, minOrder: 199, etaExtra: 8, active: true },
      { id: 'zone-3', name: 'Tiruppur Town', coverage: 'Kumaran Road, Palladam Road, Mangalam Road (PIN 641601–641604)', deliveryFee: 40, minOrder: 199, etaExtra: 10, active: true },
      { id: 'zone-4', name: 'Outer ring (paused)', coverage: 'Villages beyond 10 km from the city centre', deliveryFee: 60, minOrder: 349, etaExtra: 25, active: false },
    ],
    settings: { ...DEFAULT_SETTINGS, notifications: { ...DEFAULT_SETTINGS.notifications } },
    matrix: normalizeMatrix(DEFAULT_MATRIX),
    adminUsers: DEMO_ADMIN_ACCOUNTS.map((a) => ({ ...a })),
    commissionSnapshots: {},
    settlements: [],
    payouts: [],
    audit: [],
  }
}

export { ORDER_STATUSES }
