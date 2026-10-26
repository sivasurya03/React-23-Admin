import { formatCurrency } from '../../utils/format.js'
import { getRuntimeConfig } from '../../utils/runtimeConfig.js'

const WAIVER_TEXT = { threshold: 'Free delivery unlocked', coupon: 'Waived by FREEDEL', plus: 'Waived with Craveo Plus' }

function Row({ label, value, hint, tone = '', strong = false }) {
  return (
    <div className={`flex items-start justify-between gap-4 ${strong ? 'text-lg font-extrabold' : 'text-sm'} ${tone}`}>
      <dt className="min-w-0">
        {label}
        {hint ? <span className="block text-xs font-medium text-ink-400">{hint}</span> : null}
      </dt>
      <dd className="shrink-0 tabular-nums font-bold">{value}</dd>
    </div>
  )
}

export default function PriceBreakdown({ totals, couponCode }) {
  const waived = totals.deliveryWaivedBy
  return (
    <dl className="space-y-3" aria-label="Price breakdown">
      <Row label="Item total" value={formatCurrency(totals.subtotal)} />
      {totals.discount > 0 ? <Row label={`Discount${couponCode ? ` (${couponCode})` : ''}`} value={`− ${formatCurrency(totals.discount)}`} tone="text-leaf" /> : null}
      <div className="flex items-start justify-between gap-4 text-sm">
        <dt className="min-w-0">
          Delivery fee
          {waived ? <span className="block text-xs font-semibold text-leaf">{WAIVER_TEXT[waived]}</span> : null}
        </dt>
        <dd className="shrink-0 tabular-nums font-bold">
          {waived ? (
            <>
              <span className="mr-1.5 text-ink-400 line-through">{formatCurrency(totals.deliveryFeeBase)}</span>
              <span className="text-leaf">FREE</span>
            </>
          ) : totals.deliveryFee === 0 ? <span className="text-leaf">FREE</span> : formatCurrency(totals.deliveryFee)}
        </dd>
      </div>
      <Row label="Platform fee" value={formatCurrency(totals.platformFee)} hint="Flat fee per order" />
      <Row label={`GST (${Math.round(getRuntimeConfig().gstRate * 100)}%)`} value={formatCurrency(totals.gst)} hint="On food total after discount" />
      <div className="border-t border-dashed border-ink-200 pt-3">
        <Row label="Grand total" value={formatCurrency(totals.total)} strong />
      </div>
    </dl>
  )
}
