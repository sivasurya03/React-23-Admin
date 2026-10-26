import { Minus, Plus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function QuantityStepper({ value, onChange, min = 0, max = 10, label = 'item', size = 'md', dark = false }) {
  const dim = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10'
  const base = dark ? 'bg-brand-500 text-white' : 'border border-ink-200 bg-white text-ink-900'
  return (
    <div className="inline-flex items-center gap-1" role="group" aria-label={`Quantity for ${label}`}>
      <button
        type="button"
        className={`${dim} ${base} inline-flex items-center justify-center rounded-full transition-colors hover:border-ink-900 disabled:opacity-40`}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label={`Decrease quantity of ${label}`}
      >
        <Minus className="h-4 w-4" aria-hidden="true" />
      </button>
      <span className="relative inline-flex h-8 min-w-8 items-center justify-center overflow-hidden text-center text-sm font-extrabold tabular-nums" aria-live="polite" aria-atomic="true">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span key={value} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} transition={{ duration: 0.15 }}>
            {value}
          </motion.span>
        </AnimatePresence>
      </span>
      <button
        type="button"
        className={`${dim} ${base} inline-flex items-center justify-center rounded-full transition-colors hover:border-ink-900 disabled:opacity-40`}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label={`Increase quantity of ${label}`}
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
}
