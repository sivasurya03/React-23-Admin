import VegMark from '../common/VegMark.jsx'
import { formatCurrency, selectionSummary } from '../../utils/format.js'

export default function OrderItemsList({ items }) {
  return (
    <ul className="divide-y divide-ink-200/70">
      {items.map((i) => (
        <li key={i.key} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
          <div className="min-w-0">
            <p className="flex items-center gap-2 font-bold"><VegMark veg={i.veg} /><span>{i.quantity} × {i.name}</span></p>
            {i.selections?.length ? <p className="mt-0.5 pl-6 text-sm text-ink-500">{selectionSummary(i.selections)}</p> : null}
            {i.instructions ? <p className="pl-6 text-sm italic text-ink-500">“{i.instructions}”</p> : null}
          </div>
          <p className="shrink-0 font-bold tabular-nums">{formatCurrency(i.unitPrice * i.quantity)}</p>
        </li>
      ))}
    </ul>
  )
}
