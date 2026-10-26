import { AnimatePresence, motion } from 'framer-motion'
import { CircleCheck, CircleAlert, Info, X } from 'lucide-react'
import { useToast } from '../../context/ToastContext.jsx'

const ICONS = { success: CircleCheck, error: CircleAlert, info: Info }

export default function ToastViewport() {
  const { toasts, dismiss } = useToast()
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[90] flex flex-col items-center gap-2 px-4 pb-4 sm:items-end sm:pb-6 sm:pr-6" role="status" aria-live="polite">
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const Icon = ICONS[t.type] ?? Info
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl bg-ink-900 px-4 py-3 text-sm font-semibold text-white shadow-lift"
            >
              <Icon className={`h-5 w-5 shrink-0 ${t.type === 'success' ? 'text-emerald-400' : t.type === 'error' ? 'text-brand-100' : 'text-white/80'}`} aria-hidden="true" />
              <span className="min-w-0 flex-1">{t.message}</span>
              <button type="button" onClick={() => dismiss(t.id)} className="-mr-1 rounded-full p-1 text-white/70 hover:text-white" aria-label="Dismiss notification">
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
