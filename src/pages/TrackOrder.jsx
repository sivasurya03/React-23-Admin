import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FastForward, Headphones, Pause, Phone, Play, RotateCcw, Star, Store } from 'lucide-react'
import OrderTimeline from '../components/orders/OrderTimeline.jsx'
import OrderItemsList from '../components/orders/OrderItemsList.jsx'
import OrderNotFound from '../components/orders/OrderNotFound.jsx'
import RefundPanel from '../components/orders/RefundPanel.jsx'
import StatusBadge from '../components/orders/StatusBadge.jsx'
import { useOrders } from '../context/OrderContext.jsx'
import { ORDER_STATUSES } from '../data/orderStatuses.js'
import { useToast } from '../context/ToastContext.jsx'
import { formatCurrency, formatDateTime, formatTime } from '../utils/format.js'
import usePageTitle from '../hooks/usePageTitle.js'

const AUTO_MS = 5000

export default function TrackOrder() {
  const { orderId } = useParams()
  const { getOrder, advanceOrder, resetOrderStatus } = useOrders()
  const { push } = useToast()
  const [auto, setAuto] = useState(false)
  const order = getOrder(orderId)
  usePageTitle(order ? `Track ${order.id} — Craveo` : 'Order not found — Craveo')

  const cancelled = Boolean(order?.cancelled)
  const delivered = order ? cancelled || order.statusIndex >= ORDER_STATUSES.length - 1 : true
  const id = order?.id

  // Controlled simulation: advances one stage every few seconds while "Auto-play" is on.
  useEffect(() => {
    if (!auto || delivered || !id) return undefined
    const t = setInterval(() => advanceOrder(id), AUTO_MS)
    return () => clearInterval(t)
  }, [auto, delivered, id, advanceOrder])

  if (!order) return <OrderNotFound orderId={orderId} />

  const eta = new Date(new Date(order.createdAt).getTime() + order.etaMinutes * 60000)
  const deliveredAt = order.statusHistory.find((h) => h.index === ORDER_STATUSES.length - 1)
  const isAutoOn = auto && !delivered
  const showPartner = order.statusIndex >= 3 && !cancelled

  return (
    <div className="container-page py-8 sm:py-12">
      <Link to="/orders" className="text-sm font-bold text-ink-500 hover:text-brand-600">← All orders</Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-4xl font-bold sm:text-5xl">Track order</h1>
          <p className="mt-2 text-ink-500">Order <strong className="tracking-wider text-ink-900">{order.id}</strong> · {formatDateTime(order.createdAt)}</p>
        </div>
        <StatusBadge order={order} />
      </div>

      {cancelled ? <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-800" role="status">This order was cancelled: {order.cancelled.reason}</p> : null}
      <p className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-900">Simulated tracking: statuses are advanced by you in this demo. There is no GPS or live driver data.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:items-start">
        <section className="card p-5 sm:p-7" aria-labelledby="status-title">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="status-title" className="font-sans text-lg font-extrabold">{cancelled ? 'Cancelled' : delivered ? 'Delivered' : 'Estimated arrival'}</h2>
              <p className="text-3xl font-extrabold">{cancelled ? formatTime(order.cancelled.at) : delivered ? formatTime(deliveredAt?.at ?? eta) : formatTime(eta)}</p>
              <p className="text-xs text-ink-400">{cancelled ? 'Cancelled — no further updates' : delivered ? 'Demo order marked delivered' : 'Estimate only — not live'}</p>
            </div>
          </div>
          <OrderTimeline statusIndex={order.statusIndex} history={order.statusHistory} />

          <div className="mt-7 border-t border-ink-200/70 pt-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-400">Demo controls</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-dark btn-sm" disabled={delivered} onClick={() => advanceOrder(order.id)}><FastForward className="h-4 w-4" aria-hidden="true" />Next status</button>
              <button type="button" className="btn btn-ghost btn-sm" disabled={delivered} aria-pressed={isAutoOn} onClick={() => setAuto((a) => !a)}>
                {isAutoOn ? <><Pause className="h-4 w-4" aria-hidden="true" />Pause auto-play</> : <><Play className="h-4 w-4" aria-hidden="true" />Auto-play ({AUTO_MS / 1000}s)</>}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" disabled={order.statusIndex === 0} onClick={() => { setAuto(false); resetOrderStatus(order.id); push('Tracking reset to “Order placed”', { type: 'info' }) }}><RotateCcw className="h-4 w-4" aria-hidden="true" />Reset</button>
            </div>
          </div>
        </section>

        <div className="space-y-6">
          <RefundPanel order={order} />
          <section className="card p-5 sm:p-6" aria-labelledby="rest-title">
            <h2 id="rest-title" className="flex items-center gap-2 font-sans text-lg font-extrabold"><Store className="h-5 w-5 text-brand-500" aria-hidden="true" />Restaurant</h2>
            <Link to={`/restaurant/${order.restaurant.id}`} className="mt-2 block font-bold hover:text-brand-600">{order.restaurant.name}</Link>
            <p className="text-sm text-ink-500">{order.restaurant.address}, {order.restaurant.area}</p>
          </section>

          <section className="card p-5 sm:p-6" aria-labelledby="partner-title">
            <h2 id="partner-title" className="font-sans text-lg font-extrabold">Delivery partner <span className="text-xs font-medium text-ink-400">(demo data)</span></h2>
            {showPartner ? (
              <div className="mt-3 flex items-center gap-3">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-500 text-lg font-extrabold text-white" aria-hidden="true">{order.partner.name.charAt(0)}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{order.partner.name}</p>
                  <p className="truncate text-sm text-ink-500">{order.partner.vehicle}</p>
                </div>
                {order.partner.rating ? <span className="inline-flex items-center gap-1 text-sm font-bold"><Star className="h-4 w-4 fill-amber-accent text-amber-accent" aria-hidden="true" />{order.partner.rating}</span> : null}
              </div>
            ) : (
              <p className="mt-2 text-sm text-ink-500">A partner is assigned once your food is ready for pickup.</p>
            )}
          </section>

          <section className="card p-5 sm:p-6" aria-labelledby="det-title">
            <h2 id="det-title" className="font-sans text-lg font-extrabold">Order details</h2>
            <div className="mt-4"><OrderItemsList items={order.items} /></div>
            <p className="mt-4 flex justify-between border-t border-dashed border-ink-200 pt-4 font-extrabold"><span>Total paid ({order.payment.method === 'cod' ? 'on delivery' : 'demo'})</span><span className="tabular-nums">{formatCurrency(order.totals.total)}</span></p>
            <p className="mt-3 text-sm text-ink-500">Delivering to {order.delivery.address}, {order.delivery.pincode}</p>
          </section>

          <section className="card p-5 sm:p-6" aria-labelledby="help-title">
            <h2 id="help-title" className="flex items-center gap-2 font-sans text-lg font-extrabold"><Headphones className="h-5 w-5 text-brand-500" aria-hidden="true" />Need help?</h2>
            <p className="mt-2 text-sm text-ink-500">Demo support — these actions don’t contact anyone.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link to="/help" className="btn btn-ghost btn-sm">Help &amp; FAQs</Link>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => push('Demo only: no call was placed.', { type: 'info' })}><Phone className="h-4 w-4" aria-hidden="true" />Call support</button>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
