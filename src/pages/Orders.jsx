import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { RotateCcw, Truck } from 'lucide-react'
import EmptyState from '../components/common/EmptyState.jsx'
import StatusBadge from '../components/orders/StatusBadge.jsx'
import ReorderDialog from '../components/orders/ReorderDialog.jsx'
import { staggerChild, staggerParent } from '../components/common/motionVariants.js'
import { useOrders } from '../context/OrderContext.jsx'
import useReorder from '../hooks/useReorder.js'
import { formatCurrency, formatDateTime } from '../utils/format.js'
import usePageTitle from '../hooks/usePageTitle.js'

const summarize = (items) => {
  const names = items.map((i) => `${i.quantity} × ${i.name}`)
  return names.length > 3 ? `${names.slice(0, 3).join(', ')} +${names.length - 3} more` : names.join(', ')
}

export default function Orders() {
  usePageTitle('Your orders — Craveo')
  const { orders } = useOrders()
  const { reorder, pending, confirm, cancel } = useReorder()

  if (!orders.length) {
    return <div className="container-page py-10"><EmptyState title="No orders yet" message="Your demo orders will show up here once you place one." actionLabel="Order something" actionTo="/restaurants" /></div>
  }
  return (
    <div className="container-page max-w-4xl py-8 sm:py-12">
      <h1 className="text-4xl font-bold sm:text-5xl">Your orders</h1>
      <p className="mt-2 text-ink-500">{orders.length} demo {orders.length === 1 ? 'order' : 'orders'} saved in this browser.</p>
      <motion.ul variants={staggerParent} initial="hidden" animate="show" className="mt-8 space-y-4">
        {orders.map((o) => (
          <motion.li key={o.id} variants={staggerChild} className="card p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <Link to={`/restaurant/${o.restaurant.id}`} className="font-sans text-lg font-extrabold hover:text-brand-600">{o.restaurant.name}</Link>
                <p className="text-sm text-ink-500">Order <span className="font-bold tracking-wider text-ink-700">{o.id}</span> · {formatDateTime(o.createdAt)}</p>
              </div>
              <StatusBadge order={o} />
            </div>
            <p className="mt-3 text-sm text-ink-700">{summarize(o.items)}</p>
            {o.cancelled ? <p className="mt-2 text-sm font-semibold text-red-700">Cancelled: {o.cancelled.reason}</p> : null}
            {o.refund ? <p className="mt-1 text-sm text-ink-500">Refund {o.refund.status === 'requested' ? 'under review' : o.refund.status} (simulated)</p> : null}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-ink-200/70 pt-4">
              <p className="font-extrabold tabular-nums">{formatCurrency(o.totals.total)}</p>
              <div className="flex flex-wrap gap-2">
                <Link to={`/order-success/${o.id}`} className="btn btn-ghost btn-sm">View order</Link>
                <Link to={`/track-order/${o.id}`} className="btn btn-ghost btn-sm"><Truck className="h-4 w-4" aria-hidden="true" />{o.cancelled ? 'Details' : 'Track'}</Link>
                <button type="button" onClick={() => reorder(o)} className="btn btn-primary btn-sm"><RotateCcw className="h-4 w-4" aria-hidden="true" />Reorder</button>
              </div>
            </div>
          </motion.li>
        ))}
      </motion.ul>
      <ReorderDialog pending={pending} onConfirm={confirm} onCancel={cancel} />
    </div>
  )
}
