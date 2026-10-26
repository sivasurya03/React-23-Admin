import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CircleAlert, CircleCheck, Tag, X } from 'lucide-react'
import { useCart } from '../../context/CartContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { COUPONS } from '../../utils/pricing.js'

const SUGGESTED = ['WELCOME10', 'CRAVEO50', 'FREEDEL']

export default function CouponBox({ idPrefix = 'coupon' }) {
  const { couponCode, totals, applyCoupon, removeCoupon } = useCart()
  const { push } = useToast()
  const [code, setCode] = useState('')
  const [feedback, setFeedback] = useState(null) // { ok, message }

  // Not a <form>: this box is rendered inside the checkout <form>, and nested forms are invalid
  // (their submit events would also bubble to the outer form and try to place the order).
  const submit = (override) => {
    const result = applyCoupon(override ?? code)
    setFeedback({ ok: result.ok, message: result.message })
    if (result.ok) {
      setCode('')
      push(result.message)
    }
  }

  return (
    <section aria-label="Coupon" className="rounded-2xl border border-ink-200 bg-white p-4">
      <h3 className="flex items-center gap-2 font-sans text-sm font-extrabold"><Tag className="h-4 w-4 text-brand-500" aria-hidden="true" />Have a coupon?</h3>

      {couponCode ? (
        <div className="mt-3">
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 ${totals.couponStatus === 'applied' ? 'bg-emerald-50' : 'bg-amber-50'}`}>
            <p className="min-w-0 text-sm font-bold">
              <span className="inline-flex items-center gap-1.5">
                {totals.couponStatus === 'applied' ? <CircleCheck className="h-4 w-4 text-leaf" aria-hidden="true" /> : <CircleAlert className="h-4 w-4 text-amber-700" aria-hidden="true" />}
                {couponCode}
              </span>
              <span className="mt-0.5 block text-xs font-medium text-ink-500">
                {totals.couponStatus === 'applied' ? COUPONS[couponCode]?.title : totals.couponMessage}
              </span>
            </p>
            <button type="button" onClick={() => { removeCoupon(); setFeedback(null) }} className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full px-3 text-xs font-bold text-ink-700 hover:bg-white" aria-label={`Remove coupon ${couponCode}`}>
              <X className="h-3.5 w-3.5" aria-hidden="true" />Remove
            </button>
          </motion.div>
        </div>
      ) : (
        <div className="mt-3 flex gap-2" role="group" aria-label="Apply coupon code">
          <label htmlFor={`${idPrefix}-input`} className="sr-only">Coupon code</label>
          <input
            id={`${idPrefix}-input`}
            value={code}
            onChange={(e) => { setCode(e.target.value.toUpperCase()); if (feedback) setFeedback(null) }}
            placeholder="Enter code"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={feedback && !feedback.ok ? 'true' : 'false'}
            aria-describedby={feedback ? `${idPrefix}-msg` : undefined}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit() } }}
            className="input min-w-0 flex-1 uppercase tracking-wider"
          />
          <button type="button" onClick={() => submit()} className="btn btn-dark">Apply</button>
        </div>
      )}

      <AnimatePresence mode="wait">
        {feedback && !couponCode ? (
          <motion.p
            key={feedback.message}
            id={`${idPrefix}-msg`}
            role={feedback.ok ? 'status' : 'alert'}
            initial={{ opacity: 0, x: feedback.ok ? 0 : -6 }}
            animate={{ opacity: 1, x: feedback.ok ? 0 : [0, -6, 6, -3, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={`mt-2 text-sm font-semibold ${feedback.ok ? 'text-leaf' : 'text-brand-600'}`}
          >
            {feedback.message}
          </motion.p>
        ) : null}
      </AnimatePresence>

      {!couponCode ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {SUGGESTED.map((c) => (
            <button key={c} type="button" onClick={() => { setCode(c); submit(c) }} className="rounded-full border border-dashed border-ink-400/60 px-3 py-1.5 text-xs font-bold text-ink-700 hover:border-brand-500 hover:text-brand-600" title={COUPONS[c].description}>
              {c}
            </button>
          ))}
        </div>
      ) : null}
      <ul className="mt-3 space-y-1 text-xs text-ink-500">
        {SUGGESTED.map((c) => <li key={c}><span className="font-bold text-ink-700">{c}</span> — {COUPONS[c].description}</li>)}
      </ul>
    </section>
  )
}
