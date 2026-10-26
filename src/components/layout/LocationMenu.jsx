import { useCallback, useId, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, MapPin } from 'lucide-react'
import { useLocationPref } from '../../context/LocationContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import useClickOutside from '../../hooks/useClickOutside.js'

export default function LocationMenu({ compact = false, onSelect }) {
  const { location, locations, setLocation } = useLocationPref()
  const { push } = useToast()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const listId = useId()
  const close = useCallback(() => setOpen(false), [])
  useClickOutside(ref, close, open)

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        className={`inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white px-3.5 text-sm font-bold text-ink-900 hover:border-ink-900 ${compact ? 'min-h-11 w-full justify-between' : 'min-h-10'}`}
      >
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="h-4 w-4 text-brand-500" aria-hidden="true" />
          <span className="sr-only">Delivery location: </span>
          {location}
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      <AnimatePresence>
        {open ? (
          <motion.ul
            id={listId}
            role="listbox"
            aria-label="Choose delivery city"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-ink-200 bg-white p-1.5 shadow-lift"
          >
            {locations.map((city) => (
              <li key={city} role="option" aria-selected={city === location}>
                <button
                  type="button"
                  onClick={() => {
                    setLocation(city)
                    setOpen(false)
                    push(`Delivering to ${city}`, { type: 'info' })
                    onSelect?.(city)
                  }}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold hover:bg-cream-100"
                >
                  {city}
                  {city === location ? <Check className="h-4 w-4 text-brand-600" aria-hidden="true" /> : null}
                </button>
              </li>
            ))}
            <li className="px-3 pb-1.5 pt-1 text-[11px] text-ink-400" aria-hidden="true">Demo: all cities show the same restaurants.</li>
          </motion.ul>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
