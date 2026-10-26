import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { readStorage, writeStorage, STORAGE_KEYS } from '../utils/storage.js'
import { getMenuItem, getRestaurant } from '../data/index.js'

const WishlistContext = createContext(null)

function sanitize(raw) {
  const restaurants = Array.isArray(raw?.restaurants) ? [...new Set(raw.restaurants.filter((id) => typeof id === 'string' && getRestaurant(id)))] : []
  const seen = new Set()
  const dishes = Array.isArray(raw?.dishes)
    ? raw.dishes.filter((d) => {
        if (!d || typeof d.restaurantId !== 'string' || typeof d.itemId !== 'string') return false
        if (!getMenuItem(d.restaurantId, d.itemId)) return false
        const key = `${d.restaurantId}/${d.itemId}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
    : []
  return { restaurants, dishes: dishes.map((d) => ({ restaurantId: d.restaurantId, itemId: d.itemId })) }
}

export function WishlistProvider({ children }) {
  const [state, setState] = useState(() => sanitize(readStorage(STORAGE_KEYS.wishlist, null)))

  useEffect(() => {
    writeStorage(STORAGE_KEYS.wishlist, state)
  }, [state])

  // Both toggles return true when the item was ADDED and false when it was removed.
  const toggleRestaurant = useCallback(
    (id) => {
      const has = state.restaurants.includes(id)
      setState((s) => ({
        ...s,
        restaurants: has ? s.restaurants.filter((r) => r !== id) : s.restaurants.includes(id) ? s.restaurants : [...s.restaurants, id],
      }))
      return !has
    },
    [state.restaurants],
  )

  const toggleDish = useCallback(
    (restaurantId, itemId) => {
      const has = state.dishes.some((d) => d.restaurantId === restaurantId && d.itemId === itemId)
      setState((s) => ({
        ...s,
        dishes: has
          ? s.dishes.filter((d) => !(d.restaurantId === restaurantId && d.itemId === itemId))
          : [...s.dishes, { restaurantId, itemId }],
      }))
      return !has
    },
    [state.dishes],
  )

  const isRestaurantSaved = useCallback((id) => state.restaurants.includes(id), [state.restaurants])
  const isDishSaved = useCallback(
    (restaurantId, itemId) => state.dishes.some((d) => d.restaurantId === restaurantId && d.itemId === itemId),
    [state.dishes],
  )

  const value = useMemo(
    () => ({
      restaurantIds: state.restaurants,
      dishRefs: state.dishes,
      count: state.restaurants.length + state.dishes.length,
      toggleRestaurant,
      toggleDish,
      isRestaurantSaved,
      isDishSaved,
    }),
    [state, toggleRestaurant, toggleDish, isRestaurantSaved, isDishSaved],
  )
  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
}

export function useWishlist() {
  const ctx = useContext(WishlistContext)
  if (!ctx) throw new Error('useWishlist must be used inside <WishlistProvider>')
  return ctx
}
