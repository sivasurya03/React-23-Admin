import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Bike, ChevronRight, Clock, MapPin, Search, ShoppingBag, Tag, X } from 'lucide-react'
import FoodImage from '../components/common/FoodImage.jsx'
import HeartButton from '../components/common/HeartButton.jsx'
import { RatingBadge } from '../components/common/Rating.jsx'
import MenuItemCard from '../components/menu/MenuItemCard.jsx'
import EmptyState from '../components/common/EmptyState.jsx'
import { getRestaurant } from '../data/index.js'
import { useWishlist } from '../context/WishlistContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { useCart } from '../context/CartContext.jsx'
import { formatCurrency, priceLevelLabel } from '../utils/format.js'
import usePageTitle from '../hooks/usePageTitle.js'

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-')

export default function RestaurantDetail() {
  const { id } = useParams()
  const restaurant = getRestaurant(id)
  if (!restaurant) {
    return <EmptyState title="Restaurant not found" message="We couldn’t find that restaurant. It may have been removed from the demo data." actionLabel="Browse restaurants" actionTo="/restaurants" />
  }
  return <Detail key={restaurant.id} restaurant={restaurant} />
}

function Detail({ restaurant: r }) {
  usePageTitle(`${r.name} — Craveo`)
  const [params, setParams] = useSearchParams()
  const initialQuery = params.get('q') || ''
  const [query, setQuery] = useState(initialQuery)
  const [active, setActive] = useState(slug(r.menu[0].name))
  const { isRestaurantSaved, toggleRestaurant } = useWishlist()
  const { push } = useToast()
  const { itemCount, restaurantId, totals } = useCart()
  const saved = isRestaurantSaved(r.id)

  const q = query.trim().toLowerCase()
  const sections = useMemo(
    () => r.menu
      .map((s) => ({ ...s, items: q ? s.items.filter((i) => `${i.name} ${i.description}`.toLowerCase().includes(q)) : s.items }))
      .filter((s) => s.items.length),
    [r, q],
  )
  const popular = useMemo(() => (q ? [] : r.items.filter((i) => i.popular)), [r, q])
  const matchCount = sections.reduce((n, s) => n + s.items.length, 0)

  // Highlight the category currently in view for the sticky nav
  useEffect(() => {
    const els = [...document.querySelectorAll('[data-menu-section]')]
    if (!els.length || typeof IntersectionObserver === 'undefined') return undefined
    const obs = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (hit) setActive(hit.target.dataset.menuSection)
      },
      { rootMargin: '-140px 0px -65% 0px' },
    )
    els.forEach((el) => obs.observe(el))
    return () => obs.disconnect()
  }, [sections])

  const onSearch = (value) => {
    setQuery(value)
    const next = new URLSearchParams(params)
    if (value) next.set('q', value)
    else next.delete('q')
    setParams(next, { replace: true })
  }

  const jump = (name) => {
    const el = document.getElementById(`menu-${slug(name)}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setActive(slug(name))
  }

  const cartHere = restaurantId === r.id && itemCount > 0

  return (
    <div>
      <div className="relative">
        <FoodImage photo={r.cover} category={r.primaryCuisine} alt={`${r.name} cover`} width={1600} priority label={r.name} className="h-56 w-full sm:h-72 lg:h-80" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900/70 via-ink-900/10 to-transparent" aria-hidden="true" />
        <div className="container-page absolute inset-x-0 bottom-0 pb-5">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs font-semibold text-white/80">
            <Link to="/" className="hover:text-white">Home</Link><ChevronRight className="h-3 w-3" aria-hidden="true" />
            <Link to="/restaurants" className="hover:text-white">Restaurants</Link><ChevronRight className="h-3 w-3" aria-hidden="true" />
            <span aria-current="page" className="text-white">{r.name}</span>
          </nav>
        </div>
      </div>

      <div className="container-page">
        <header className="card relative -mt-8 p-5 sm:-mt-12 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-brand-500 font-display text-3xl font-bold text-white shadow-soft sm:h-24 sm:w-24" aria-hidden="true">
              {r.name.split(' ').slice(0, 2).map((w) => w[0]).join('')}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="text-3xl font-bold leading-tight sm:text-4xl">{r.name}</h1>
                  <p className="mt-1 text-ink-500">{r.cuisines.join(' · ')}</p>
                </div>
                <HeartButton active={saved} label={r.name} className="border border-ink-200 !bg-white" onToggle={() => push(toggleRestaurant(r.id) ? `${r.name} saved to wishlist` : `${r.name} removed from wishlist`, { type: 'info' })} />
              </div>
              <dl className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-semibold">
                <div className="flex items-center gap-2"><dt className="sr-only">Rating</dt><dd className="flex items-center gap-2"><RatingBadge value={r.rating} /><span className="text-ink-500">{r.reviews.toLocaleString('en-IN')} ratings</span></dd></div>
                <div className="flex items-center gap-1.5"><dt className="sr-only">Delivery time</dt><Clock className="h-4 w-4 text-ink-400" aria-hidden="true" /><dd>{r.deliveryTime} min</dd></div>
                <div className="flex items-center gap-1.5"><dt className="sr-only">Delivery fee</dt><Bike className="h-4 w-4 text-ink-400" aria-hidden="true" /><dd className={r.deliveryFee === 0 ? 'text-leaf' : ''}>{r.deliveryFee === 0 ? 'Free delivery' : `${formatCurrency(r.deliveryFee)} delivery`}</dd></div>
                <div><dt className="sr-only">Price range</dt><dd>{priceLevelLabel(r.priceLevel)} · {formatCurrency(r.costForTwo)} for two</dd></div>
              </dl>
              {r.offer ? <p className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-2 text-sm font-bold text-brand-700"><Tag className="h-4 w-4" aria-hidden="true" />{r.offer}</p> : null}
            </div>
          </div>
          <div className="mt-6 grid gap-6 border-t border-ink-200/70 pt-6 md:grid-cols-[1.4fr_1fr]">
            <section aria-labelledby="about-title">
              <h2 id="about-title" className="font-sans text-base font-extrabold">About</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-500">{r.about}</p>
              <p className="mt-3 flex items-start gap-2 text-sm text-ink-700"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" aria-hidden="true" />{r.address}, {r.area}</p>
            </section>
            <section aria-labelledby="hours-title">
              <h2 id="hours-title" className="font-sans text-base font-extrabold">Opening hours <span className="text-xs font-medium text-ink-400">(demo)</span></h2>
              <dl className="mt-2 space-y-1.5 text-sm">
                {r.hours.map((h) => <div key={h.day} className="flex justify-between gap-4"><dt className="text-ink-500">{h.day}</dt><dd className="font-semibold">{h.hours}</dd></div>)}
              </dl>
            </section>
          </div>
        </header>

        <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[14rem_minmax(0,1fr)]">
          <nav aria-label="Menu categories" className="min-w-0 lg:sticky lg:top-24 lg:self-start">
            <div className="no-scrollbar sticky top-16 z-20 -mx-4 flex gap-2 overflow-x-auto bg-cream-50/95 px-4 py-3 backdrop-blur lg:static lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:bg-transparent lg:p-0">
              {r.menu.map((s) => {
                const on = active === slug(s.name)
                const disabled = q && !sections.some((x) => x.name === s.name)
                return (
                  <button key={s.name} type="button" disabled={Boolean(disabled)} onClick={() => jump(s.name)} aria-current={on ? 'true' : undefined} className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-left text-sm font-bold transition-colors disabled:opacity-35 lg:rounded-xl lg:px-4 lg:py-2.5 ${on ? 'bg-ink-900 text-white' : 'bg-white text-ink-700 hover:bg-cream-200 lg:bg-transparent'}`}>
                    {s.name}
                    <span className={`ml-1.5 text-xs font-semibold ${on ? 'text-white/70' : 'text-ink-400'}`}>{s.items.length}</span>
                  </button>
                )
              })}
            </div>
          </nav>

          <div className="min-w-0">
            <form role="search" onSubmit={(e) => e.preventDefault()} className="relative">
              <label htmlFor="menu-search" className="sr-only">Search {r.name} menu</label>
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400" aria-hidden="true" />
              <input id="menu-search" type="search" value={query} onChange={(e) => onSearch(e.target.value)} placeholder={`Search in ${r.name}`} className="input !min-h-12 !rounded-full pl-12 pr-11" autoComplete="off" />
              {query ? <button type="button" onClick={() => onSearch('')} aria-label="Clear menu search" className="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-ink-500 hover:bg-cream-200"><X className="h-4 w-4" aria-hidden="true" /></button> : null}
            </form>
            {q ? <p className="mt-3 text-sm font-semibold text-ink-500" role="status" aria-live="polite">{matchCount} {matchCount === 1 ? 'dish' : 'dishes'} match “{query.trim()}”</p> : null}

            {popular.length ? (
              <section aria-labelledby="popular-title" className="mt-8">
                <h2 id="popular-title" className="text-2xl font-bold">Popular dishes</h2>
                <div className="mt-4 grid gap-4 xl:grid-cols-2">
                  {popular.map((item) => <MenuItemCard key={`pop-${item.id}`} restaurant={r} item={item} />)}
                </div>
              </section>
            ) : null}

            {sections.length === 0 ? (
              <EmptyState headingLevel={2} title="No dishes found" message={`Nothing on this menu matches “${query.trim()}”.`} actionLabel="Clear search" onAction={() => onSearch('')} />
            ) : (
              sections.map((s) => (
                <section key={s.name} id={`menu-${slug(s.name)}`} data-menu-section={slug(s.name)} aria-labelledby={`h-${slug(s.name)}`} className="mt-10 scroll-mt-36">
                  <h2 id={`h-${slug(s.name)}`} className="text-2xl font-bold">{s.name} <span className="font-sans text-base font-semibold text-ink-400">({s.items.length})</span></h2>
                  <div className="mt-4 grid gap-4 xl:grid-cols-2">
                    {s.items.map((item) => <MenuItemCard key={item.id} restaurant={r} item={item} />)}
                  </div>
                </section>
              ))
            )}
          </div>
        </div>
      </div>

      {cartHere ? (
        <div className="sticky bottom-0 z-30 mt-10 border-t border-ink-200 bg-white/95 px-4 py-3 backdrop-blur">
          <div className="container-page flex items-center justify-between gap-4 !px-0">
            <p className="text-sm font-bold"><span className="tabular-nums">{itemCount}</span> {itemCount === 1 ? 'item' : 'items'} · <span className="tabular-nums">{formatCurrency(totals.subtotal)}</span></p>
            <Link to="/cart" className="btn btn-primary btn-sm"><ShoppingBag className="h-4 w-4" aria-hidden="true" />View cart</Link>
          </div>
        </div>
      ) : null}
    </div>
  )
}
