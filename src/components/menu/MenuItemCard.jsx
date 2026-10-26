import { Flame, Star } from 'lucide-react'
import FoodImage from '../common/FoodImage.jsx'
import VegMark from '../common/VegMark.jsx'
import HeartButton from '../common/HeartButton.jsx'
import DishAddButton from './DishAddButton.jsx'
import { useWishlist } from '../../context/WishlistContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { formatCurrency } from '../../utils/format.js'

export default function MenuItemCard({ restaurant, item }) {
  const { isDishSaved, toggleDish } = useWishlist()
  const { push } = useToast()
  const saved = isDishSaved(restaurant.id, item.id)
  return (
    <article className="card flex gap-4 p-4 sm:p-5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <VegMark veg={item.veg} />
          {item.popular ? <span className="badge bg-amber-accent/20 text-amber-900">Bestseller</span> : null}
          {item.recommended ? <span className="badge bg-leaf/15 text-leaf">Chef’s pick</span> : null}
          {item.originalPrice ? <span className="badge bg-brand-500/10 text-brand-600">{Math.round((1 - item.price / item.originalPrice) * 100)}% off</span> : null}
          {item.spicy ? <span className="inline-flex items-center gap-0.5 text-xs font-bold text-brand-600"><Flame className="h-3.5 w-3.5" aria-hidden="true" /><span>Spicy</span></span> : null}
        </div>
        <h3 className="mt-2 font-sans text-base font-extrabold leading-snug sm:text-lg">{item.name}</h3>
        <p className="mt-1 flex items-center gap-2 text-sm font-bold">
          {formatCurrency(item.price)}
          {item.originalPrice ? <span className="text-xs font-semibold text-ink-400 line-through"><span className="sr-only">Was </span>{formatCurrency(item.originalPrice)}</span> : null}
          {item.rating ? <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-ink-500"><Star className="h-3 w-3 fill-amber-accent text-amber-accent" aria-hidden="true" />{item.rating.toFixed(1)}</span> : null}
        </p>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-500">{item.description}</p>
      </div>
      <div className="relative flex w-28 shrink-0 flex-col items-center sm:w-36">
        <div className="relative w-full">
          <FoodImage photo={item.image} category={restaurant.primaryCuisine} alt={item.name} width={400} className="aspect-square w-full rounded-2xl" />
          <HeartButton
            className="absolute right-1.5 top-1.5 !h-8 !w-8"
            active={saved}
            label={item.name}
            onToggle={() => push(toggleDish(restaurant.id, item.id) ? `${item.name} saved to wishlist` : `${item.name} removed from wishlist`, { type: 'info' })}
          />
        </div>
        <DishAddButton restaurant={restaurant} item={item} className="-mt-4 relative z-10" />
      </div>
    </article>
  )
}
