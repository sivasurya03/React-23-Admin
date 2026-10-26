import EmptyState from '../common/EmptyState.jsx'

export default function OrderNotFound({ orderId }) {
  return (
    <div className="container-page py-10">
      <EmptyState
        title="We can’t find that order"
        message={`No order with ID “${orderId}” exists in this browser. Demo orders are saved only on the device that placed them.`}
        actionLabel="View my orders"
        actionTo="/orders"
      />
    </div>
  )
}
