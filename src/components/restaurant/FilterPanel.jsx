import { RATING_OPTIONS, SORT_OPTIONS } from '../../utils/restaurantFilters.js'
import { CATEGORIES } from '../../data/index.js'

function Group({ title, children }) {
  return (
    <fieldset className="border-t border-ink-200/70 pt-5 first:border-0 first:pt-0">
      <legend className="mb-3 font-sans text-sm font-extrabold">{title}</legend>
      {children}
    </fieldset>
  )
}

const chip = (active) => `rounded-full border px-3.5 py-2 text-sm font-bold transition-colors ${active ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-ink-200 bg-white text-ink-700 hover:border-ink-900'}`

export default function FilterPanel({ filters, onChange }) {
  const togglePrice = (p) => onChange({ price: filters.price.includes(p) ? filters.price.filter((x) => x !== p) : [...filters.price, p] })
  return (
    <div className="space-y-5">
      <Group title="Sort by">
        <label htmlFor="sort-select" className="sr-only">Sort restaurants</label>
        <select id="sort-select" className="input" value={filters.sort} onChange={(e) => onChange({ sort: e.target.value })}>
          {SORT_OPTIONS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </Group>
      <Group title="Cuisine">
        <div className="flex flex-wrap gap-2">
          <button type="button" aria-pressed={!filters.cuisine} className={chip(!filters.cuisine)} onClick={() => onChange({ cuisine: '' })}>All</button>
          {CATEGORIES.map((c) => (
            <button key={c.id} type="button" aria-pressed={filters.cuisine === c.id} className={chip(filters.cuisine === c.id)} onClick={() => onChange({ cuisine: filters.cuisine === c.id ? '' : c.id })}>{c.name}</button>
          ))}
        </div>
      </Group>
      <Group title="Minimum rating">
        <div className="flex flex-wrap gap-2">
          {RATING_OPTIONS.map((r) => (
            <button key={r.value} type="button" aria-pressed={filters.rating === r.value} className={chip(filters.rating === r.value)} onClick={() => onChange({ rating: r.value })}>{r.label}</button>
          ))}
        </div>
      </Group>
      <Group title="Price range">
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3].map((p) => (
            <button key={p} type="button" aria-pressed={filters.price.includes(p)} aria-label={`${'₹'.repeat(p)} price level`} className={chip(filters.price.includes(p))} onClick={() => togglePrice(p)}>{'₹'.repeat(p)}</button>
          ))}
        </div>
        <p className="mt-2 text-xs text-ink-400">₹ budget · ₹₹ mid-range · ₹₹₹ premium</p>
      </Group>
      <Group title="More">
        <div className="space-y-2">
          {[
            ['fee', 'Free delivery', filters.fee === 'free', (v) => onChange({ fee: v ? 'free' : '' })],
            ['offers', 'Has offers', filters.offers, (v) => onChange({ offers: v })],
            ['veg', 'Pure veg only', filters.veg, (v) => onChange({ veg: v })],
          ].map(([id, label, checked, set]) => (
            <label key={id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-1 text-sm font-semibold">
              <input type="checkbox" checked={checked} onChange={(e) => set(e.target.checked)} className="h-4 w-4 accent-[#ef4f3a]" />
              {label}
            </label>
          ))}
        </div>
      </Group>
    </div>
  )
}
