import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Star } from 'lucide-react'
import FoodImage from '../common/FoodImage.jsx'
import VegMark from '../common/VegMark.jsx'
import HeartButton from '../common/HeartButton.jsx'
import DishAddButton from './DishAddButton.jsx'
import { staggerChild } from '../common/motionVariants.js'
import { useWishlist } from '../../context/WishlistContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { formatCurrency } from '../../utils/format.js'
import { getRestaurant } from '../../data/index.js'

// Standalone dish tile used on the home page and wishlist.
export default function DishCard({ dish, animated = true }) {
  const restaurant = getRestaurant(dish.restaurantId)
  const { isDishSaved, toggleDish } = useWishlist()
  const { push } = useToast()
  if (!restaurant) return null
  const saved = isDishSaved(restaurant.id, dish.id)

  return (
    <motion.article variants={animated ? staggerChild : undefined} whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 400, damping: 28 }} className="card group flex h-full flex-col overflow-hidden transition-shadow duration-300 hover:shadow-lift">
      <div className="relative">
        <FoodImage photo={dish.image} category={restaurant.primaryCuisine} alt={dish.name} width={640} label={dish.name} className="aspect-[4/3] w-full" imgClassName="transition-transform duration-500 group-hover:scale-105" />
        <HeartButton
          className="absolute right-3 top-3"
          active={saved}
          label={dish.name}
          onToggle={() => push(toggleDish(restaurant.id, dish.id) ? `${dish.name} saved to wishlist` : `${dish.name} removed from wishlist`, { type: 'info' })}
        />
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start gap-2">
          <VegMark veg={dish.veg} className="mt-1" />
          <h3 className="font-sans text-base font-extrabold leading-snug">{dish.name}</h3>
        </div>
        <Link to={`/restaurant/${restaurant.id}`} className="mt-1 text-sm text-ink-500 hover:text-brand-600">{restaurant.name}</Link>
        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <div>
            <p className="text-lg font-extrabold">{formatCurrency(dish.price)}{dish.options.length ? <span className="ml-1 text-xs font-semibold text-ink-400">onwards</span> : null}{dish.originalPrice ? <span className="ml-2 text-xs font-semibold text-ink-400 line-through"><span className="sr-only">Was </span>{formatCurrency(dish.originalPrice)}</span> : null}</p>
            {dish.rating ? <p className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-ink-500"><Star className="h-3 w-3 fill-amber-accent text-amber-accent" aria-hidden="true" />{dish.rating.toFixed(1)}</p> : null}
          </div>
          <DishAddButton restaurant={restaurant} item={dish} />
        </div>
      </div>
    </motion.article>
  )
}
