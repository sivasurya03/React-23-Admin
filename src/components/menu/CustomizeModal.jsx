import { useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import Modal from '../common/Modal.jsx'
import QuantityStepper from '../common/QuantityStepper.jsx'
import VegMark from '../common/VegMark.jsx'
import { formatCurrency } from '../../utils/format.js'
import { unitPriceFor } from '../../utils/pricing.js'
import { buildSelections } from '../../utils/customization.js'
import { MAX_LINE_QUANTITY } from '../../utils/cartLines.js'

const NOTE_MAX = 140

export default function CustomizeModal({ item, restaurantName, onClose, onConfirm }) {
  const [chosen, setChosen] = useState({})
  const [quantity, setQuantity] = useState(1)
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState({})
  const groupRefs = useRef({})

  const selections = useMemo(() => buildSelections(item, chosen), [item, chosen])
  const unit = unitPriceFor(item.price, selections)
  const total = unit * quantity

  const toggle = (group, optionId) => {
    setChosen((prev) => {
      const current = prev[group.id] ?? []
      let next
      if (group.type === 'single') next = [optionId]
      else if (current.includes(optionId)) next = current.filter((id) => id !== optionId)
      else if (group.max && current.length >= group.max) next = current
      else next = [...current, optionId]
      return { ...prev, [group.id]: next }
    })
    setErrors((prev) => {
      if (!prev[group.id]) return prev
      const { [group.id]: _removed, ...rest } = prev
      return rest
    })
  }

  const submit = () => {
    const nextErrors = {}
    for (const group of item.options) {
      if (group.required && !(chosen[group.id]?.length > 0)) nextErrors[group.id] = `Please choose ${group.title.toLowerCase().replace(/^choose /, '')} to continue.`
    }
    setErrors(nextErrors)
    const firstBad = item.options.find((g) => nextErrors[g.id])
    if (firstBad) {
      groupRefs.current[firstBad.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      groupRefs.current[firstBad.id]?.querySelector('input')?.focus({ preventScroll: true })
      return
    }
    onConfirm({ selections, instructions: note.trim(), quantity })
  }

  const missingRequired = item.options.filter((g) => g.required && !(chosen[g.id]?.length > 0)).length

  return (
    <Modal
      title={
        <span className="flex items-center gap-2">
          <VegMark veg={item.veg} />
          <span>{item.name}</span>
        </span>
      }
      titleId={`customize-${item.id}`}
      onClose={onClose}
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center justify-between gap-3 sm:justify-start">
            <QuantityStepper value={quantity} onChange={setQuantity} min={1} max={MAX_LINE_QUANTITY} label={item.name} />
            <button type="button" onClick={onClose} className="btn btn-ghost btn-sm sm:hidden">Cancel</button>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose} className="btn btn-ghost hidden sm:inline-flex">Cancel</button>
            <motion.button whileTap={{ scale: 0.97 }} type="button" onClick={submit} className="btn btn-primary flex-1 sm:flex-none sm:min-w-52">
              Add to cart · <span className="tabular-nums">{formatCurrency(total)}</span>
            </motion.button>
          </div>
        </div>
      }
    >
      <div className="px-5 py-5 sm:px-6">
        <p className="text-sm text-ink-500">From {restaurantName}</p>
        <p className="mt-1 text-sm leading-relaxed text-ink-700">{item.description}</p>
        <p className="mt-2 text-sm font-bold">Base price {formatCurrency(item.price)}</p>

        <div className="mt-5 space-y-5">
          {item.options.map((group) => {
            const picked = chosen[group.id] ?? []
            const err = errors[group.id]
            return (
              <fieldset key={group.id} ref={(el) => { groupRefs.current[group.id] = el }} className={`rounded-2xl border bg-white p-4 ${err ? 'border-brand-500 ring-2 ring-brand-100' : 'border-ink-200'}`} aria-describedby={err ? `err-${group.id}` : undefined}>
                <legend className="px-1">
                  <span className="font-sans text-base font-extrabold">{group.title}</span>
                  <span className={`ml-2 badge ${group.required ? 'bg-brand-50 text-brand-700' : 'bg-cream-100 text-ink-500'}`}>
                    {group.required ? 'Required' : group.max ? `Optional · up to ${group.max}` : 'Optional'}
                  </span>
                </legend>
                <div className="mt-2 space-y-1.5">
                  {group.options.map((opt) => {
                    const checked = picked.includes(opt.id)
                    const atMax = group.type === 'multiple' && group.max && picked.length >= group.max && !checked
                    return (
                      <label key={opt.id} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${checked ? 'border-brand-500 bg-brand-50' : 'border-transparent hover:bg-cream-50'} ${atMax ? 'cursor-not-allowed opacity-50' : ''}`}>
                        <input
                          type={group.type === 'single' ? 'radio' : 'checkbox'}
                          name={`${item.id}-${group.id}`}
                          checked={checked}
                          disabled={Boolean(atMax)}
                          onChange={() => toggle(group, opt.id)}
                          className="h-4 w-4 shrink-0 accent-[#ef4f3a]"
                        />
                        <span className="flex-1">{opt.label}</span>
                        <span className="tabular-nums text-ink-500">{opt.price ? `+${formatCurrency(opt.price)}` : 'Included'}</span>
                      </label>
                    )
                  })}
                </div>
                {err ? <p id={`err-${group.id}`} role="alert" className="field-error">{err}</p> : null}
              </fieldset>
            )
          })}

          <div>
            <label htmlFor={`note-${item.id}`} className="label">Special instructions <span className="font-medium text-ink-400">(optional)</span></label>
            <textarea
              id={`note-${item.id}`}
              value={note}
              maxLength={NOTE_MAX}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="e.g. less spicy, no onions"
              className="input resize-none"
            />
            <p className="mt-1 text-right text-xs text-ink-400">{note.length}/{NOTE_MAX}</p>
          </div>
        </div>
        {missingRequired > 0 ? <p className="mt-4 text-sm text-ink-500" aria-live="polite">{missingRequired} required {missingRequired === 1 ? 'choice' : 'choices'} left.</p> : null}
      </div>
    </Modal>
  )
}
