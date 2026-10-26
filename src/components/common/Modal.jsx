import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import useModalBehavior from '../../hooks/useModalBehavior.js'

// Render inside <AnimatePresence>. Bottom sheet on mobile, centered dialog on desktop.
export default function Modal({ title, titleId, onClose, children, footer, size = 'md', hideHeader = false, labelledBy }) {
  const ref = useModalBehavior(true, onClose)
  const width = size === 'lg' ? 'sm:max-w-2xl' : size === 'sm' ? 'sm:max-w-md' : 'sm:max-w-xl'
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6">
      <motion.div
        className="absolute inset-0 bg-ink-900/55 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        aria-hidden="true"
      />
      <motion.div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy || titleId}
        className={`relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[1.75rem] bg-cream-50 shadow-lift sm:rounded-[1.75rem] ${width}`}
        initial={{ opacity: 0, y: 40, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.98, transition: { duration: 0.16, ease: 'easeIn' } }}
        transition={{ type: 'spring', stiffness: 380, damping: 34 }}
      >
        {!hideHeader ? (
          <div className="flex items-start justify-between gap-4 border-b border-ink-200/70 px-5 py-4 sm:px-6">
            <h2 id={titleId} className="text-xl font-bold leading-snug">{title}</h2>
            <button type="button" onClick={onClose} className="-mr-2 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-500 hover:bg-cream-200" aria-label="Close dialog">
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        ) : null}
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footer ? <div className="border-t border-ink-200/70 bg-white px-5 py-4 sm:px-6">{footer}</div> : null}
      </motion.div>
    </div>,
    document.body,
  )
}
