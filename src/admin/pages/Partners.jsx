import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Star, Trash2 } from 'lucide-react'
import { useAdmin } from '../context/adminContextValue.js'
import { Alert, Badge, Card, ConfirmAction, DataTable, DemoBadge, Dialog, Fade, FilterBar, FilterSelect, KeyValue, PageHeader, ReasonDialog, SearchInput, SelectField, StatusBadge, Tabs, TextField, Toggle } from '../components/ui.jsx'
import { useListState, useRun } from '../components/uiHooks.js'
import { partnerMetrics, OPEN } from '../lib/partners.js'
import { queryRows } from '../lib/table.js'
import { statusLabel } from '../lib/orders.js'
import { formatCurrency, formatDateTime } from '../../utils/format.js'
import usePageTitle from '../../hooks/usePageTitle.js'

const BLANK = { name: '', phone: '', email: '', vehicle: '', plate: '' }

function PartnerForm({ initial, editingId, onClose }) {
  const { actions } = useAdmin()
  const run = useRun()
  const [v, setV] = useState(initial)
  const [errors, setErrors] = useState({})
  const set = (k) => (e) => { setV({ ...v, [k]: e.target.value }); setErrors({ ...errors, [k]: undefined }) }
  return (
    <Dialog open title={editingId ? 'Edit partner' : 'Register delivery partner'} onClose={onClose} size="md"
      footer={<div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button><button type="button" className="btn btn-primary" onClick={() => { const r = actions.savePartner(v, editingId); if (r.ok) { run(r, editingId ? 'Partner updated' : 'Partner registered — documents are pending review'); onClose() } else { setErrors(r.errors ?? {}); if (!r.errors) run(r) } }}>{editingId ? 'Save' : 'Register'}</button></div>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Full name" value={v.name} onChange={set('name')} error={errors.name} className="sm:col-span-2" />
        <TextField label="Phone" inputMode="tel" value={v.phone} onChange={set('phone')} error={errors.phone} />
        <TextField label="Email (optional)" type="email" value={v.email} onChange={set('email')} error={errors.email} />
        <SelectField label="Vehicle" value={v.vehicle} onChange={set('vehicle')} error={errors.vehicle} placeholder="Choose…" options={['Bike', 'Scooter', 'Bicycle'].map((x) => ({ value: x, label: x }))} />
        <TextField label="Number plate" value={v.plate} onChange={set('plate')} error={errors.plate} placeholder="TN 38 AB 1234" />
      </div>
    </Dialog>
  )
}

function Detail({ partner: p, onClose, onEdit }) {
  const { actions, can, orders, settings } = useAdmin()
  const run = useRun()
  const [dialog, setDialog] = useState(null)
  const [fileName, setFileName] = useState({})
  const m = partnerMetrics(p.id, orders, settings.partnerPayoutPerDelivery)
  const canEdit = can('partners', 'edit')
  const canApprove = can('partners', 'approve')
  return (
    <>
      <Dialog open title={p.name} onClose={onClose} size="lg">
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2"><StatusBadge status={p.verification} /><StatusBadge status={p.online ? 'online' : 'offline'} />{p.active === false ? <StatusBadge status="inactive" /> : null}{p.demo ? <DemoBadge /> : null}{p.rating ? <span className="inline-flex items-center gap-1 text-sm font-bold"><Star className="h-4 w-4 fill-amber-accent text-amber-accent" aria-hidden="true" />{p.rating}</span> : <Badge>No rating yet</Badge>}</div>
          {p.verification === 'rejected' ? <Alert tone="bad">Rejected: {p.rejectionReason}</Alert> : null}
          <div className="flex flex-wrap gap-2">
            {canEdit ? <button type="button" className="btn btn-ghost btn-sm" onClick={onEdit}>Edit</button> : null}
            {canApprove && p.verification !== 'approved' ? <button type="button" className="btn btn-primary btn-sm" onClick={() => run(actions.setVerification(p.id, 'approve'), 'Partner verified')}>Approve verification</button> : null}
            {canApprove && p.verification !== 'rejected' ? <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDialog('reject')}>Reject</button> : null}
            {can('partners', 'delete') ? <button type="button" className="btn btn-ghost btn-sm text-red-700" onClick={() => setDialog('delete')}><Trash2 className="h-4 w-4" aria-hidden="true" />Delete</button> : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-2xl bg-cream-100 p-3"><Toggle checked={p.online} disabled={!canEdit} label={`${p.name} online`} onChange={(v) => run(actions.setOnline(p.id, v), v ? 'Partner set online' : 'Partner set offline')} /><p className="text-sm"><strong>{p.online ? 'Online' : 'Offline'}</strong><span className="block text-xs text-ink-500">Set manually — not tracked live</span></p></div>
            <div className="flex items-center gap-3 rounded-2xl bg-cream-100 p-3"><Toggle checked={p.active !== false} disabled={!canEdit} label={`${p.name} account active`} onChange={(v) => run(actions.setPartnerActive(p.id, v), v ? 'Account activated' : 'Account deactivated')} /><p className="text-sm"><strong>{p.active !== false ? 'Account active' : 'Account inactive'}</strong></p></div>
          </div>
          <Card title="Profile"><KeyValue items={[['Phone', p.phone], ['Email', p.email || '—'], ['Vehicle', `${p.vehicle} · ${p.plate}`], ['Joined', formatDateTime(p.joinedAt)]]} /></Card>
          <Card title="Performance & earnings" subtitle={`Earnings use the flat ${formatCurrency(settings.partnerPayoutPerDelivery)} per delivery set in Settings (simulated).`}>
            <KeyValue cols={3} items={[['Active deliveries', m.active.length], ['Completed', m.completed], ['Cancelled', m.cancelled], ['Cancellation rate', `${Math.round(m.cancellationRate * 100)}%`], ['Avg. delivery time', m.avgDeliveryMinutes === null ? '—' : `${m.avgDeliveryMinutes} min`], ['Total earnings', formatCurrency(m.earnings)]]} />
          </Card>
          <Card title="Verification documents" subtitle="Only file names are recorded; no files are uploaded in this demo.">
            <ul className="divide-y divide-ink-200/60">{p.documents.map((d) => (
              <li key={d.type} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <div><p className="font-bold">{d.type}</p><p className="text-xs text-ink-500">{d.fileName || 'No file recorded'}</p></div>
                <div className="flex flex-wrap items-center gap-2"><StatusBadge status={d.status} />
                  {canEdit && d.status !== 'verified' ? <><input className="input !min-h-9 !w-36" aria-label={`File name for ${d.type}`} placeholder="file-name.pdf" value={fileName[d.type] ?? ''} onChange={(e) => setFileName({ ...fileName, [d.type]: e.target.value })} /><button type="button" className="btn btn-ghost btn-sm" onClick={() => run(actions.setPartnerDocument(p.id, d.type, 'submitted', fileName[d.type]), 'Document recorded as submitted')}>Submit</button></> : null}
                  {canApprove && d.status === 'submitted' ? <><button type="button" className="btn btn-primary btn-sm" onClick={() => run(actions.setPartnerDocument(p.id, d.type, 'verified'), `${d.type} verified`)}>Verify</button><button type="button" className="btn btn-ghost btn-sm" onClick={() => run(actions.setPartnerDocument(p.id, d.type, 'rejected'), `${d.type} rejected`)}>Reject</button></> : null}
                </div></li>))}</ul>
          </Card>
          <Card title="Assigned orders" padded={false}>
            {m.active.length === 0 ? <p className="px-5 pb-5 text-sm text-ink-500">No active deliveries.</p> : <ul className="divide-y divide-ink-200/60 px-5 pb-2">{m.active.map((o) => <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"><span><span className="font-bold">{o.id}</span> · {o.restaurant.name} → {o.customer.name}</span><StatusBadge status="in_progress" label={statusLabel(o)} /></li>)}</ul>}
          </Card>
          <Card title="Delivery history" padded={false}>
            {m.delivered.length === 0 ? <p className="px-5 pb-5 text-sm text-ink-500">No completed deliveries yet.</p> : <ul className="divide-y divide-ink-200/60 px-5 pb-2">{m.delivered.slice(0, 8).map((o) => <li key={o.id} className="flex justify-between gap-2 py-2.5 text-sm"><span><span className="font-bold">{o.id}</span> · {o.restaurant.name}</span><span className="text-ink-500">{formatDateTime(o.createdAt)}</span></li>)}</ul>}
          </Card>
        </div>
      </Dialog>
      <ReasonDialog open={dialog === 'reject'} title="Reject partner" message="The partner is taken offline and cannot receive orders." label="Rejection reason" confirmLabel="Reject" danger onCancel={() => setDialog(null)} onConfirm={(reason) => { const r = actions.setVerification(p.id, 'reject', reason); if (r.ok) { setDialog(null); run(r, 'Partner rejected') } return r }} />
      <ConfirmAction open={dialog === 'delete'} title={`Delete ${p.name}?`} message="Past orders keep the partner's name. This can't be undone." confirmLabel="Delete partner" danger onCancel={() => setDialog(null)} onConfirm={() => { const r = actions.deletePartner(p.id); if (r.ok) { setDialog(null); run(r, 'Partner deleted'); onClose() } return r }} />
    </>
  )
}

function Assignments() {
  const { orders, state, actions, can } = useAdmin()
  const run = useRun()
  const [pick, setPick] = useState({})
  const open = orders.filter(OPEN)
  const list = useListState({ filters: { assigned: 'all' }, pageSize: 10 })
  const result = queryRows(open, { search: list.search, searchKeys: ['id', 'customer.name', 'restaurant.name'], filters: list.filters, filterFns: { assigned: (o, v) => (v === 'assigned') === Boolean(o.partnerId) }, page: list.page, pageSize: list.pageSize })
  const eligible = state.partners.filter((p) => p.verification === 'approved' && p.active !== false)
  const canEdit = can('orders', 'edit')
  const columns = [
    { key: 'id', header: 'Order', render: (o) => <span className="font-bold">{o.id} {o.source === 'demo' ? <DemoBadge /> : null}</span> },
    { key: 'r', header: 'Restaurant → customer', render: (o) => `${o.restaurant.name} → ${o.customer.name}` },
    { key: 's', header: 'Status', render: (o) => <StatusBadge status="in_progress" label={statusLabel(o)} /> },
    { key: 'p', header: 'Partner', render: (o) => (o.partnerId ? <span className="font-semibold">{o.partner.name}</span> : <Badge tone="warn">Unassigned</Badge>) },
    { key: 'a', header: 'Assign', render: (o) => (canEdit ? (
      <div className="flex gap-2"><select className="input !min-h-9 !w-44" aria-label={`Partner for ${o.id}`} value={pick[o.id] ?? ''} onChange={(e) => setPick({ ...pick, [o.id]: e.target.value })}><option value="">Choose…</option>{eligible.map((p) => <option key={p.id} value={p.id} disabled={!p.online}>{p.name}{p.online ? '' : ' (offline)'}</option>)}</select>
        <button type="button" className="btn btn-dark btn-sm" disabled={!pick[o.id]} onClick={() => { if (run(actions.assignPartner(o.id, pick[o.id]), 'Partner assigned')) setPick({ ...pick, [o.id]: '' }) }}>{o.partnerId ? 'Reassign' : 'Assign'}</button></div>) : null) },
  ]
  return (
    <>
      <FilterBar><SearchInput value={list.search} onChange={list.setSearch} placeholder="Order, customer, restaurant…" /><FilterSelect label="Assignment" value={list.filters.assigned} onChange={(v) => list.setFilter('assigned', v)} options={[{ value: 'assigned', label: 'Assigned' }, { value: 'unassigned', label: 'Unassigned' }]} allLabel="All open orders" /></FilterBar>
      <DataTable caption="Open orders" columns={columns} result={result} rowKey={(o) => o.id} onPage={list.setPage} onPageSize={list.setPageSize} empty={<div className="px-4 py-12 text-center"><p className="font-bold">No open orders</p><p className="text-sm text-ink-500">Orders needing delivery will appear here.</p></div>} />
    </>
  )
}

export default function Partners() {
  usePageTitle('Delivery partners — Craveo Admin')
  const { state, orders, settings, can } = useAdmin()
  const [params, setParams] = useSearchParams()
  const tab = ['verification', 'assignments'].includes(params.get('tab')) ? params.get('tab') : 'all'
  const list = useListState({ filters: { verification: 'all', online: 'all' }, sortKey: 'name' })
  const [openId, setOpenId] = useState(null)
  const [form, setForm] = useState(null)
  const pending = state.partners.filter((p) => p.verification === 'pending')
  const rows = useMemo(() => (tab === 'verification' ? pending : state.partners).map((p) => ({ ...p, metrics: partnerMetrics(p.id, orders, settings.partnerPayoutPerDelivery) })), [tab, state.partners, pending, orders, settings.partnerPayoutPerDelivery])
  const result = queryRows(rows, {
    search: list.search, searchKeys: ['name', 'phone', 'plate'], filters: list.filters,
    filterFns: { verification: (p, v) => p.verification === v, online: (p, v) => (v === 'online') === p.online },
    sortKey: list.sortKey, sortDir: list.sortDir, sorters: { name: (p) => p.name.toLowerCase(), completed: (p) => p.metrics.completed, earnings: (p) => p.metrics.earnings, rating: (p) => p.rating ?? 0 }, page: list.page, pageSize: list.pageSize,
  })
  const open = openId ? state.partners.find((p) => p.id === openId) : null
  const setTab = (id) => { const n = new URLSearchParams(params); if (id === 'all') n.delete('tab'); else n.set('tab', id); setParams(n, { replace: true }); list.setPage(1) }
  const columns = [
    { key: 'name', header: 'Partner', sortable: true, render: (p) => <span className="font-bold">{p.name} {p.demo ? <DemoBadge /> : null}<span className="block text-xs font-normal text-ink-500">{p.vehicle} · {p.plate}</span></span> },
    { key: 'verification', header: 'Verification', render: (p) => <StatusBadge status={p.verification} /> },
    { key: 'online', header: 'Availability', render: (p) => <StatusBadge status={p.online ? 'online' : 'offline'} /> },
    { key: 'active', header: 'Active now', render: (p) => p.metrics.active.length },
    { key: 'completed', header: 'Completed', sortable: true, render: (p) => p.metrics.completed },
    { key: 'rating', header: 'Rating', sortable: true, render: (p) => p.rating ?? <span className="text-ink-400">New</span> },
    { key: 'earnings', header: 'Earnings', sortable: true, render: (p) => <span className="tabular-nums">{formatCurrency(p.metrics.earnings)}</span> },
  ]
  return (
    <Fade>
      <PageHeader title="Delivery partners" description="Verification, availability, assignment and earnings. Availability and delivery progress are simulated; no live GPS is tracked." actions={can('partners', 'create') ? <button type="button" className="btn btn-primary" onClick={() => setForm({ initial: BLANK, id: null })}><Plus className="h-4 w-4" aria-hidden="true" />Register partner</button> : null} />
      <Tabs tabs={[{ id: 'all', label: 'All partners', count: state.partners.length }, { id: 'verification', label: 'Verification queue', count: pending.length }, { id: 'assignments', label: 'Order assignment' }]} value={tab} onChange={setTab} label="Partner views" />
      {tab === 'assignments' ? <Assignments /> : (
        <>
          <FilterBar>
            <SearchInput value={list.search} onChange={list.setSearch} placeholder="Name, phone, plate…" label="Search partners" />
            <FilterSelect label="Verification" value={list.filters.verification} onChange={(v) => list.setFilter('verification', v)} options={[{ value: 'approved', label: 'Approved' }, { value: 'pending', label: 'Pending' }, { value: 'rejected', label: 'Rejected' }]} allLabel="Any verification" />
            <FilterSelect label="Availability" value={list.filters.online} onChange={(v) => list.setFilter('online', v)} options={[{ value: 'online', label: 'Online' }, { value: 'offline', label: 'Offline' }]} allLabel="Online + offline" />
          </FilterBar>
          <DataTable caption="Delivery partners" columns={columns} result={result} rowKey={(p) => p.id} sort={{ key: list.sortKey, dir: list.sortDir }} onSort={list.toggleSort} onPage={list.setPage} onPageSize={list.setPageSize} onRowClick={(p) => setOpenId(p.id)} empty={<div className="px-4 py-12 text-center"><p className="font-bold">No partners found</p><p className="text-sm text-ink-500">Try a different filter or register a partner.</p></div>} />
        </>
      )}
      {open && !form ? <Detail key={open.id} partner={open} onClose={() => setOpenId(null)} onEdit={() => setForm({ initial: { name: open.name, phone: open.phone, email: open.email ?? '', vehicle: open.vehicle, plate: open.plate }, id: open.id })} /> : null}
      {form ? <PartnerForm initial={form.initial} editingId={form.id} onClose={() => setForm(null)} /> : null}
    </Fade>
  )
}
