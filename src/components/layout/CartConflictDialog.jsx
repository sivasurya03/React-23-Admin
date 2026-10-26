import ConfirmDialog from '../common/ConfirmDialog.jsx'
import { useCart } from '../../context/CartContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'

// Shown when the user adds a dish from a different restaurant than the cart currently holds.
export default function CartConflictDialog() {
  const { conflict, confirmConflict, cancelConflict } = useCart()
  const { push } = useToast()
  return (
    <ConfirmDialog
      open={Boolean(conflict)}
      title="Start a new cart?"
      message={conflict ? `Your cart has items from ${conflict.from}. Adding from ${conflict.to} will clear it first — you can only order from one restaurant at a time.` : ''}
      confirmLabel="Clear & add"
      cancelLabel="Keep current cart"
      onConfirm={() => {
        const name = conflict?.line.name
        confirmConflict()
        if (name) push(`${name} added to a fresh cart`)
      }}
      onCancel={cancelConflict}
    />
  )
}
