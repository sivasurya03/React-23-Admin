import { ORDER_STATUSES } from '../../data/orderStatuses.js'

const TONES = ['bg-cream-200 text-ink-700', 'bg-sky-100 text-sky-800', 'bg-amber-100 text-amber-900', 'bg-orange-100 text-orange-800', 'bg-emerald-100 text-emerald-800']

// Pass `order` to also reflect admin cancellations; `statusIndex` alone keeps the original behaviour.
export default function StatusBadge({ statusIndex, order }) {
  if (order?.cancelled) return <span className="badge bg-red-100 text-red-800">Cancelled</span>
  const index = order ? order.statusIndex : statusIndex
  return <span className={`badge ${TONES[index] ?? TONES[0]}`}>{ORDER_STATUSES[index]?.label ?? 'Unknown'}</span>
}
