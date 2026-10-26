import { motion } from 'framer-motion'
import EmptyState from '../components/common/EmptyState.jsx'
import RestaurantCard from '../components/restaurant/RestaurantCard.jsx'
import DishCard from '../components/menu/DishCard.jsx'
import { staggerParent } from '../components/common/motionVariants.js'
import { useWishlist } from '../context/WishlistContext.jsx'
import { getMenuItem, getRestaurant } from '../data/index.js'
import usePageTitle from '../hooks/usePageTitle.js'

export default function Wishlist() {
  usePageTitle('Wishlist — Craveo')
  const { restaurantIds, dishRefs } = useWishlist()
  const restaurants = restaurantIds.map(getRestaurant).filter(Boolean)
  const dishes = dishRefs.map((d) => getMenuItem(d.restaurantId, d.itemId)).filter(Boolean)

  if (!restaurants.length && !dishes.length) {
    return <div className="container-page py-10"><EmptyState title="Your wishlist is empty" message="Tap the heart on any restaurant or dish to save it here." actionLabel="Explore restaurants" actionTo="/restaurants" /></div>
  }
  return (
    <div className="container-page py-8 sm:py-12">
      <h1 className="text-4xl font-bold sm:text-5xl">Your wishlist</h1>
      {restaurants.length ? (
        <section aria-labelledby="wl-rest" className="mt-8">
          <h2 id="wl-rest" className="text-2xl font-bold">Saved restaurants <span className="font-sans text-base font-semibold text-ink-400">({restaurants.length})</span></h2>
          <motion.div variants={staggerParent} initial="hidden" animate="show" className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {restaurants.map((r) => <RestaurantCard key={r.id} restaurant={r} />)}
          </motion.div>
        </section>
      ) : null}
      {dishes.length ? (
        <section aria-labelledby="wl-dish" className="mt-12">
          <h2 id="wl-dish" className="text-2xl font-bold">Saved dishes <span className="font-sans text-base font-semibold text-ink-400">({dishes.length})</span></h2>
          <motion.div variants={staggerParent} initial="hidden" animate="show" className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {dishes.map((d) => <DishCard key={`${d.restaurantId}-${d.id}`} dish={d} />)}
          </motion.div>
        </section>
      ) : null}
    </div>
  )
}
