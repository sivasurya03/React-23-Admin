import { restaurants, allDishes } from '../data/index.js'

export const SORT_OPTIONS = [
  { id: 'recommended', label: 'Recommended' },
  { id: 'rating', label: 'Rating: high to low' },
  { id: 'time', label: 'Delivery time: fastest' },
  { id: 'price-asc', label: 'Price: low to high' },
  { id: 'price-desc', label: 'Price: high to low' },
]

export const RATING_OPTIONS = [
  { value: 0, label: 'Any' },
  { value: 4, label: '4.0+' },
  { value: 4.3, label: '4.3+' },
  { value: 4.5, label: '4.5+' },
]

export const DEFAULT_FILTERS = { q: '', cuisine: '', sort: 'recommended', rating: 0, price: [], fee: '', offers: false, veg: false }

const num = (v, fallback = 0) => (Number.isFinite(Number(v)) ? Number(v) : fallback)

/** Parse URLSearchParams into a filters object, tolerating junk values. */
export function filtersFromParams(params) {
  const sort = params.get('sort')
  const price = (params.get('price') || '')
    .split(',')
    .map((p) => Number(p))
    .filter((p) => [1, 2, 3].includes(p))
  return {
    q: (params.get('q') || '').slice(0, 80),
    cuisine: params.get('cuisine') || '',
    sort: SORT_OPTIONS.some((s) => s.id === sort) ? sort : 'recommended',
    rating: RATING_OPTIONS.some((r) => r.value === num(params.get('rating'), 0)) ? num(params.get('rating'), 0) : 0,
    price: [...new Set(price)],
    fee: params.get('fee') === 'free' ? 'free' : '',
    offers: params.get('offers') === '1',
    veg: params.get('veg') === '1',
  }
}

export function paramsFromFilters(f) {
  const p = new URLSearchParams()
  if (f.q) p.set('q', f.q)
  if (f.cuisine) p.set('cuisine', f.cuisine)
  if (f.sort && f.sort !== 'recommended') p.set('sort', f.sort)
  if (f.rating) p.set('rating', String(f.rating))
  if (f.price.length) p.set('price', f.price.join(','))
  if (f.fee) p.set('fee', f.fee)
  if (f.offers) p.set('offers', '1')
  if (f.veg) p.set('veg', '1')
  return p
}

const tokenize = (q) => q.toLowerCase().split(/\s+/).filter(Boolean)

export function restaurantMatchesQuery(r, q) {
  const tokens = tokenize(q)
  if (!tokens.length) return true
  const haystack = [r.name, r.area, ...r.cuisines, ...r.items.map((i) => i.name), ...r.items.map((i) => i.category)].join(' ').toLowerCase()
  return tokens.every((t) => haystack.includes(t))
}

export function applyFilters(filters, source = restaurants) {
  let list = source.filter((r) => {
    if (!restaurantMatchesQuery(r, filters.q)) return false
    if (filters.cuisine && !r.categories.includes(filters.cuisine)) return false
    if (filters.rating && r.rating < filters.rating) return false
    if (filters.price.length && !filters.price.includes(r.priceLevel)) return false
    if (filters.fee === 'free' && r.deliveryFee !== 0) return false
    if (filters.offers && !r.offer) return false
    if (filters.veg && !r.pureVeg) return false
    return true
  })
  const cmp = {
    recommended: (a, b) => b.rating * Math.log10(b.reviews + 10) - a.rating * Math.log10(a.reviews + 10),
    rating: (a, b) => b.rating - a.rating || b.reviews - a.reviews,
    time: (a, b) => a.deliveryTime - b.deliveryTime || b.rating - a.rating,
    'price-asc': (a, b) => a.costForTwo - b.costForTwo || b.rating - a.rating,
    'price-desc': (a, b) => b.costForTwo - a.costForTwo || b.rating - a.rating,
  }[filters.sort]
  list = [...list].sort(cmp)
  return list
}

/** Global search used by the navbar overlay: restaurants and dishes. */
export function searchEverything(query, limit = 6) {
  const q = query.trim()
  if (!q) return { restaurants: [], dishes: [] }
  const tokens = tokenize(q)
  const rs = restaurants.filter((r) => restaurantMatchesQuery(r, q)).slice(0, limit)
  const ds = allDishes
    .filter((d) => {
      const h = `${d.name} ${d.description} ${d.category} ${d.restaurantName}`.toLowerCase()
      return tokens.every((t) => h.includes(t))
    })
    .slice(0, limit)
  return { restaurants: rs, dishes: ds }
}
