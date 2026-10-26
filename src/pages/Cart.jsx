import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Trash2 } from 'lucide-react'
import CartLine from '../components/cart/CartLine.jsx'
import CouponBox from '../components/cart/CouponBox.jsx'
import PriceBreakdown from '../components/cart/PriceBreakdown.jsx'
import FreeDeliveryProgress from '../components/cart/FreeDeliveryProgress.jsx'
import ConfirmDialog from '../components/common/ConfirmDialog.jsx'
import EmptyState from '../components/common/EmptyState.jsx'
import { useCart } from '../context/CartContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { formatCurrency } from '../utils/format.js'
import usePageTitle from '../hooks/usePageTitle.js'

export default function Cart() {
  usePageTitle('Your cart — Craveo')
  const { items, restaurant, totals, couponCode, setQuantity, removeItem, clearCart } = useCart()
  const { push } = useToast()
  const navigate = useNavigate()
  const [confirmClear, setConfirmClear] = useState(false)

  if (!items.length) {
    return (
      <div className="container-page py-10">
        <EmptyState title="Your cart is empty" message="Good food is waiting. Find a restaurant and add something delicious." actionLabel="Discover restaurants" actionTo="/restaurants" />
      </div>
    )
  }

  return (
    <div className="container-page py-8 sm:py-12">
      <Link to={`/restaurant/${restaurant.id}`} className="inline-flex items-center gap-1.5 text-sm font-bold text-ink-500 hover:text-brand-600"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Continue shopping at {restaurant.name}</Link>
      <h1 className="mt-3 text-4xl font-bold sm:text-5xl">Your cart</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_24rem] lg:items-start">
        <section aria-labelledby="items-title" className="card p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3 border-b border-ink-200/70 pb-4">
            <div className="min-w-0">
              <h2 id="items-title" className="font-sans text-lg font-extrabold">Order from {restaurant.name}</h2>
              <p className="text-sm text-ink-500">{totals.itemCount} {totals.itemCount === 1 ? 'item' : 'items'} · ~{restaurant.deliveryTime} min delivery</p>
            </div>
            <button type="button" onClick={() => setConfirmClear(true)} className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-bold text-ink-500 hover:bg-brand-50 hover:text-brand-600"><Trash2 className="h-4 w-4" aria-hidden="true" />Clear cart</button>
          </div>
          <ul className="divide-y divide-ink-200/70">
            <AnimatePresence initial={false}>
              {items.map((line) => (
                <motion.li key={line.key} layout="position" exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden py-5 first:pt-0 last:pb-0">
                  <CartLine line={line} cuisine={restaurant.primaryCuisine} onQuantity={setQuantity} onRemove={(key) => { removeItem(key); push(`${line.name} removed`, { type: 'info' }) }} />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </section>

        <aside aria-label="Order summary" className="space-y-4 lg:sticky lg:top-24">
          <FreeDeliveryProgress totals={totals} restaurantFee={restaurant.deliveryFee} />
          <CouponBox idPrefix="cart-coupon" />
          <div className="card p-5">
            <h2 className="mb-4 font-sans text-lg font-extrabold">Bill details</h2>
            <PriceBreakdown totals={totals} couponCode={totals.couponStatus === 'applied' ? couponCode : null} />
            <motion.button whileTap={{ scale: 0.98 }} type="button" onClick={() => navigate('/checkout')} className="btn btn-primary mt-5 w-full !min-h-12">
              Proceed to checkout · {formatCurrency(totals.total)}<ArrowRight className="h-4 w-4" aria-hidden="true" />
            </motion.button>
            <Link to="/restaurants" className="btn btn-ghost mt-3 w-full">Continue shopping</Link>
          </div>
        </aside>
      </div>

      <ConfirmDialog open={confirmClear} danger title="Clear your cart?" message="All items will be removed from your cart. This can’t be undone." confirmLabel="Clear cart" onCancel={() => setConfirmClear(false)} onConfirm={() => { clearCart(); setConfirmClear(false); push('Cart cleared', { type: 'info' }) }} />
    </div>
  )
}
