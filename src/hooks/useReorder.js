import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { reorderLines } from '../utils/reorder.js'

/** Returns { reorder(order), pending, confirm, cancel } — asks before replacing a cart from another restaurant. */
export default function useReorder() {
  const { addMany, restaurantId, items } = useCart()
  const { push } = useToast()
  const navigate = useNavigate()
  const [pending, setPending] = useState(null)

  const apply = useCallback(({ restaurant, lines, skipped }) => {
    addMany(restaurant.id, lines)
    push(skipped.length ? `Added ${lines.length} item${lines.length === 1 ? '' : 's'}. Unavailable: ${skipped.join(', ')}` : 'Items added to your cart', { type: skipped.length ? 'info' : 'success', duration: 4500 })
    navigate('/cart')
  }, [addMany, push, navigate])

  const reorder = useCallback((order) => {
    const result = reorderLines(order)
    if (!result.restaurant || !result.lines.length) {
      push('Sorry, none of these items are available to reorder right now.', { type: 'error' })
      return
    }
    if (items.length && restaurantId && restaurantId !== result.restaurant.id) setPending({ ...result, from: order.restaurant.name })
    else apply(result)
  }, [items.length, restaurantId, apply, push])

  return {
    reorder,
    pending,
    confirm: () => { if (pending) apply(pending); setPending(null) },
    cancel: () => setPending(null),
  }
}
