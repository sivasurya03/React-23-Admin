import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check, MapPin, Truck } from 'lucide-react'
import OrderItemsList from '../components/orders/OrderItemsList.jsx'
import OrderNotFound from '../components/orders/OrderNotFound.jsx'
import PriceBreakdown from '../components/cart/PriceBreakdown.jsx'
import { useOrders } from '../context/OrderContext.jsx'
import { formatDateTime, formatTime } from '../utils/format.js'
import usePageTitle from '../hooks/usePageTitle.js'

export default function OrderSuccess() {
  const { orderId } = useParams()
  const { getOrder } = useOrders()
  const order = getOrder(orderId)
  usePageTitle(order ? `Order ${order.id} confirmed — Craveo` : 'Order not found — Craveo')
  if (!order) return <OrderNotFound orderId={orderId} />

  const start = new Date(new Date(order.createdAt).getTime() + (order.etaMinutes - 10) * 60000)
  const end = new Date(new Date(order.createdAt).getTime() + order.etaMinutes * 60000)

  return (
    <div className="container-page max-w-4xl py-10 sm:py-14">
      <div className="text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }} className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-leaf text-white">
          <span className="absolute inset-0 animate-ping rounded-full bg-leaf/25 [animation-iteration-count:2] motion-reduce:hidden" aria-hidden="true" />
          <svg viewBox="0 0 24 24" className="relative h-12 w-12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.25, duration: 0.5, ease: 'easeOut' }} />
          </svg>
        </motion.div>
        <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="mt-6 text-4xl font-bold sm:text-5xl">Order placed!</motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }} className="mt-3 text-ink-500">Thanks, {order.customer.name.split(' ')[0]}. This is a demo order — nothing was charged and no food is on its way.</motion.p>
        <p className="mt-4 inline-flex flex-wrap items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm shadow-soft"><span className="text-ink-500">Order ID</span><strong className="font-extrabold tracking-wider">{order.id}</strong></p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link to={`/track-order/${order.id}`} className="btn btn-primary"><Truck className="h-4 w-4" aria-hidden="true" />Track order</Link>
          <Link to="/restaurants" className="btn btn-ghost">Continue browsing</Link>
        </div>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <section className="card p-5 sm:p-6" aria-labelledby="sum-title">
          <h2 id="sum-title" className="font-sans text-lg font-extrabold">Order summary</h2>
          <p className="mb-4 text-sm text-ink-500">{order.restaurant.name} · {formatDateTime(order.createdAt)}</p>
          <OrderItemsList items={order.items} />
          <div className="mt-5 border-t border-dashed border-ink-200 pt-5"><PriceBreakdown totals={order.totals} couponCode={order.couponCode} /></div>
        </section>
        <div className="space-y-6">
          <section className="card p-5 sm:p-6" aria-labelledby="del-title">
            <h2 id="del-title" className="flex items-center gap-2 font-sans text-lg font-extrabold"><MapPin className="h-5 w-5 text-brand-500" aria-hidden="true" />Delivery address</h2>
            <p className="mt-3 font-bold">{order.customer.name}</p>
            <p className="text-sm text-ink-700">{order.delivery.address}, {order.delivery.pincode}</p>
            {order.delivery.landmark ? <p className="text-sm text-ink-500">Landmark: {order.delivery.landmark}</p> : null}
            {order.delivery.instructions ? <p className="text-sm text-ink-500">Note: {order.delivery.instructions}</p> : null}
            <p className="mt-2 text-sm text-ink-500">{order.customer.phone} · {order.customer.email}</p>
          </section>
          <section className="card p-5 sm:p-6" aria-labelledby="eta-title">
            <h2 id="eta-title" className="font-sans text-lg font-extrabold">Delivery estimate</h2>
            <p className="mt-2 text-2xl font-extrabold">{formatTime(start)} – {formatTime(end)}</p>
            <p className="text-sm text-ink-500">Estimated only (demo). Requested: {order.delivery.timeLabel}</p>
            <h2 className="mt-5 font-sans text-lg font-extrabold">Payment</h2>
            <p className="mt-1 text-sm text-ink-700">{order.payment.label}</p>
          </section>
        </div>
      </div>
      <p className="mt-8 text-center text-sm text-ink-500">Want to see the status change? Open tracking and advance the demo timeline. <Check className="ml-1 inline h-4 w-4 text-leaf" aria-hidden="true" /></p>
    </div>
  )
}
