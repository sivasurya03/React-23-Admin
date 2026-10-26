import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Banknote, CreditCard, Info, LoaderCircle, ShieldCheck, Smartphone } from 'lucide-react'
import Field from '../components/checkout/Field.jsx'
import { describedBy } from '../utils/a11y.js'
import PriceBreakdown from '../components/cart/PriceBreakdown.jsx'
import CouponBox from '../components/cart/CouponBox.jsx'
import OrderItemsList from '../components/orders/OrderItemsList.jsx'
import EmptyState from '../components/common/EmptyState.jsx'
import { useCart } from '../context/CartContext.jsx'
import { useOrders } from '../context/OrderContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { buildDeliverySlots } from '../utils/deliverySlots.js'
import { validateCheckout } from '../utils/validation.js'
import { formatCurrency } from '../utils/format.js'
import usePageTitle from '../hooks/usePageTitle.js'

const PAYMENTS = [
  { id: 'cod', label: 'Cash on Delivery', desc: 'Pay when your order arrives.', icon: Banknote },
  { id: 'upi', label: 'UPI (demo)', desc: 'Simulated — no payment is processed.', icon: Smartphone },
  { id: 'card', label: 'Card (demo)', desc: 'Simulated — never enter real card details.', icon: CreditCard },
]
const PAYMENT_LABEL = { cod: 'Cash on Delivery', upi: 'UPI (demo — not charged)', card: 'Card (demo — not charged)' }

export default function Checkout() {
  usePageTitle('Checkout — Craveo')
  const { items, restaurant, totals, couponCode, clearCart } = useCart()
  const { placeOrder } = useOrders()
  const { user } = useAuth()
  const { push } = useToast()
  const navigate = useNavigate()

  const slots = useMemo(() => buildDeliverySlots(new Date(), restaurant?.deliveryTime ?? 30), [restaurant])
  const [values, setValues] = useState(() => ({
    name: user && !user.demo ? user.name : '', email: user && !user.demo ? user.email : '', phone: '',
    address: '', pincode: '', landmark: '', instructions: '', deliveryTime: 'asap', payment: 'cod', upiId: '',
  }))
  const [touched, setTouched] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const lockRef = useRef(false)
  const tokenRef = useRef(`${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`)

  const errors = useMemo(() => validateCheckout(values), [values])
  const show = (name) => (submitted || touched[name]) && errors[name]

  if (!items.length && !loading) {
    return <div className="container-page py-10"><EmptyState title="Nothing to check out" message="Your cart is empty. Add something tasty first." actionLabel="Browse restaurants" actionTo="/restaurants" /></div>
  }

  const set = (name) => (e) => setValues((v) => ({ ...v, [name]: e.target.value }))
  const blur = (name) => () => setTouched((t) => ({ ...t, [name]: true }))
  const inputProps = (name, hint) => ({
    id: name, name, value: values[name], onChange: set(name), onBlur: blur(name),
    'aria-invalid': show(name) ? 'true' : 'false', 'aria-describedby': describedBy(name, show(name), hint),
  })

  const submit = (e) => {
    e.preventDefault()
    if (lockRef.current) return // blocks double-clicks / repeated Enter
    setSubmitted(true)
    const found = Object.keys(errors)
    if (found.length) {
      push('Please fix the highlighted fields', { type: 'error' })
      document.getElementById(found[0])?.focus()
      return
    }
    if (!items.length) return
    lockRef.current = true
    setLoading(true)
    // Simulated network delay — there is no backend and no payment gateway.
    setTimeout(() => {
      const slot = slots.find((s) => s.id === values.deliveryTime)
      const order = placeOrder({
        clientToken: tokenRef.current,
        restaurant,
        items,
        totals,
        couponCode: totals.couponStatus === 'applied' ? couponCode : null,
        customer: { name: values.name.trim(), email: values.email.trim(), phone: values.phone.trim() },
        delivery: { address: values.address.trim(), pincode: values.pincode.trim(), landmark: values.landmark.trim(), instructions: values.instructions.trim(), timeLabel: slot?.label ?? 'ASAP' },
        payment: { method: values.payment, label: PAYMENT_LABEL[values.payment], demo: true },
      })
      clearCart()
      push(`Order ${order.id} placed (demo)`)
      navigate(`/order-success/${order.id}`, { replace: true })
    }, 1400)
  }

  const card = 'card p-5 sm:p-6'
  return (
    <div className="container-page py-8 sm:py-12">
      <h1 className="text-4xl font-bold sm:text-5xl">Checkout</h1>
      <p className="mt-2 flex items-start gap-2 text-sm text-ink-500"><Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />Demo checkout: no real order, payment or delivery will happen.</p>

      <form onSubmit={submit} noValidate className="mt-8 grid gap-8 lg:grid-cols-[1fr_24rem] lg:items-start" aria-busy={loading}>
        <div className="space-y-6">
          <fieldset className={card} disabled={loading}>
            <legend className="sr-only">Contact information</legend>
            <h2 className="mb-4 font-sans text-lg font-extrabold">1. Contact information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><Field id="name" label="Full name" error={show('name')}><input className="input" autoComplete="name" {...inputProps('name')} /></Field></div>
              <Field id="email" label="Email" error={show('email')}><input type="email" inputMode="email" autoComplete="email" className="input" {...inputProps('email')} /></Field>
              <Field id="phone" label="Phone number" error={show('phone')} hint="10-digit mobile, e.g. 98765 43210"><input type="tel" inputMode="tel" autoComplete="tel" className="input" {...inputProps('phone', true)} /></Field>
            </div>
          </fieldset>

          <fieldset className={card} disabled={loading}>
            <legend className="sr-only">Delivery details</legend>
            <h2 className="mb-4 font-sans text-lg font-extrabold">2. Delivery address</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><Field id="address" label="Address" error={show('address')} hint="House / flat no., building, street, area"><textarea rows={3} className="input resize-none" autoComplete="street-address" {...inputProps('address', true)} /></Field></div>
              <Field id="pincode" label="PIN code" error={show('pincode')}><input inputMode="numeric" maxLength={6} autoComplete="postal-code" className="input" {...inputProps('pincode')} /></Field>
              <Field id="landmark" label="Landmark" required={false}><input className="input" placeholder="Near…" {...inputProps('landmark')} /></Field>
              <div className="sm:col-span-2"><Field id="instructions" label="Delivery instructions" required={false}><input className="input" placeholder="e.g. Ring the bell twice, leave at the door" maxLength={160} {...inputProps('instructions')} /></Field></div>
            </div>
          </fieldset>

          <fieldset className={card} disabled={loading}>
            <legend className="mb-4 font-sans text-lg font-extrabold">3. Delivery time</legend>
            <div className="space-y-2">
              {slots.map((s) => (
                <label key={s.id} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 py-2 text-sm font-semibold ${values.deliveryTime === s.id ? 'border-brand-500 bg-brand-50' : 'border-ink-200 hover:border-ink-400'}`}>
                  <input type="radio" name="deliveryTime" value={s.id} checked={values.deliveryTime === s.id} onChange={set('deliveryTime')} className="h-4 w-4 accent-[#ef4f3a]" />{s.label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className={card} disabled={loading}>
            <legend className="mb-4 font-sans text-lg font-extrabold">4. Payment method</legend>
            <div className="space-y-2">
              {PAYMENTS.map(({ id, label, desc, icon: Icon }) => (
                <label key={id} className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 ${values.payment === id ? 'border-brand-500 bg-brand-50' : 'border-ink-200 hover:border-ink-400'}`}>
                  <input type="radio" name="payment" value={id} checked={values.payment === id} onChange={set('payment')} className="h-4 w-4 accent-[#ef4f3a]" />
                  <Icon className="h-5 w-5 text-ink-500" aria-hidden="true" />
                  <span><span className="block text-sm font-extrabold">{label}</span><span className="block text-xs text-ink-500">{desc}</span></span>
                </label>
              ))}
            </div>
            {values.payment === 'upi' ? (
              <div className="mt-4"><Field id="upiId" label="UPI ID" required={false} error={show('upiId')} hint="Optional. Not verified or stored."><input className="input" placeholder="name@bank" autoComplete="off" {...inputProps('upiId', true)} /></Field></div>
            ) : null}
            {values.payment !== 'cod' ? (
              <p className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-900"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />This is a demonstration. No payment will be processed and no card details are collected — don’t enter any.</p>
            ) : null}
          </fieldset>
        </div>

        <aside aria-label="Order summary" className="space-y-4 lg:sticky lg:top-24">
          <div className={card}>
            <h2 className="font-sans text-lg font-extrabold">Order summary</h2>
            <p className="mb-4 text-sm text-ink-500">{restaurant?.name}</p>
            <OrderItemsList items={items} />
            <Link to="/cart" className="mt-3 inline-block text-sm font-bold text-brand-600 hover:underline">Edit cart</Link>
          </div>
          <CouponBox idPrefix="checkout-coupon" />
          <div className={card}>
            <PriceBreakdown totals={totals} couponCode={totals.couponStatus === 'applied' ? couponCode : null} />
            <motion.button whileTap={{ scale: 0.98 }} type="submit" disabled={loading} className="btn btn-primary mt-5 w-full !min-h-12" aria-live="polite">
              {loading ? (<><LoaderCircle className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />Placing your order…</>) : `Place order · ${formatCurrency(totals.total)}`}
            </motion.button>
            <p className="mt-3 text-center text-xs text-ink-400">By placing this demo order you agree it is not a real purchase.</p>
          </div>
        </aside>
      </form>
    </div>
  )
}
