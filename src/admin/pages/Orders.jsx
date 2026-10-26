import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Ban, FastForward, UserCheck } from 'lucide-react'
import { useAdmin } from '../context/adminContextValue.js'
import { Alert, Badge, Card, ConfirmAction, DataTable, DemoBadge, Dialog, Fade, FilterBar, FilterSelect, KeyValue, PageHeader, ReasonDialog, SearchInput, SelectField, StatusBadge, Tabs, TextField, TextAreaField } from '../components/ui.jsx'
import { useListState, useRun } from '../components/uiHooks.js'
import { CATEGORY_TABS, canCancel, matchesTab, nextStatus, paymentStatusOf, statusLabel } from '../lib/orders.js'
import { filterByRange, resolveRange } from '../lib/analytics.js'
import { queryRows } from '../lib/table.js'
import { ORDER_STATUSES } from '../../data/orderStatuses.js'
import { formatCurrency, formatDateTime } from '../../utils/format.js'
import usePageTitle from '../../hooks/usePageTitle.js'

const STATUS_OPTIONS = [...ORDER_STATUSES.map((s) => ({ value: s.id, label: s.label })), { value: 'cancelled', label: 'Cancelled' }]
const orderTone = (o) => (o.cancelled ? 'cancelled' : o.statusIndex >= 4 ? 'delivered' : o.statusIndex === 0 ? 'pending' : o.statusIndex === 3 ? 'in_progress' : 'confirmed')

function Timeline({ order }) {
  const done = new Map(order.statusHistory.filter((h) => h.index !== undefined).map((h) => [h.index, h]))
  return (
    <ol className="space-y-3" aria-label="Order status timeline">
      {ORDER_STATUSES.map((s, i) => {
        const h = done.get(i)
        return (
          <li key={s.id} className="flex items-start gap-3 text-sm">
            <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${h ? 'bg-brand-500' : 'bg-ink-200'}`} aria-hidden="true" />
            <div><p className={`font-bold ${h ? '' : 'text-ink-400'}`}>{s.label}</p>{h ? <p className="text-xs text-ink-500">{formatDateTime(h.at)}{h.by ? ` · ${h.by}` : ''}</p> : <p className="text-xs text-ink-400">Not reached</p>}</div>
          </li>
        )
      })}
      {order.cancelled ? <li className="flex items-start gap-3 text-sm"><span className="mt-1 h-3 w-3 shrink-0 rounded-full bg-red-500" aria-hidden="true" /><div><p className="font-bold text-red-700">Cancelled</p><p className="text-xs text-ink-500">{formatDateTime(order.cancelled.at)} · {order.cancelled.by}</p><p className="text-xs text-ink-700">“{order.cancelled.reason}”</p></div></li> : null}
    </ol>
  )
}

function RefundBox({ order, can, onReview, onCreate }) {
  const r = order.refund
  if (!r) {
    const eligible = (order.statusIndex >= 4 && !order.cancelled) || (order.cancelled && order.payment?.method && order.payment.method !== 'cod')
    if (!eligible || !can('orders', 'refund')) return <p className="text-sm text-ink-500">No refund on this order.</p>
    return <button type="button" className="btn btn-ghost btn-sm" onClick={onCreate}>Create refund request</button>
  }
  return (
    <div className="space-y-2 text-sm">
      <p className="flex flex-wrap items-center gap-2"><StatusBadge status={r.status} /><span className="font-bold tabular-nums">{formatCurrency(r.amount)}</span><Badge tone="warn">Simulated</Badge></p>
      <p className="text-ink-700">Requested by {r.requestedByName} ({r.requestedBy}) on {formatDateTime(r.requestedAt)}: “{r.reason}”</p>
      {r.status !== 'requested' ? <p className="text-ink-700">Reviewed by {r.reviewedBy} on {formatDateTime(r.reviewedAt)}: “{r.reviewNote}”</p> : null}
      {r.status === 'requested' && can('orders', 'refund') ? <div className="flex gap-2"><button type="button" className="btn btn-primary btn-sm" onClick={() => onReview('approve')}>Approve</button><button type="button" className="btn btn-ghost btn-sm" onClick={() => onReview('reject')}>Reject</button></div> : null}
      {r.status === 'rejected' && can('orders', 'refund') ? <button type="button" className="btn btn-ghost btn-sm" onClick={onCreate}>Create a new request</button> : null}
      <p className="text-xs text-ink-400">Approving only updates this simulated record. No real payment is refunded.</p>
    </div>
  )
}

function OrderDetail({ order, onClose }) {
  const { actions, can, state, orders } = useAdmin()
  const run = useRun()
  const [dialog, setDialog] = useState(null)
  const [partnerId, setPartnerId] = useState('')
  const [refundForm, setRefundForm] = useState({ reason: '', amount: '' })
  const [refundErr, setRefundErr] = useState('')
  const next = nextStatus(order)
  const t = order.totals
  const load = (id) => orders.filter((o) => o.partnerId === id && !o.cancelled && o.statusIndex < 4).length
  const verified = state.partners.filter((p) => p.verification === 'approved' && p.active !== false)
  const canEdit = can('orders', 'edit')
  const closed = order.cancelled || order.statusIndex >= 4

  return (
    <>
      <Dialog open title={`Order ${order.id}`} onClose={onClose} size="lg">
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={orderTone(order)} label={statusLabel(order)} />
            <StatusBadge status={paymentStatusOf(order)} label={`Payment: ${paymentStatusOf(order)}`} />
            {order.source === 'demo' ? <DemoBadge /> : <Badge tone="good">Live order</Badge>}
          </div>
          {canEdit && !closed ? (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Order actions">
              {next ? <button type="button" className="btn btn-primary btn-sm" onClick={() => setDialog('advance')}><FastForward className="h-4 w-4" aria-hidden="true" />Mark as {next.label}</button> : null}
              {canCancel(order) ? <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDialog('cancel')}><Ban className="h-4 w-4" aria-hidden="true" />Cancel order</button> : null}
            </div>
          ) : null}

          <div className="grid gap-6 md:grid-cols-2">
            <Card title="Customer & delivery"><KeyValue items={[['Customer', order.customer?.name], ['Email', order.customer?.email], ['Phone', order.customer?.phone], ['Placed', formatDateTime(order.createdAt)], ['Address', `${order.delivery?.address ?? '—'}${order.delivery?.pincode ? `, ${order.delivery.pincode}` : ''}`], ['Slot', order.delivery?.timeLabel]]} /></Card>
            <Card title="Restaurant"><KeyValue items={[['Name', order.restaurant?.name], ['Area', order.restaurant?.area], ['Address', order.restaurant?.address], ['Payment', order.payment?.label ?? order.payment?.method], ['Coupon', order.couponCode ?? 'None']]} /></Card>
          </div>

          <Card title="Items" padded={false}>
            <div className="overflow-x-auto"><table className="w-full min-w-[26rem] text-sm"><thead className="bg-cream-100 text-left text-xs uppercase tracking-wider text-ink-500"><tr><th className="px-4 py-2">Item</th><th className="px-4 py-2">Qty</th><th className="px-4 py-2 text-right">Price</th></tr></thead>
              <tbody className="divide-y divide-ink-200/60">{order.items.map((i) => <tr key={i.key ?? i.itemId}><td className="px-4 py-2"><span className="font-semibold">{i.name}</span>{i.selections?.length ? <span className="block text-xs text-ink-500">{i.selections.map((s) => s.label).join(' · ')}</span> : null}</td><td className="px-4 py-2">{i.quantity}</td><td className="px-4 py-2 text-right tabular-nums">{formatCurrency(i.unitPrice * i.quantity)}</td></tr>)}</tbody></table></div>
            <dl className="space-y-1 border-t border-ink-200/70 p-4 text-sm">
              {[['Subtotal', t.subtotal], ['Discount', -t.discount], ['Delivery fee', t.deliveryFee], ['Platform fee', t.platformFee], ['GST', t.gst]].map(([k, v]) => <div key={k} className="flex justify-between"><dt className="text-ink-500">{k}</dt><dd className="tabular-nums">{v < 0 ? `−${formatCurrency(-v)}` : formatCurrency(v)}</dd></div>)}
              <div className="flex justify-between border-t border-dashed border-ink-200 pt-2 font-extrabold"><dt>Total</dt><dd className="tabular-nums">{formatCurrency(t.total)}</dd></div>
            </dl>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card title="Status timeline"><Timeline order={order} /></Card>
            <div className="space-y-6">
              <Card title="Delivery partner">
                <p className="text-sm">{order.partnerId ? <><span className="font-bold">{order.partner?.name}</span> · {order.partner?.vehicle}</> : <span className="text-ink-500">Not assigned{order.partner?.name && order.partner.name !== 'Unassigned' ? ` (demo placeholder “${order.partner.name}” is shown to the customer)` : ''}.</span>}</p>
                {order.assignments?.length ? <p className="mt-1 text-xs text-ink-400">{order.assignments.length} assignment{order.assignments.length > 1 ? 's' : ''}; last by {order.assignments.at(-1).by}.</p> : null}
                {canEdit && !closed ? (
                  <div className="mt-3 flex flex-wrap items-end gap-2">
                    <SelectField label={order.partnerId ? 'Reassign to' : 'Assign to'} className="min-w-0 flex-1" value={partnerId} onChange={(e) => setPartnerId(e.target.value)} placeholder="Choose a partner" options={verified.map((p) => ({ value: p.id, label: `${p.name} · ${p.online ? 'online' : 'offline'} · ${load(p.id)} active`, disabled: !p.online }))} />
                    <button type="button" className="btn btn-dark btn-sm mb-0.5" disabled={!partnerId} onClick={() => { if (run(actions.assignPartner(order.id, partnerId), 'Partner assigned')) setPartnerId('') }}><UserCheck className="h-4 w-4" aria-hidden="true" />Assign</button>
                  </div>
                ) : null}
                <p className="mt-2 text-xs text-ink-400">Delivery progress is simulated from status changes. No live GPS data exists.</p>
              </Card>
              <Card title="Refund"><RefundBox order={order} can={can} onCreate={() => { setRefundForm({ reason: '', amount: '' }); setRefundErr(''); setDialog('refund-create') }} onReview={(d) => setDialog(`refund-${d}`)} /></Card>
            </div>
          </div>
        </div>
      </Dialog>

      <ConfirmAction open={dialog === 'advance'} title="Update order status" message={next ? `Mark ${order.id} as “${next.label}”? The customer's order tracking will update too.` : ''} confirmLabel="Update status" onCancel={() => setDialog(null)} onConfirm={() => { const r = actions.advanceOrder(order.id); if (r.ok) setDialog(null); return run(r, 'Status updated') ? r : r }} />
      <ReasonDialog open={dialog === 'cancel'} title="Cancel this order?" message="This cannot be undone. The customer will see the order as cancelled. Prepaid orders get a refund request for review." label="Cancellation reason" confirmLabel="Cancel order" danger onCancel={() => setDialog(null)} onConfirm={(reason) => { const r = actions.cancelOrder(order.id, reason); if (r.ok) { setDialog(null); run(r, 'Order cancelled') } return r }} />
      <ReasonDialog open={dialog === 'refund-approve' || dialog === 'refund-reject'} title={dialog === 'refund-approve' ? 'Approve refund (simulated)' : 'Reject refund'} message={dialog === 'refund-approve' ? `Approve ${formatCurrency(order.refund?.amount ?? 0)}? This only updates the demo ledger; no real money moves.` : 'The customer will see the rejection and your reason.'} label="Decision reason" confirmLabel={dialog === 'refund-approve' ? 'Approve refund' : 'Reject refund'} danger={dialog === 'refund-reject'} onCancel={() => setDialog(null)} onConfirm={(note) => { const r = actions.reviewRefund(order.id, { decision: dialog === 'refund-approve' ? 'approve' : 'reject', note }); if (r.ok) { setDialog(null); run(r, dialog === 'refund-approve' ? 'Refund approved (simulated)' : 'Refund rejected') } return r }} />
      <Dialog open={dialog === 'refund-create'} title="Create refund request" onClose={() => setDialog(null)} size="sm"
        footer={<div className="flex justify-end gap-3"><button type="button" className="btn btn-ghost" onClick={() => setDialog(null)}>Cancel</button><button type="button" className="btn btn-primary" onClick={() => { const r = actions.requestRefund(order.id, refundForm); if (!r.ok) setRefundErr(r.error); else { setDialog(null); run(r, 'Refund request created') } }}>Create request</button></div>}>
        <div className="space-y-4"><TextField label={`Amount (max ${formatCurrency(t.total)})`} type="number" min="1" value={refundForm.amount} placeholder={String(t.total)} onChange={(e) => { setRefundForm({ ...refundForm, amount: e.target.value }); setRefundErr('') }} /><TextAreaField label="Reason" value={refundForm.reason} onChange={(e) => { setRefundForm({ ...refundForm, reason: e.target.value }); setRefundErr('') }} error={refundErr} maxLength={300} /></div>
      </Dialog>
    </>
  )
}

export default function Orders() {
  usePageTitle('Orders — Craveo Admin')
  const { orders } = useAdmin()
  const [params, setParams] = useSearchParams()
  const tab = CATEGORY_TABS.some((t) => t.id === params.get('tab')) ? params.get('tab') : 'all'
  const q = params.get('q') ?? ''
  const list = useListState({ filters: { status: 'all', source: 'all' }, sortKey: 'date', sortDir: 'desc' })
  const [dates, setDates] = useState({ from: '', to: '' })
  const [openId, setOpenId] = useState(null)

  const setParam = (key, value) => { const n = new URLSearchParams(params); if (value) n.set(key, value); else n.delete(key); setParams(n, { replace: true }); list.setPage(1) }
  const range = dates.from && dates.to ? resolveRange({ preset: 'custom', ...dates }) : null
  const dated = useMemo(() => (range && !range.error ? filterByRange(orders, range) : orders), [orders, range])
  const counts = useMemo(() => Object.fromEntries(CATEGORY_TABS.map((t) => [t.id, dated.filter((o) => matchesTab(o, t.id)).length])), [dated])
  const rows = useMemo(() => dated.filter((o) => matchesTab(o, tab)), [dated, tab])
  const result = queryRows(rows, {
    search: q, searchKeys: ['id', 'customer.name', 'customer.email', 'restaurant.name'], filters: list.filters,
    filterFns: { status: (o, v) => (v === 'cancelled' ? Boolean(o.cancelled) : !o.cancelled && ORDER_STATUSES[o.statusIndex]?.id === v), source: (o, v) => o.source === v },
    sortKey: list.sortKey, sortDir: list.sortDir, sorters: { date: (o) => o.createdAt, amount: (o) => o.totals.total, status: (o) => (o.cancelled ? -1 : o.statusIndex) }, page: list.page, pageSize: list.pageSize,
  })
  const open = openId ? orders.find((o) => o.id === openId) : null

  const columns = [
    { key: 'id', header: 'Order', render: (o) => <span className="whitespace-nowrap font-bold">{o.id} {o.source === 'demo' ? <DemoBadge /> : null}</span> },
    { key: 'customer', header: 'Customer', render: (o) => <span className="block max-w-40 truncate">{o.customer?.name}</span> },
    { key: 'restaurant', header: 'Restaurant', render: (o) => <span className="block max-w-44 truncate">{o.restaurant?.name}</span> },
    { key: 'date', header: 'Placed', sortable: true, render: (o) => <span className="whitespace-nowrap text-ink-500">{formatDateTime(o.createdAt)}</span> },
    { key: 'amount', header: 'Amount', sortable: true, render: (o) => <span className="font-bold tabular-nums">{formatCurrency(o.totals.total)}</span> },
    { key: 'status', header: 'Status', sortable: true, render: (o) => <StatusBadge status={orderTone(o)} label={statusLabel(o)} /> },
    { key: 'refund', header: 'Refund', render: (o) => (o.refund ? <StatusBadge status={o.refund.status} /> : <span className="text-ink-400">—</span>) },
  ]
  return (
    <Fade>
      <PageHeader title="Orders" description="Live customer orders and demo orders in one place. Status changes sync to the customer's order history and tracking." />
      <Tabs tabs={CATEGORY_TABS.map((t) => ({ ...t, count: counts[t.id] }))} value={tab} onChange={(id) => setParam('tab', id === 'all' ? '' : id)} label="Order views" />
      {tab === 'refunds' ? <Alert tone="info" className="mb-4">Refund approvals update simulated records only — no real payment is reversed.</Alert> : null}
      <FilterBar>
        <SearchInput value={q} onChange={(v) => setParam('q', v)} placeholder="Order ID or customer…" label="Search orders" />
        <FilterSelect label="Status" value={list.filters.status} onChange={(v) => list.setFilter('status', v)} options={STATUS_OPTIONS} allLabel="Any status" />
        <FilterSelect label="Source" value={list.filters.source} onChange={(v) => list.setFilter('source', v)} options={[{ value: 'live', label: 'Live orders' }, { value: 'demo', label: 'Demo orders' }]} allLabel="Live + demo" />
        <label className="flex items-center gap-1.5 text-sm text-ink-500">From<input type="date" className="input !min-h-10 !w-auto" value={dates.from} onChange={(e) => setDates({ ...dates, from: e.target.value })} aria-label="From date" /></label>
        <label className="flex items-center gap-1.5 text-sm text-ink-500">To<input type="date" className="input !min-h-10 !w-auto" value={dates.to} onChange={(e) => setDates({ ...dates, to: e.target.value })} aria-label="To date" /></label>
        {dates.from || dates.to ? <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDates({ from: '', to: '' })}>Clear dates</button> : null}
      </FilterBar>
      {range?.error ? <p className="field-error mb-3" role="alert">{range.error}</p> : null}
      <DataTable caption="Orders" columns={columns} result={result} rowKey={(o) => o.id} sort={{ key: list.sortKey, dir: list.sortDir }} onSort={list.toggleSort} onPage={list.setPage} onPageSize={list.setPageSize} onRowClick={(o) => setOpenId(o.id)}
        empty={<div className="px-4 py-12 text-center"><p className="font-bold">No orders found</p><p className="text-sm text-ink-500">Try another tab, search or date range. New customer orders appear here automatically.</p></div>} />
      {open ? <OrderDetail order={open} onClose={() => setOpenId(null)} /> : null}
    </Fade>
  )
}
