import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Bike, Clock, Percent } from 'lucide-react'
import FoodImage from '../common/FoodImage.jsx'
import HeartButton from '../common/HeartButton.jsx'
import { RatingBadge } from '../common/Rating.jsx'
import { staggerChild } from '../common/motionVariants.js'
import { useWishlist } from '../../context/WishlistContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { formatCurrency, priceLevelLabel } from '../../utils/format.js'

export default function RestaurantCard({ restaurant: r, variant = 'grid' }) {
  const { isRestaurantSaved, toggleRestaurant } = useWishlist()
  const { push } = useToast()
  const saved = isRestaurantSaved(r.id)

  return (
    <motion.article
      variants={variant === 'grid' ? staggerChild : undefined}
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className="card group relative flex h-full flex-col overflow-hidden transition-shadow duration-300 hover:shadow-lift"
    >
      <div className="relative">
        <FoodImage photo={r.cover} category={r.primaryCuisine} alt={`${r.name} — ${r.cuisines.join(', ')}`} width={720} label={r.name} className="aspect-[16/10] w-full" imgClassName="transition-transform duration-500 group-hover:scale-105" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink-900/55 to-transparent" aria-hidden="true" />
        {r.offer ? (
          <span className="badge absolute bottom-3 left-3 bg-white/95 text-brand-700 shadow-soft">
            <Percent className="h-3 w-3" aria-hidden="true" />{r.offer}
          </span>
        ) : null}
        <HeartButton
          className="absolute right-3 top-3 z-10"
          active={saved}
          label={r.name}
          onToggle={() => push(toggleRestaurant(r.id) ? `${r.name} saved to wishlist` : `${r.name} removed from wishlist`, { type: 'info' })}
        />
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 font-sans text-lg font-extrabold leading-snug tracking-tight">
            <Link to={`/restaurant/${r.id}`} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-offset-4">
              {r.name}
            </Link>
          </h3>
          <RatingBadge value={r.rating} className="shrink-0" />
        </div>
        <p className="mt-1 truncate text-sm text-ink-500">{r.cuisines.join(' · ')} · {r.area}</p>
        <dl className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-4 text-sm font-semibold text-ink-700">
          <div className="inline-flex items-center gap-1.5"><dt className="sr-only">Delivery time</dt><Clock className="h-4 w-4 text-ink-400" aria-hidden="true" /><dd>{r.deliveryTime} min</dd></div>
          <div className="inline-flex items-center gap-1.5"><dt className="sr-only">Delivery fee</dt><Bike className="h-4 w-4 text-ink-400" aria-hidden="true" /><dd className={r.deliveryFee === 0 ? 'text-leaf' : ''}>{r.deliveryFee === 0 ? 'Free delivery' : formatCurrency(r.deliveryFee)}</dd></div>
          <div className="inline-flex items-center gap-1.5"><dt className="sr-only">Price range</dt><dd>{priceLevelLabel(r.priceLevel)} · {formatCurrency(r.costForTwo)} for two</dd></div>
        </dl>
      </div>
    </motion.article>
  )
}
