// Pure catalog builder. Merges the static base catalog with admin edits ("overlay") so the admin
// panel and the customer app read the SAME restaurant/menu data. No React, no storage access.
import { poolImage } from '../../data/images.js'

export const RESTAURANT_FIELDS = [
  'name', 'primaryCuisine', 'cuisines', 'categories', 'area', 'address', 'about', 'deliveryTime',
  'deliveryFee', 'costForTwo', 'priceLevel', 'hours', 'offer', 'featured', 'trending', 'phone', 'ownerName', 'email',
]
export const ITEM_FIELDS = [
  'name', 'price', 'description', 'veg', 'spicy', 'popular', 'recommended', 'originalPrice', 'image', 'options', 'category', 'available',
]
export const DEFAULT_HOURS = [
  { day: 'Mon – Thu', hours: '11:00 AM – 11:00 PM' },
  { day: 'Fri – Sat', hours: '11:00 AM – 12:30 AM' },
  { day: 'Sunday', hours: '10:00 AM – 11:30 PM' },
]

export const EMPTY_OVERLAY = Object.freeze({
  restaurants: {}, customRestaurants: [], deletedRestaurants: [], items: {}, customItems: [], deletedItems: [], extraCategories: {},
})

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v)
const arr = (v) => (Array.isArray(v) ? v : [])

/** Repairs a possibly malformed/outdated overlay read from LocalStorage. Never throws. */
export function normalizeOverlay(raw) {
  const o = isObj(raw) ? raw : {}
  return {
    restaurants: isObj(o.restaurants) ? o.restaurants : {},
    customRestaurants: arr(o.customRestaurants).filter((r) => isObj(r) && typeof r.id === 'string' && typeof r.name === 'string'),
    deletedRestaurants: arr(o.deletedRestaurants).filter((x) => typeof x === 'string'),
    items: isObj(o.items) ? o.items : {},
    customItems: arr(o.customItems).filter((i) => isObj(i) && typeof i.id === 'string' && typeof i.restaurantId === 'string'),
    deletedItems: arr(o.deletedItems).filter((x) => typeof x === 'string'),
    extraCategories: isObj(o.extraCategories) ? o.extraCategories : {},
  }
}

const pick = (src, keys) => {
  const out = {}
  if (!isObj(src)) return out
  for (const k of keys) if (src[k] !== undefined) out[k] = src[k]
  return out
}

export function buildItem(restaurant, raw) {
  const price = Math.max(0, Number(raw.price) || 0)
  const original = Number(raw.originalPrice)
  return {
    id: raw.id,
    name: String(raw.name ?? 'Untitled dish'),
    price,
    description: String(raw.description ?? ''),
    veg: raw.veg !== false,
    spicy: Boolean(raw.spicy),
    popular: Boolean(raw.popular),
    recommended: Boolean(raw.recommended),
    originalPrice: Number.isFinite(original) && original > price ? original : null,
    rating: raw.rating ?? null,
    image: raw.image || poolImage(restaurant.primaryCuisine, 0),
    options: arr(raw.options),
    category: String(raw.category || 'Menu'),
    restaurantId: restaurant.id,
    available: raw.available !== false,
  }
}

function groupSections(items, extra = []) {
  const order = []
  const map = new Map()
  for (const item of items) {
    if (!map.has(item.category)) { map.set(item.category, []); order.push(item.category) }
    map.get(item.category).push(item)
  }
  for (const name of extra) if (!map.has(name)) { map.set(name, []); order.push(name) }
  return order.map((name) => ({ name, items: map.get(name) }))
}

function assemble(raw, isCustom, o) {
  const patch = o.restaurants[raw.id] ?? {}
  const merged = { ...raw, ...pick(patch, RESTAURANT_FIELDS) }
  const baseItems = isCustom ? [] : arr(raw.items)
  const deleted = new Set(o.deletedItems)
  const rawItems = [...baseItems, ...o.customItems.filter((i) => i.restaurantId === raw.id)].filter((i) => !deleted.has(i.id))
  const primary = merged.primaryCuisine || 'pizza'
  const base = { ...merged, primaryCuisine: primary }
  const items = rawItems.map((i) => buildItem(base, { ...i, ...pick(o.items[i.id], ITEM_FIELDS) }))
  const extra = arr(o.extraCategories[raw.id])
  const adminMenu = groupSections(items, extra)
  const menu = adminMenu.filter((s) => s.items.length > 0)
  const status = patch.status ?? raw.application?.status ?? 'approved'
  const active = patch.active ?? raw.active ?? true
  const meta = {
    status,
    active: active !== false,
    commissionRate: patch.commissionRate ?? raw.commissionRate ?? null,
    documents: arr(patch.documents ?? raw.documents),
    rejectionReason: patch.rejectionReason ?? raw.rejectionReason ?? '',
    submittedAt: raw.submittedAt ?? null,
    isCustom,
    demo: Boolean(raw.demo),
    updatedAt: patch.updatedAt ?? null,
  }
  return {
    // customer-facing shape (matches data/restaurants.js)
    id: raw.id,
    name: merged.name,
    primaryCuisine: primary,
    categories: arr(merged.categories).length ? merged.categories : [primary],
    cuisines: arr(merged.cuisines).length ? merged.cuisines : [primary],
    rating: Number(merged.rating) || 0,
    reviews: Number(merged.reviews) || 0,
    deliveryTime: Number(merged.deliveryTime) || 30,
    deliveryFee: Math.max(0, Number(merged.deliveryFee) || 0),
    priceLevel: Math.min(3, Math.max(1, Number(merged.priceLevel) || 1)),
    costForTwo: Number(merged.costForTwo) || 0,
    offer: merged.offer || '',
    featured: Boolean(merged.featured),
    trending: Boolean(merged.trending),
    area: merged.area || '',
    address: merged.address || '',
    about: merged.about || '',
    phone: merged.phone || '',
    ownerName: merged.ownerName || '',
    email: merged.email || '',
    hours: arr(merged.hours).length ? merged.hours : DEFAULT_HOURS,
    cover: merged.cover || poolImage(primary, merged.coverIndex ?? 0),
    pureVeg: items.length > 0 && items.every((i) => i.veg),
    menu,
    items,
    adminMenu,
    admin: meta,
  }
}

export const isPublicRestaurant = (r) => r.admin.status === 'approved' && r.admin.active

/**
 * Returns { all, publicList }. `all` includes pending/rejected/inactive restaurants for the admin
 * panel; `publicList` is what the customer app is allowed to show.
 */
export function buildCatalog(baseRestaurants, overlayInput) {
  const o = normalizeOverlay(overlayInput)
  const deletedR = new Set(o.deletedRestaurants)
  const seen = new Set()
  const all = []
  for (const raw of arr(baseRestaurants)) {
    if (deletedR.has(raw.id) || seen.has(raw.id)) continue
    seen.add(raw.id)
    all.push(assemble(raw, false, o))
  }
  for (const raw of o.customRestaurants) {
    if (deletedR.has(raw.id) || seen.has(raw.id)) continue
    seen.add(raw.id)
    all.push(assemble(raw, true, o))
  }
  return { all, publicList: all.filter(isPublicRestaurant) }
}

export const slugify = (text) =>
  String(text || '').toLowerCase().trim().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48)

export function uniqueId(base, taken) {
  const used = new Set(taken)
  const stem = slugify(base) || 'item'
  if (!used.has(stem)) return stem
  for (let i = 2; i < 500; i += 1) if (!used.has(`${stem}-${i}`)) return `${stem}-${i}`
  return `${stem}-${Date.now().toString(36)}`
}
