import { restaurants as baseRestaurants } from './restaurants.js'
import { buildCatalog } from '../admin/lib/catalog.js'

export { CATEGORIES, getCategory } from './categories.js'

// The catalog is a *live binding*: it starts as the static demo catalog and is replaced by
// applyCatalogOverlay() once admin edits (new/edited/hidden restaurants and dishes) are loaded.
// Components read these bindings on every render, so changes appear as soon as a customer page mounts.
export let restaurants = baseRestaurants
export let allDishes = []
export let featuredRestaurants = []
export let trendingRestaurants = []
export let topRatedRestaurants = []
export let popularDishes = []
let byId = new Map()

function derive() {
  byId = new Map(restaurants.map((r) => [r.id, r]))
  allDishes = restaurants.flatMap((r) => r.items.map((item) => ({ ...item, restaurantName: r.name, cuisine: r.primaryCuisine })))
  featuredRestaurants = restaurants.filter((r) => r.featured)
  trendingRestaurants = restaurants.filter((r) => r.trending)
  topRatedRestaurants = [...restaurants].sort((a, b) => b.rating - a.rating).slice(0, 4)
  popularDishes = allDishes.filter((d) => d.popular && d.available !== false).slice(0, 8)
}
derive()

/** Rebuilds the customer-visible catalog from the admin overlay. Safe to call repeatedly. */
export function applyCatalogOverlay(overlay) {
  try {
    restaurants = buildCatalog(baseRestaurants, overlay).publicList
  } catch {
    restaurants = baseRestaurants
  }
  derive()
}

export const getRestaurant = (id) => byId.get(id) ?? null

export function getMenuItem(restaurantId, itemId) {
  const r = byId.get(restaurantId)
  return r?.items.find((i) => i.id === itemId) ?? null
}

export const LOCATIONS = ['Coimbatore', 'Tiruppur', 'Chennai', 'Bengaluru', 'Hyderabad', 'Mumbai']

export const OFFER_BANNERS = [
  {
    id: 'welcome',
    eyebrow: 'New to Craveo?',
    title: '10% off your first feast',
    body: 'Use WELCOME10 on orders above ₹199. Save up to ₹100.',
    code: 'WELCOME10',
    to: '/restaurants',
    cta: 'Order now',
    tone: 'from-brand-500 to-amber-accent',
    dark: true,
  },
  {
    id: 'flat50',
    eyebrow: 'Weekend treat',
    title: '₹50 off biryani nights',
    body: 'Flat ₹50 off above ₹299 with CRAVEO50.',
    code: 'CRAVEO50',
    to: '/restaurants?cuisine=biryani',
    cta: 'Browse biryani',
    tone: 'from-ink-900 to-ink-700',
    dark: true,
  },
  {
    id: 'freedel',
    eyebrow: 'Fast & free',
    title: 'Free delivery, on us',
    body: 'Code FREEDEL waives delivery above ₹149. Orders over ₹399 ship free automatically.',
    code: 'FREEDEL',
    to: '/restaurants?fee=free',
    cta: 'Free-delivery spots',
    tone: 'from-cream-200 to-cream-100',
    dark: false,
  },
]

export const HOW_IT_WORKS = [
  { icon: 'MapPin', title: 'Choose your spot', body: 'Pick your city and browse restaurants that deliver to you.' },
  { icon: 'UtensilsCrossed', title: 'Build your order', body: 'Customise sizes, crusts and add-ons — see the price update live.' },
  { icon: 'CreditCard', title: 'Checkout in seconds', body: 'Add your address and pick a payment method. Demo only — no real charge.' },
  { icon: 'Bike', title: 'Track it to your door', body: 'Follow a simulated status timeline from kitchen to doorstep.' },
]

export const TESTIMONIALS = [
  { id: 't1', name: 'Ananya R.', city: 'Coimbatore', rating: 5, text: 'The biryani arrived piping hot and the customisation options were spot on. The whole experience feels effortless.', color: '#ef4f3a' },
  { id: 't2', name: 'Karthik S.', city: 'Tiruppur', rating: 5, text: 'Loved how clear the cart is — every fee itemised, coupons applied instantly. No surprises at checkout.', color: '#2f8f5b' },
  { id: 't3', name: 'Meera P.', city: 'Chennai', rating: 4, text: 'The dosa and filter coffee combo is my Sunday ritual now. Tracking page is a nice touch.', color: '#f59e3b' },
  { id: 't4', name: 'Rahul D.', city: 'Bengaluru', rating: 5, text: 'Cleanest food app UI I have used. Filtering restaurants by rating and price actually works.', color: '#3b8fc4' },
]

export const FAQS = [
  { q: 'Is Craveo a real food delivery service?', a: 'No. Craveo is a frontend demonstration project. Restaurants, menus, payments, delivery partners and tracking are all simulated with local demo data, and no real orders are placed.' },
  { q: 'Do my demo orders get saved?', a: 'Yes — in your own browser only, via LocalStorage. Cart, wishlist, order history and your demo session never leave your device.' },
  { q: 'Which coupon codes work?', a: 'WELCOME10 (10% off, max ₹100, min ₹199), CRAVEO50 (₹50 off, min ₹299) and FREEDEL (free delivery, min ₹149). SUMMER25 is included to demonstrate an expired code.' },
  { q: 'Is any payment processed?', a: 'No. Cash on Delivery, UPI and card options are demonstrations only. Never enter real card details — the demo does not collect them.' },
  { q: 'How does order tracking work?', a: 'Tracking is a simulated status timeline. You can advance it manually or let the demo auto-play. There is no GPS or live driver data.' },
  { q: 'How do I clear my demo data?', a: 'Clear this site\'s data in your browser settings, or sign out and remove entries from LocalStorage keys beginning with "craveo.".' },
]

export const DELIVERY_PARTNERS = [
  { name: 'Arjun (demo)', vehicle: 'Bike · TN 38 DEMO 1024', rating: 4.8 },
  { name: 'Divya (demo)', vehicle: 'Scooter · TN 37 DEMO 2210', rating: 4.9 },
  { name: 'Imran (demo)', vehicle: 'Bike · TN 66 DEMO 7781', rating: 4.7 },
]
