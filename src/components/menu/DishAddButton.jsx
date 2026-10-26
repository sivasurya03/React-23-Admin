import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Plus } from 'lucide-react'
import CustomizeModal from './CustomizeModal.jsx'
import QuantityStepper from '../common/QuantityStepper.jsx'
import useAddToCart from '../../hooks/useAddToCart.js'
import { useCart } from '../../context/CartContext.jsx'
import { makeCartKey } from '../../utils/pricing.js'

export default function DishAddButton({ restaurant, item, className = '' }) {
  const addToCart = useAddToCart()
  const { getItemQuantity, setQuantity, items } = useCart()
  const [open, setOpen] = useState(false)
  const [justAdded, setJustAdded] = useState(false)
  const customizable = item.options.length > 0
  if (item.available === false) {
    return (
      <div className={`flex flex-col items-center ${className}`}>
        <button type="button" disabled className="btn btn-sm min-w-24 border-[1.5px] border-ink-200 bg-cream-100 text-ink-400" aria-label={`${item.name} is currently unavailable`}>Sold out</button>
      </div>
    )
  }
  const totalQty = getItemQuantity(item.id)
  const plainKey = makeCartKey(item.id, [], '')
  const plainLine = items.find((l) => l.key === plainKey)

  const flash = () => {
    setJustAdded(true)
    setTimeout(() => setJustAdded(false), 1100)
  }

  // Plain dish already in the cart → stepper
  if (!customizable && plainLine) {
    return (
      <div className={className}>
        <QuantityStepper dark size="sm" value={plainLine.quantity} onChange={(q) => setQuantity(plainKey, q)} label={item.name} />
      </div>
    )
  }

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <motion.button
        type="button"
        whileTap={{ scale: 0.93 }}
        onClick={() => {
          if (customizable) setOpen(true)
          else if (addToCart({ restaurant, item }) === 'added') flash()
        }}
        className={`btn btn-sm min-w-24 border-[1.5px] ${justAdded ? 'border-leaf bg-leaf text-white' : 'border-brand-500 bg-white text-brand-600 hover:bg-brand-50'}`}
        aria-label={customizable ? `Customise and add ${item.name}` : `Add ${item.name} to cart`}
      >
        <AnimatePresence mode="wait" initial={false}>
          {justAdded ? (
            <motion.span key="ok" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} className="inline-flex items-center gap-1"><Check className="h-4 w-4" aria-hidden="true" />Added</motion.span>
          ) : (
            <motion.span key="add" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="inline-flex items-center gap-1"><Plus className="h-4 w-4" aria-hidden="true" />ADD{totalQty > 0 ? ` · ${totalQty}` : ''}</motion.span>
          )}
        </AnimatePresence>
      </motion.button>
      {customizable ? <span className="mt-1 text-[11px] font-semibold text-ink-400">Customisable</span> : null}

      <AnimatePresence>
        {open ? (
          <CustomizeModal
            key="customize"
            item={item}
            restaurantName={restaurant.name}
            onClose={() => setOpen(false)}
            onConfirm={({ selections, instructions, quantity }) => {
              const status = addToCart({ restaurant, item, selections, instructions, quantity })
              setOpen(false)
              if (status === 'added') flash()
            }}
          />
        ) : null}
      </AnimatePresence>
    </div>
  )
}
