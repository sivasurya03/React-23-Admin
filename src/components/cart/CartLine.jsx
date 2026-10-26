import { Trash2 } from 'lucide-react'
import FoodImage from '../common/FoodImage.jsx'
import VegMark from '../common/VegMark.jsx'
import QuantityStepper from '../common/QuantityStepper.jsx'
import { formatCurrency, selectionSummary } from '../../utils/format.js'
import { MAX_LINE_QUANTITY } from '../../utils/cartLines.js'

export default function CartLine({ line, cuisine, onQuantity, onRemove }) {
  return (
    <div className="flex gap-4">
      <FoodImage photo={line.image} category={cuisine} alt={line.name} width={240} className="h-20 w-20 shrink-0 rounded-2xl sm:h-24 sm:w-24" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-start gap-2 font-extrabold"><VegMark veg={line.veg} className="mt-1" /><span className="line-clamp-2">{line.name}</span></p>
            {line.selections.length ? <p className="mt-1 text-sm text-ink-500">{selectionSummary(line.selections)}</p> : null}
            {line.instructions ? <p className="mt-0.5 text-sm italic text-ink-500">“{line.instructions}”</p> : null}
          </div>
          <p className="shrink-0 font-extrabold tabular-nums">{formatCurrency(line.unitPrice * line.quantity)}</p>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <QuantityStepper size="sm" value={line.quantity} min={1} max={MAX_LINE_QUANTITY} onChange={(q) => onQuantity(line.key, q)} label={line.name} />
          <p className="hidden text-xs text-ink-400 sm:block">{formatCurrency(line.unitPrice)} each</p>
          <button type="button" onClick={() => onRemove(line.key)} className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-sm font-bold text-ink-500 hover:bg-brand-50 hover:text-brand-600" aria-label={`Remove ${line.name} from cart`}>
            <Trash2 className="h-4 w-4" aria-hidden="true" />Remove
          </button>
        </div>
      </div>
    </div>
  )
}
