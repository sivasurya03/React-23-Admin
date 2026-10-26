import { motion } from 'framer-motion'
import { Bike, ChefHat, CircleCheck, PackageCheck, Receipt } from 'lucide-react'
import { ORDER_STATUSES } from '../../data/orderStatuses.js'
import { formatTime } from '../../utils/format.js'

const ICONS = [Receipt, CircleCheck, ChefHat, Bike, PackageCheck]

export default function OrderTimeline({ statusIndex, history = [] }) {
  const pct = (statusIndex / (ORDER_STATUSES.length - 1)) * 100
  return (
    <div className="relative">
      <div className="mb-6 h-2 overflow-hidden rounded-full bg-cream-200" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label="Order progress">
        <motion.div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-amber-accent" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} />
      </div>
      <ol className="relative space-y-0">
        {ORDER_STATUSES.map((s, i) => {
          const Icon = ICONS[i]
          const done = i < statusIndex
          const current = i === statusIndex
          const stamp = history.find((h) => h.index === i)
          return (
            <li key={s.id} className="relative flex gap-4 pb-7 last:pb-0" aria-current={current ? 'step' : undefined}>
              {i < ORDER_STATUSES.length - 1 ? (
                <span className="absolute left-[1.3rem] top-11 h-[calc(100%-2.75rem)] w-0.5 overflow-hidden rounded bg-ink-200" aria-hidden="true">
                  <motion.span className="block w-full bg-brand-500" initial={{ height: 0 }} animate={{ height: done ? '100%' : 0 }} transition={{ duration: 0.6, delay: 0.1 }} />
                </span>
              ) : null}
              <motion.span
                initial={false}
                animate={{ scale: current ? 1.06 : 1 }}
                className={`relative z-10 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 ${done ? 'border-brand-500 bg-brand-500 text-white' : current ? 'border-brand-500 bg-white text-brand-600 ring-4 ring-brand-100' : 'border-ink-200 bg-white text-ink-400'}`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                {current && statusIndex < ORDER_STATUSES.length - 1 ? <span className="absolute inset-0 animate-ping rounded-full bg-brand-500/20 motion-reduce:hidden" aria-hidden="true" /> : null}
              </motion.span>
              <div className="min-w-0 pt-1">
                <p className={`font-extrabold ${done || current ? 'text-ink-900' : 'text-ink-400'}`}>
                  {s.label}
                  {current ? <span className="ml-2 badge bg-brand-50 text-brand-700 align-middle">{statusIndex === ORDER_STATUSES.length - 1 ? 'Completed' : 'Current'}</span> : null}
                </p>
                <p className={`text-sm ${done || current ? 'text-ink-500' : 'text-ink-400'}`}>{s.description}</p>
                {stamp ? <p className="mt-0.5 text-xs font-semibold text-ink-400">{formatTime(stamp.at)}</p> : null}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
