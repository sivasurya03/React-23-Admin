import { useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import RestaurantCard from '../components/restaurant/RestaurantCard.jsx'
import FilterPanel from '../components/restaurant/FilterPanel.jsx'
import EmptyState from '../components/common/EmptyState.jsx'
import Modal from '../components/common/Modal.jsx'
import { staggerParent } from '../components/common/motionVariants.js'
import { applyFilters, DEFAULT_FILTERS, filtersFromParams, paramsFromFilters, RATING_OPTIONS, SORT_OPTIONS } from '../utils/restaurantFilters.js'
import { getCategory } from '../data/index.js'
import { pluralize } from '../utils/format.js'
import usePageTitle from '../hooks/usePageTitle.js'

const PAGE_SIZE = 6

export default function Restaurants() {
  usePageTitle('Restaurants — Craveo')
  const [params, setParams] = useSearchParams()
  const filters = useMemo(() => filtersFromParams(params), [params])
  const [visible, setVisible] = useState(PAGE_SIZE)
  const [panelOpen, setPanelOpen] = useState(false)
  const [lastKey, setLastKey] = useState('')

  const key = params.toString()
  // Reset pagination whenever the filter set changes (derived-state pattern, no effect needed)
  if (key !== lastKey) {
    setLastKey(key)
    setVisible(PAGE_SIZE)
  }

  const update = useCallback((patch) => setParams(paramsFromFilters({ ...filters, ...patch }), { replace: true }), [filters, setParams])
  const clearAll = () => setParams(new URLSearchParams(), { replace: true })

  const results = useMemo(() => applyFilters(filters), [filters])
  const shown = results.slice(0, visible)

  const chips = []
  if (filters.q) chips.push({ id: 'q', label: `“${filters.q}”`, clear: () => update({ q: '' }) })
  if (filters.cuisine) chips.push({ id: 'cuisine', label: getCategory(filters.cuisine)?.name ?? filters.cuisine, clear: () => update({ cuisine: '' }) })
  if (filters.rating) chips.push({ id: 'rating', label: `${RATING_OPTIONS.find((r) => r.value === filters.rating)?.label} rating`, clear: () => update({ rating: 0 }) })
  filters.price.forEach((p) => chips.push({ id: `price-${p}`, label: '₹'.repeat(p), clear: () => update({ price: filters.price.filter((x) => x !== p) }) }))
  if (filters.fee) chips.push({ id: 'fee', label: 'Free delivery', clear: () => update({ fee: '' }) })
  if (filters.offers) chips.push({ id: 'offers', label: 'Has offers', clear: () => update({ offers: false }) })
  if (filters.veg) chips.push({ id: 'veg', label: 'Pure veg', clear: () => update({ veg: false }) })
  if (filters.sort !== DEFAULT_FILTERS.sort) chips.push({ id: 'sort', label: SORT_OPTIONS.find((s) => s.id === filters.sort)?.label, clear: () => update({ sort: 'recommended' }) })

  return (
    <div className="container-page py-8 sm:py-12">
      <div className="mb-6">
        <h1 className="text-4xl font-bold sm:text-5xl">Restaurants near you</h1>
        <p className="mt-2 text-ink-500">Search, filter and sort kitchens by what matters to you.</p>
      </div>

      <form role="search" onSubmit={(e) => e.preventDefault()} className="flex items-center gap-3">
        <div className="relative flex-1">
          <label htmlFor="listing-search" className="sr-only">Search restaurants, dishes or cuisines</label>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400" aria-hidden="true" />
          <input id="listing-search" type="search" value={filters.q} onChange={(e) => update({ q: e.target.value })} placeholder="Search restaurants, dishes or cuisines" className="input !min-h-12 !rounded-full pl-12" autoComplete="off" />
        </div>
        <button type="button" onClick={() => setPanelOpen(true)} className="btn btn-ghost !min-h-12 lg:hidden" aria-haspopup="dialog">
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />Filters{chips.length ? ` (${chips.length})` : ''}
        </button>
      </form>

      <div className="mt-6 grid gap-8 lg:grid-cols-[18rem_1fr]">
        <aside className="hidden lg:block" aria-label="Filters">
          <div className="card sticky top-24 max-h-[calc(100dvh-7rem)] overflow-y-auto p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-sans text-lg font-extrabold">Filters</h2>
              {chips.length ? <button type="button" onClick={clearAll} className="text-sm font-bold text-brand-600 hover:underline">Clear all</button> : null}
            </div>
            <FilterPanel filters={filters} onChange={update} />
          </div>
        </aside>

        <section aria-label="Results">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <p className="mr-2 text-sm font-bold" role="status" aria-live="polite">{pluralize(results.length, 'restaurant')} found</p>
            <AnimatePresence initial={false}>
              {chips.map((c) => (
                <motion.button key={c.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} type="button" onClick={c.clear} className="inline-flex items-center gap-1.5 rounded-full bg-ink-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-ink-700" aria-label={`Remove filter ${c.label}`}>
                  {c.label}<X className="h-3.5 w-3.5" aria-hidden="true" />
                </motion.button>
              ))}
            </AnimatePresence>
            {chips.length > 1 ? <button type="button" onClick={clearAll} className="text-sm font-bold text-brand-600 hover:underline">Clear all</button> : null}
          </div>

          {results.length === 0 ? (
            <EmptyState headingLevel={2} title="No restaurants match" message="Try removing a filter or searching for something different, like “pizza” or “coffee”." actionLabel="Reset all filters" onAction={clearAll} />
          ) : (
            <>
              <motion.div key={key} variants={staggerParent} initial="hidden" animate="show" className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {shown.map((r) => <RestaurantCard key={r.id} restaurant={r} />)}
              </motion.div>
              <div className="mt-8 flex flex-col items-center gap-2">
                <p className="text-sm text-ink-500">Showing {shown.length} of {results.length}</p>
                {visible < results.length ? <button type="button" className="btn btn-ghost" onClick={() => setVisible((v) => v + PAGE_SIZE)}>Load more restaurants</button> : null}
              </div>
            </>
          )}
        </section>
      </div>

      <AnimatePresence>
        {panelOpen ? <MobileFilters filters={filters} onChange={update} onClear={clearAll} count={results.length} onClose={() => setPanelOpen(false)} /> : null}
      </AnimatePresence>
    </div>
  )
}

function MobileFilters({ filters, onChange, onClear, count, onClose }) {
  return (
    <Modal
      title="Filters"
      titleId="filters-title"
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          <button type="button" className="btn btn-ghost flex-1" onClick={onClear}>Clear all</button>
          <button type="button" className="btn btn-primary flex-1" onClick={onClose}>Show {pluralize(count, 'result')}</button>
        </div>
      }
    >
      <div className="px-5 py-5"><FilterPanel filters={filters} onChange={onChange} /></div>
    </Modal>
  )
}
