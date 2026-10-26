import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Search, X, Star, Clock } from 'lucide-react'
import useModalBehavior from '../../hooks/useModalBehavior.js'
import { searchEverything } from '../../utils/restaurantFilters.js'
import { CATEGORIES } from '../../data/index.js'
import FoodImage from '../common/FoodImage.jsx'
import VegMark from '../common/VegMark.jsx'
import { formatCurrency } from '../../utils/format.js'

export default function SearchOverlay({ onClose }) {
  const ref = useModalBehavior(true, onClose)
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const results = useMemo(() => searchEverything(query), [query])
  const hasQuery = query.trim().length > 0
  const empty = hasQuery && !results.restaurants.length && !results.dishes.length

  const go = (to) => {
    onClose()
    navigate(to)
  }
  const submit = (e) => {
    e.preventDefault()
    if (hasQuery) go(`/restaurants?q=${encodeURIComponent(query.trim())}`)
  }

  return createPortal(
    <div className="fixed inset-0 z-[80]">
      <motion.div className="absolute inset-0 bg-ink-900/55 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} aria-hidden="true" />
      <motion.div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="Search restaurants and dishes"
        initial={{ opacity: 0, y: -24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12, transition: { duration: 0.15, ease: 'easeIn' } }}
        transition={{ type: 'spring', stiffness: 380, damping: 34 }}
        className="relative mx-auto mt-0 flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden bg-cream-50 shadow-lift sm:mt-16 sm:rounded-3xl"
      >
        <form onSubmit={submit} className="flex items-center gap-2 border-b border-ink-200/70 px-4 py-3" role="search">
          <Search className="h-5 w-5 shrink-0 text-ink-400" aria-hidden="true" />
          <label htmlFor="global-search" className="sr-only">Search restaurants, dishes or cuisines</label>
          <input
            id="global-search"
            data-autofocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search restaurants, dishes or cuisines…"
            autoComplete="off"
            className="h-11 min-w-0 flex-1 bg-transparent text-base font-medium outline-none placeholder:text-ink-400"
          />
          <button type="button" onClick={onClose} className="inline-flex h-10 w-10 items-center justify-center rounded-full text-ink-500 hover:bg-cream-200" aria-label="Close search">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </form>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {!hasQuery ? (
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-400">Browse by cuisine</p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button key={c.id} type="button" onClick={() => go(`/restaurants?cuisine=${c.id}`)} className="rounded-full border border-ink-200 bg-white px-4 py-2 text-sm font-bold hover:border-brand-500 hover:text-brand-600">
                    {c.name}
                  </button>
                ))}
              </div>
              <p className="mt-6 text-sm text-ink-500">Try “biryani”, “paneer”, “coffee” or “dosa”.</p>
            </div>
          ) : null}

          {empty ? (
            <div className="py-10 text-center">
              <p className="font-bold">No matches for “{query.trim()}”</p>
              <p className="mt-1 text-sm text-ink-500">Check the spelling or try a cuisine like pizza or dessert.</p>
            </div>
          ) : null}

          {results.restaurants.length ? (
            <section aria-label="Restaurants" className="mb-5">
              <h3 className="mb-2 font-sans text-xs font-bold uppercase tracking-wider text-ink-400">Restaurants</h3>
              <ul className="space-y-1">
                {results.restaurants.map((r) => (
                  <li key={r.id}>
                    <button type="button" onClick={() => go(`/restaurant/${r.id}`)} className="flex w-full items-center gap-3 rounded-2xl p-2 text-left hover:bg-white">
                      <FoodImage photo={r.cover} category={r.primaryCuisine} alt={`${r.name} cover`} width={160} className="h-14 w-14 shrink-0 rounded-xl" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-bold">{r.name}</span>
                        <span className="flex items-center gap-2 text-xs text-ink-500">
                          <span className="inline-flex items-center gap-0.5"><Star className="h-3 w-3 fill-amber-accent text-amber-accent" aria-hidden="true" />{r.rating.toFixed(1)}</span>
                          <span className="inline-flex items-center gap-0.5"><Clock className="h-3 w-3" aria-hidden="true" />{r.deliveryTime} min</span>
                          <span className="truncate">{r.cuisines.join(' · ')}</span>
                        </span>
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-ink-400" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {results.dishes.length ? (
            <section aria-label="Dishes">
              <h3 className="mb-2 font-sans text-xs font-bold uppercase tracking-wider text-ink-400">Dishes</h3>
              <ul className="space-y-1">
                {results.dishes.map((d) => (
                  <li key={`${d.restaurantId}-${d.id}`}>
                    <button type="button" onClick={() => go(`/restaurant/${d.restaurantId}?q=${encodeURIComponent(d.name)}`)} className="flex w-full items-center gap-3 rounded-2xl p-2 text-left hover:bg-white">
                      <FoodImage photo={d.image} category={d.cuisine} alt={d.name} width={160} className="h-14 w-14 shrink-0 rounded-xl" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 font-bold"><VegMark veg={d.veg} /><span className="truncate">{d.name}</span></span>
                        <span className="block truncate text-xs text-ink-500">{d.restaurantName} · {formatCurrency(d.price)}</span>
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-ink-400" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {hasQuery && !empty ? (
            <button type="button" onClick={() => go(`/restaurants?q=${encodeURIComponent(query.trim())}`)} className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-brand-600">
              See all restaurant results <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </motion.div>
    </div>,
    document.body,
  )
}
