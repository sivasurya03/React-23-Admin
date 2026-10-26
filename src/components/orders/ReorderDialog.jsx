import ConfirmDialog from '../common/ConfirmDialog.jsx'

export default function ReorderDialog({ pending, onConfirm, onCancel }) {
  return (
    <ConfirmDialog
      open={Boolean(pending)}
      title="Replace your current cart?"
      message={pending ? `Your cart has items from another restaurant. Reordering from ${pending.from} will clear it first.` : ''}
      confirmLabel="Replace cart"
      cancelLabel="Keep current cart"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  )
}
