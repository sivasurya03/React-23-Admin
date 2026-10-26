import { useMemo, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { useAdmin } from '../context/adminContextValue.js'
import { Alert, Badge, Card, DataTable, DemoBadge, Dialog, Fade, FilterBar, FilterSelect, KeyValue, PageHeader, ReasonDialog, SearchInput, SelectField, StatusBadge } from '../components/ui.jsx'
import { useListState, useRun } from '../components/uiHooks.js'
import { Stars } from '../../components/common/Rating.jsx'
import { queryRows } from '../lib/table.js'
import { statusLabel } from '../lib/orders.js'
import { emailKey } from '../lib/customers.js'
import { formatCurrency, formatDateTime } from '../../utils/format.js'
import usePageTitle from '../../hooks/usePageTitle.js'

const SOURCE = { registered: ['good', 'Registered'], guest: ['info', 'Guest order'], demo: ['warn', 'Demo'] }

function Detail({ customer: c, onClose }) {
  const { orders, state, actions, can } = useAdmin()
  const run = useRun()
  const [next, setNext] = useState('')
  const mine = orders.filter((o) => emailKey(o.customer?.email) === c.id)
  const refunds = mine.filter((o) => o.refund)
  const reviews = state.reviews.filter((r) => c.source === 'demo' && r.customerName === c.name)
  const tickets = state.tickets.filter((t) => emailKey(t.customerEmail) === c.id)
  return (
    <>
      <Dialog open title={c.name} onClose={onClose} size="lg">
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2"><StatusBadge status={c.status} />{SOURCE[c.source] ? <Badge tone={SOURCE[c.source][0]}>{SOURCE[c.source][1]}</Badge> : null}{c.plus ? <Badge tone="brand">Plus member (demo)</Badge> : null}{c.source === 'demo' ? <DemoBadge /> : null}</div>
          {c.status !== 'active' ? <Alert tone="warn">{c.status === 'suspended' ? 'Suspended' : 'Blocked'}{c.statusReason ? `: ${c.statusReason}` : ''}. {c.source === 'registered' ? 'This customer cannot log in on this browser while the status is not Active.' : 'Demo / guest records have no login to block.'}</Alert> : null}
          <Card title="Contact"><KeyValue items={[['Email', c.email], ['Phone', c.phone || 'Not provided'], ['City', c.city || '—'], ['Orders', c.orders], ['Lifetime spend', formatCurrency(c.spent)], ['Last order', c.lastOrderAt ? formatDateTime(c.lastOrderAt) : '—']]} /><p className="mt-3 text-xs text-ink-400">Passwords and authentication data are never shown or stored by the admin panel.</p></Card>
          {can('customers', 'edit') ? (
            <Card title="Account status">
              <div className="flex flex-wrap items-end gap-2"><SelectField label="Change status to" value={next} onChange={(e) => setNext(e.target.value)} className="w-52" placeholder="Choose…" options={['active', 'suspended', 'blocked'].filter((s) => s !== c.status).map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }))} /><button type="button" className="btn btn-dark btn-sm mb-0.5" disabled={!next} onClick={() => setNext((n) => `confirm:${n}`)}>Change…</button></div>
            </Card>
          ) : null}
          <Card title="Saved addresses" subtitle="Collected from this customer's past orders."><ul className="space-y-1 text-sm">{c.addresses.length ? c.addresses.map((a) => <li key={a}>{a}</li>) : <li className="text-ink-500">No addresses on record.</li>}</ul></Card>
          <Card title={`Order history (${mine.length})`} padded={false}>
            {mine.length === 0 ? <p className="px-5 pb-5 text-sm text-ink-500">No orders yet.</p> : <ul className="divide-y divide-ink-200/60 px-5 pb-2">{mine.slice(0, 8).map((o) => <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"><span><span className="font-bold">{o.id}</span> · {o.restaurant.name}<span className="block text-xs text-ink-500">{formatDateTime(o.createdAt)}</span></span><span className="flex items-center gap-2"><span className="font-bold tabular-nums">{formatCurrency(o.totals.total)}</span><StatusBadge status={o.cancelled ? 'cancelled' : o.statusIndex >= 4 ? 'delivered' : 'confirmed'} label={statusLabel(o)} /></span></li>)}</ul>}
          </Card>
          <div className="grid gap-6 md:grid-cols-2">
            <Card title={`Refund history (${refunds.length})`}>{refunds.length === 0 ? <p className="text-sm text-ink-500">No refunds.</p> : <ul className="space-y-2 text-sm">{refunds.map((o) => <li key={o.id} className="flex justify-between gap-2"><span>{o.id} · {formatCurrency(o.refund.amount)}</span><StatusBadge status={o.refund.status} /></li>)}</ul>}</Card>
            <Card title={`Support & complaints (${tickets.length})`}>{tickets.length === 0 ? <p className="text-sm text-ink-500">No tickets.</p> : <ul className="space-y-2 text-sm">{tickets.map((t) => <li key={t.id} className="flex justify-between gap-2"><span className="min-w-0 truncate">{t.id} · {t.subject}</span><StatusBadge status={t.status} /></li>)}</ul>}</Card>
          </div>
          <Card title={`Reviews & ratings (${reviews.length})`}>{reviews.length === 0 ? <p className="text-sm text-ink-500">No reviews on record. The customer app has no review feature yet, so only demo sample reviews exist.</p> : <ul className="space-y-3 text-sm">{reviews.map((r) => <li key={r.id}><p className="flex items-center gap-2"><Stars value={r.rating} /><span className="font-bold">{r.restaurantName}</span><DemoBadge /></p><p className="text-ink-700">{r.text}</p></li>)}</ul>}</Card>
        </div>
      </Dialog>
      <ReasonDialog open={next.startsWith('confirm:')} title={`Set account to ${next.replace('confirm:', '')}?`} message={next === 'confirm:active' ? 'The customer will be able to log in again.' : 'The customer will not be able to log in while this status is set.'} label={next === 'confirm:active' ? 'Note (optional)' : 'Reason'} required={next !== 'confirm:active'} confirmLabel="Confirm change" danger={next !== 'confirm:active'} onCancel={() => setNext('')} onConfirm={(reason) => { const r = actions.setCustomerStatus(c.id, next.replace('confirm:', ''), reason); if (r.ok) { setNext(''); run(r, 'Account status updated') } return r }} />
    </>
  )
}

export default function Customers() {
  usePageTitle('Customers — Craveo Admin')
  const { customers, reloadCustomers } = useAdmin()
  const list = useListState({ filters: { source: 'all', status: 'all' }, sortKey: 'spent', sortDir: 'desc' })
  const [openId, setOpenId] = useState(null)
  const result = queryRows(customers, { search: list.search, searchKeys: ['name', 'email', 'phone'], filters: list.filters, sortKey: list.sortKey, sortDir: list.sortDir, sorters: { name: (c) => c.name.toLowerCase(), orders: (c) => c.orders, spent: (c) => c.spent, last: (c) => c.lastOrderAt ?? '' }, page: list.page, pageSize: list.pageSize })
  const open = useMemo(() => customers.find((c) => c.id === openId), [customers, openId])
  const columns = [
    { key: 'name', header: 'Customer', sortable: true, render: (c) => <span className="font-bold">{c.name} {SOURCE[c.source] ? <Badge tone={SOURCE[c.source][0]}>{SOURCE[c.source][1]}</Badge> : null}<span className="block text-xs font-normal text-ink-500">{c.email}</span></span> },
    { key: 'phone', header: 'Phone', render: (c) => c.phone || <span className="text-ink-400">—</span> },
    { key: 'orders', header: 'Orders', sortable: true, render: (c) => c.orders },
    { key: 'spent', header: 'Spent', sortable: true, render: (c) => <span className="font-bold tabular-nums">{formatCurrency(c.spent)}</span> },
    { key: 'last', header: 'Last order', sortable: true, render: (c) => (c.lastOrderAt ? <span className="whitespace-nowrap text-ink-500">{formatDateTime(c.lastOrderAt)}</span> : '—') },
    { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.status} /> },
  ]
  return (
    <Fade>
      <PageHeader title="Customers" description="Registered demo accounts, guest-order customers and clearly labelled demo customers." actions={<button type="button" className="btn btn-ghost btn-sm" onClick={reloadCustomers}><RefreshCw className="h-4 w-4" aria-hidden="true" />Refresh accounts</button>} />
      <FilterBar>
        <SearchInput value={list.search} onChange={list.setSearch} placeholder="Name, email, phone…" label="Search customers" />
        <FilterSelect label="Type" value={list.filters.source} onChange={(v) => list.setFilter('source', v)} options={[{ value: 'registered', label: 'Registered' }, { value: 'guest', label: 'Guest order' }, { value: 'demo', label: 'Demo' }]} allLabel="All types" />
        <FilterSelect label="Status" value={list.filters.status} onChange={(v) => list.setFilter('status', v)} options={[{ value: 'active', label: 'Active' }, { value: 'suspended', label: 'Suspended' }, { value: 'blocked', label: 'Blocked' }]} allLabel="Any status" />
      </FilterBar>
      <DataTable caption="Customers" columns={columns} result={result} rowKey={(c) => c.id} sort={{ key: list.sortKey, dir: list.sortDir }} onSort={list.toggleSort} onPage={list.setPage} onPageSize={list.setPageSize} onRowClick={(c) => setOpenId(c.id)} empty={<div className="px-4 py-12 text-center"><p className="font-bold">No customers match</p><p className="text-sm text-ink-500">Customers appear after they sign up or place an order.</p></div>} />
      {open ? <Detail key={open.id} customer={open} onClose={() => setOpenId(null)} /> : null}
    </Fade>
  )
}
