import { useState } from 'react'
import { Banknote } from 'lucide-react'
import { useOrders } from '../../context/OrderContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { formatCurrency, formatDateTime } from '../../utils/format.js'

const TONE = { requested: 'bg-amber-100 text-amber-900', approved: 'bg-emerald-100 text-emerald-800', rejected: 'bg-red-100 text-red-800' }
const LABEL = { requested: 'Under review', approved: 'Approved (simulated)', rejected: 'Rejected' }

// Demo refund request. Approving a refund only updates a simulated record — no money moves.
export default function RefundPanel({ order }) {
  const { requestRefund } = useOrders()
  const { push } = useToast()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const refund = order.refund
  const delivered = order.statusIndex >= 4 && !order.cancelled
  const prepaidCancelled = order.cancelled && order.payment?.method && order.payment.method !== 'cod'
  const eligible = (delivered || prepaidCancelled) && (!refund || refund.status === 'rejected')

  if (!refund && !eligible) return null

  const submit = (event) => {
    event.preventDefault()
    const result = requestRefund(order.id, { reason })
    if (!result.ok) { setError(result.error); return }
    setError('')
    setOpen(false)
    setReason('')
    push('Refund request sent for review (demo — no real payment is involved)', { type: 'info' })
  }

  return (
    <section className="card p-5 sm:p-6" aria-labelledby="refund-title">
      <h2 id="refund-title" className="flex items-center gap-2 font-sans text-lg font-extrabold"><Banknote className="h-5 w-5 text-brand-500" aria-hidden="true" />Refund</h2>
      {refund ? (
        <div className="mt-3 space-y-1 text-sm">
          <p className="flex items-center gap-2"><span className={`badge ${TONE[refund.status]}`}>{LABEL[refund.status]}</span><span className="font-bold tabular-nums">{formatCurrency(refund.amount)}</span></p>
          <p className="text-ink-500">Requested {formatDateTime(refund.requestedAt)} — “{refund.reason}”</p>
          {refund.reviewNote ? <p className="text-ink-700">Review note: {refund.reviewNote}</p> : null}
          <p className="text-xs text-ink-400">Simulated record only. No real payment is refunded in this demo.</p>
        </div>
      ) : null}
      {eligible && !open ? <button type="button" className="btn btn-ghost btn-sm mt-3" onClick={() => setOpen(true)}>{refund ? 'Request again' : 'Request a refund'}</button> : null}
      {open ? (
        <form onSubmit={submit} className="mt-3 space-y-3" noValidate>
          <label className="block text-sm font-bold" htmlFor="refund-reason">What went wrong?</label>
          <textarea id="refund-reason" className="input min-h-24 w-full" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} aria-invalid={Boolean(error)} aria-describedby={error ? 'refund-error' : undefined} />
          {error ? <p id="refund-error" className="field-error" role="alert">{error}</p> : null}
          <div className="flex gap-2">
            <button type="submit" className="btn btn-primary btn-sm">Send request</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setOpen(false); setError('') }}>Cancel</button>
          </div>
        </form>
      ) : null}
    </section>
  )
}
