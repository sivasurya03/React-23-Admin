import { Heart } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function HeartButton({ active, onToggle, label, className = '' }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.88 }}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onToggle()
      }}
      aria-pressed={active}
      aria-label={active ? `Remove ${label} from wishlist` : `Save ${label} to wishlist`}
      className={`relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-ink-900 shadow-soft backdrop-blur transition-colors hover:bg-white ${className}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={active ? 'on' : 'off'} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 22 }}>
          <Heart className={`h-5 w-5 ${active ? 'fill-brand-500 text-brand-500' : ''}`} aria-hidden="true" />
        </motion.span>
      </AnimatePresence>
    </motion.button>
  )
}
