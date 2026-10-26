import { AnimatePresence } from 'framer-motion'
import Modal from './Modal.jsx'

export default function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false, onConfirm, onCancel }) {
  return (
    <AnimatePresence>
      {open ? (
        <Modal key="confirm" title={title} titleId="confirm-title" onClose={onCancel} size="sm">
          <div className="px-5 py-5 sm:px-6">
            <p className="text-ink-500">{message}</p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" className="btn btn-ghost" onClick={onCancel} data-autofocus>{cancelLabel}</button>
              <button type="button" className={`btn ${danger ? 'btn-dark' : 'btn-primary'}`} onClick={onConfirm}>{confirmLabel}</button>
            </div>
          </div>
        </Modal>
      ) : null}
    </AnimatePresence>
  )
}
