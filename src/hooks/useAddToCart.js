import { useCallback } from 'react'
import { useCart } from '../context/CartContext.jsx'
import { useToast } from '../context/ToastContext.jsx'

/** Adds a configured dish to the cart and shows feedback. Returns 'added' | 'conflict'. */
export default function useAddToCart() {
  const { addItem } = useCart()
  const { push } = useToast()
  return useCallback(
    ({ restaurant, item, selections = [], instructions = '', quantity = 1 }) => {
      const status = addItem({ restaurant, item, selections, instructions, quantity })
      if (status === 'added') push(`${quantity > 1 ? `${quantity} × ` : ''}${item.name} added to cart`)
      return status
    },
    [addItem, push],
  )
}
