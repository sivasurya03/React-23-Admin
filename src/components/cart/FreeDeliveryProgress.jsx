import { motion } from 'framer-motion'
import { Bike, PartyPopper } from 'lucide-react'
import { formatCurrency } from '../../utils/format.js'

export default function FreeDeliveryProgress({ totals, restaurantFee }) {
  if (!totals.itemCount) return null
  const pct = Math.min(100, Math.round((totals.subtotal / totals.freeDeliveryThreshold) * 100))
  let message
  let done = false
  if (restaurantFee === 0) {
    message = 'This restaurant delivers free of charge.'
    done = true
  } else if (totals.deliveryWaivedBy === 'plus') {
    message = 'Craveo Plus: delivery is free on this order.'
    done = true
  } else if (totals.deliveryWaivedBy === 'coupon') {
    message = 'FREEDEL has waived your delivery fee.'
    done = true
  } else if (totals.freeDeliveryRemaining <= 0) {
    message = 'You have unlocked free delivery!'
    done = true
  } else {
    message = `Add ${formatCurrency(totals.freeDeliveryRemaining)} more for free delivery`
  }
  return (
    <div className={`rounded-2xl border p-4 ${done ? 'border-leaf/30 bg-emerald-50' : 'border-ink-200 bg-white'}`}>
      <p className="flex items-center gap-2 text-sm font-bold" aria-live="polite">
        {done ? <PartyPopper className="h-4 w-4 text-leaf" aria-hidden="true" /> : <Bike className="h-4 w-4 text-brand-500" aria-hidden="true" />}
        {message}
      </p>
      {restaurantFee !== 0 && !totals.deliveryWaivedBy ? (
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-cream-200" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Progress to free delivery">
          <motion.div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-amber-accent" initial={false} animate={{ width: `${pct}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
        </div>
      ) : null}
    </div>
  )
}
