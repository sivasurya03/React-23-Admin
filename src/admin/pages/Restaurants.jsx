import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Pencil, Plus, Star, Trash2 } from 'lucide-react'
import { useAdmin } from '../context/adminContextValue.js'
import { Alert, Badge, Card, CheckField, ConfirmAction, DataTable, DemoBadge, Dialog, Fade, FilterBar, FilterSelect, KeyValue, PageHeader, ReasonDialog, SearchInput, SelectField, StatusBadge, Tabs, TextAreaField, TextField, Toggle } from '../components/ui.jsx'
import { useListState, useRun } from '../components/uiHooks.js'
import { CATEGORIES } from '../../data/categories.js'
import { DEFAULT_HOURS } from '../lib/catalog.js'
import { commissionOf, round } from '../lib/finance.js'
import { queryRows } from '../lib/table.js'
import { formatCurrency } from '../../utils/format.js'
import usePageTitle from '../../hooks/usePageTitle.js'

const EMPTY = { name: '', primaryCuisine: '', cuisines: '', ownerName: '', phone: '', email: '', area: '', address: '', about: '', deliveryTime: '30', deliveryFee: '30', costForTwo: '500', priceLevel: '2', offer: '', commissionRate: '', hours: DEFAULT_HOURS.map((h) => ({ ...h })) }
const fromRestaurant = (r) => ({ name: r.name, primaryCuisine: r.primaryCuisine, cuisines: r.cuisines.join(', '), ownerName: r.ownerName, phone: r.phone, email: r.email, area: r.area, address: r.address, about: r.about, deliveryTime: String(r.deliveryTime), deliveryFee: String(r.deliveryFee), costForTwo: String(r.costForTwo), priceLevel: String(r.priceLevel), offer: r.offer, commissionRate: r.admin.commissionRate ?? '', hours: r.hours.map((h) => ({ ...h })) })

function RestaurantForm({ initial, editingId, onClose, onSaved }) {
  const { actions, can } = useAdmin()
  const run = useRun()
  const [v, setV] = useState(initial)
  const [errors, setErrors] = useState({})
  const [approveNow, setApproveNow] = useState(false)
  const set = (k) => (e) => { setV({ ...v, [k]: e.target.value }); setErrors({ ...errors, [k]: undefined }) }
  const setHour = (i, k, val) => setV({ ...v, hours: v.hours.map((h, n) => (n === i ? { ...h, [k]: val } : h)) })
  const submit = () => {
    const r = actions.saveRestaurant(v, editingId, { approveNow })
    if (r.ok) { run(r, editingId ? 'Restaurant updated' : 'Restaurant registered'); onSaved(r.id) } else { setErrors(r.errors ?? {}); if (!r.errors) run(r) }
  }
  return (
    <Dialog open title={editingId ? 'Edit restaurant' : 'Register restaurant'} onClose={onClose} size="lg"
      footer={<div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button><button type="button" className="btn btn-primary" onClick={submit}>{editingId ? 'Save changes' : 'Register'}</button></div>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Restaurant name" value={v.name} onChange={set('name')} error={errors.name} className="sm:col-span-2" maxLength={60} />
        <SelectField label="Primary category" value={v.primaryCuisine} onChange={set('primaryCuisine')} error={errors.primaryCuisine} placeholder="Choose…" options={CATEGORIES.map((c) => ({ value: c.id, label: c.name }))} />
        <TextField label="Cuisines (comma separated)" value={v.cuisines} onChange={set('cuisines')} hint="e.g. Pizza, Italian" />
        <TextField label="Owner / contact name" value={v.ownerName} onChange={set('ownerName')} error={errors.ownerName} />
        <TextField label="Phone" inputMode="tel" value={v.phone} onChange={set('phone')} error={errors.phone} />
        <TextField label="Email" type="email" value={v.email} onChange={set('email')} error={errors.email} />
        <TextField label="Area" value={v.area} onChange={set('area')} error={errors.area} />
        <TextField label="Street address" value={v.address} onChange={set('address')} error={errors.address} className="sm:col-span-2" />
        <TextField label="Delivery time (min)" type="number" value={v.deliveryTime} onChange={set('deliveryTime')} error={errors.deliveryTime} />
        <TextField label="Delivery fee (₹)" type="number" value={v.deliveryFee} onChange={set('deliveryFee')} error={errors.deliveryFee} />
        <TextField label="Cost for two (₹)" type="number" value={v.costForTwo} onChange={set('costForTwo')} error={errors.costForTwo} />
        <SelectField label="Price level" value={v.priceLevel} onChange={set('priceLevel')} error={errors.priceLevel} options={[{ value: '1', label: '₹ budget' }, { value: '2', label: '₹₹ mid-range' }, { value: '3', label: '₹₹₹ premium' }]} />
        <TextField label="Offer text (optional)" value={v.offer} onChange={set('offer')} className="sm:col-span-2" hint="Shown on the customer's restaurant card, e.g. “Free delivery”." />
        <TextField label="Commission override % (optional)" type="number" step="0.5" value={v.commissionRate} onChange={set('commissionRate')} error={errors.commissionRate} hint="Blank = platform default. Applies to new orders only." />
        <TextAreaField label="About" value={v.about} onChange={set('about')} error={errors.about} className="sm:col-span-2" maxLength={400} />
        <fieldset className="sm:col-span-2"><legend className="mb-1.5 text-sm font-bold text-ink-700">Operating hours</legend>
          <div className="space-y-2">{v.hours.map((h, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-start gap-2">
              <input className="input" aria-label={`Days, row ${i + 1}`} value={h.day} onChange={(e) => setHour(i, 'day', e.target.value)} aria-invalid={Boolean(errors[`hours.${i}`])} />
              <input className="input" aria-label={`Hours, row ${i + 1}`} value={h.hours} onChange={(e) => setHour(i, 'hours', e.target.value)} aria-invalid={Boolean(errors[`hours.${i}`])} />
              <button type="button" className="btn btn-ghost btn-sm !px-2" aria-label={`Remove hours row ${i + 1}`} disabled={v.hours.length <= 1} onClick={() => setV({ ...v, hours: v.hours.filter((_, n) => n !== i) })}><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
              {errors[`hours.${i}`] ? <p className="field-error col-span-3">{errors[`hours.${i}`]}</p> : null}
            </div>))}</div>
          {v.hours.length < 7 ? <button type="button" className="btn btn-ghost btn-sm mt-2" onClick={() => setV({ ...v, hours: [...v.hours, { day: '', hours: '' }] })}><Plus className="h-4 w-4" aria-hidden="true" />Add hours row</button> : null}
        </fieldset>
        {!editingId && can('restaurants', 'approve') ? <div className="sm:col-span-2"><CheckField label="Approve immediately" checked={approveNow} onChange={setApproveNow} hint="Marks all documents verified and publishes the restaurant to customers. Leave off to review documents first." /></div> : null}
      </div>
    </Dialog>
  )
}

function Detail({ restaurant: r, onClose, onEdit }) {
  const { actions, can, settings, orders } = useAdmin()
  const run = useRun()
  const [dialog, setDialog] = useState(null)
  const [rate, setRate] = useState(r.admin.commissionRate ?? '')
  const [rateErr, setRateErr] = useState('')
  const [fileName, setFileName] = useState({})
  const effective = r.admin.commissionRate ?? settings.defaultCommission
  const sample = 500
  const docs = r.admin.documents.length ? r.admin.documents : ['FSSAI licence', 'GST certificate', 'PAN card', 'Bank proof'].map((type) => ({ type, status: 'missing', fileName: '' }))
  const rOrders = orders.filter((o) => o.restaurant?.id === r.id)
  const canApprove = can('restaurants', 'approve')
  const canEdit = can('restaurants', 'edit')

  return (
    <>
      <Dialog open title={r.name} onClose={onClose} size="lg">
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={r.admin.status} />
            {r.admin.status === 'approved' ? <StatusBadge status={r.admin.active ? 'active' : 'inactive'} /> : null}
            {r.admin.demo ? <DemoBadge /> : null}
            {r.admin.isCustom ? <Badge tone="info">Added in admin</Badge> : null}
            <span className="inline-flex items-center gap-1 text-sm font-bold"><Star className="h-4 w-4 fill-amber-accent text-amber-accent" aria-hidden="true" />{r.reviews ? `${r.rating.toFixed(1)} (${r.reviews} reviews)` : 'No ratings yet'}</span>
          </div>
          {r.admin.status === 'rejected' ? <Alert tone="bad">Rejected: {r.admin.rejectionReason}</Alert> : null}
          <div className="flex flex-wrap gap-2">
            {canEdit ? <button type="button" className="btn btn-ghost btn-sm" onClick={onEdit}><Pencil className="h-4 w-4" aria-hidden="true" />Edit</button> : null}
            {canApprove && r.admin.status !== 'approved' ? <button type="button" className="btn btn-primary btn-sm" onClick={() => run(actions.approveRestaurant(r.id), 'Restaurant approved and now visible to customers')}>Approve</button> : null}
            {canApprove && r.admin.status === 'pending' ? <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDialog('reject')}>Reject</button> : null}
            {can('restaurants', 'delete') ? <button type="button" className="btn btn-ghost btn-sm text-red-700" onClick={() => setDialog('delete')}><Trash2 className="h-4 w-4" aria-hidden="true" />Delete</button> : null}
          </div>
          {r.admin.status === 'approved' ? (
            <div className="flex items-center gap-3 rounded-2xl bg-cream-100 p-3"><Toggle checked={r.admin.active} disabled={!canEdit} label={`${r.name} active`} onChange={(v) => run(actions.setRestaurantActive(r.id, v), v ? 'Restaurant activated' : 'Restaurant hidden from customers')} /><p className="text-sm"><strong>{r.admin.active ? 'Active' : 'Inactive'}</strong> — {r.admin.active ? 'visible to customers' : 'hidden from customers'}</p></div>
          ) : <Alert tone="info">Only approved restaurants are visible to customers.</Alert>}

          <Card title="Details"><KeyValue items={[['Owner', r.ownerName], ['Phone', r.phone], ['Email', r.email], ['Area', r.area], ['Address', r.address], ['Cuisines', r.cuisines.join(', ')], ['Delivery', `${r.deliveryTime} min · ${r.deliveryFee ? formatCurrency(r.deliveryFee) : 'Free'}`], ['Cost for two', formatCurrency(r.costForTwo)], ['Menu items', r.items.length], ['Orders', rOrders.length]]} /></Card>
          <Card title="Operating hours"><ul className="space-y-1 text-sm">{r.hours.map((h) => <li key={h.day} className="flex justify-between gap-4"><span className="font-semibold">{h.day}</span><span className="text-ink-500">{h.hours}</span></li>)}</ul></Card>

          <Card title="Verification documents" subtitle="Only file names are recorded; no files are uploaded in this demo.">
            <ul className="divide-y divide-ink-200/60">{docs.map((d) => (
              <li key={d.type} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <div className="min-w-0"><p className="font-bold">{d.type}</p><p className="text-xs text-ink-500">{d.fileName || 'No file recorded'}</p></div>
                <div className="flex flex-wrap items-center gap-2"><StatusBadge status={d.status} />
                  {canEdit && d.status !== 'verified' ? <><input className="input !min-h-9 !w-36" aria-label={`File name for ${d.type}`} placeholder="file-name.pdf" value={fileName[d.type] ?? ''} onChange={(e) => setFileName({ ...fileName, [d.type]: e.target.value })} /><button type="button" className="btn btn-ghost btn-sm" onClick={() => run(actions.submitDocument(r.id, d.type, fileName[d.type]), 'Document recorded as submitted')}>Submit</button></> : null}
                  {canApprove && d.status === 'submitted' ? <><button type="button" className="btn btn-primary btn-sm" onClick={() => run(actions.setDocumentStatus(r.id, d.type, 'verified'), `${d.type} verified`)}>Verify</button><button type="button" className="btn btn-ghost btn-sm" onClick={() => run(actions.setDocumentStatus(r.id, d.type, 'rejected'), `${d.type} rejected`)}>Reject</button></> : null}
                </div>
              </li>))}</ul>
          </Card>

          <Card title="Commission">
            <p className="text-sm">Effective rate: <strong>{effective}%</strong> {r.admin.commissionRate === null ? `(platform default)` : '(restaurant override)'}</p>
            <p className="mt-1 rounded-xl bg-cream-100 p-3 text-xs text-ink-700">Basis: commission = round((subtotal − discount) × rate ÷ 100). Example on a ₹{sample} food order after discount: {formatCurrency(commissionOf(sample, effective))} commission, {formatCurrency(round(sample - commissionOf(sample, effective)))} payable to the restaurant. Taxes, platform fee and delivery fee are excluded.</p>
            {canEdit ? <div className="mt-3 flex flex-wrap items-end gap-2"><TextField label="New rate (%)" type="number" step="0.5" min="0" max="40" value={rate} onChange={(e) => { setRate(e.target.value); setRateErr('') }} error={rateErr} hint="Blank = use platform default" className="w-44" /><button type="button" className="btn btn-dark btn-sm mb-0.5" onClick={() => { const res = actions.setCommission(r.id, rate); if (res.ok) run(res, 'Commission updated for new orders'); else setRateErr(res.error) }}>Save rate</button></div> : null}
            <p className="mt-2 text-xs text-ink-400">Changes apply to new orders only. Each existing order keeps the rate it was first recorded with.</p>
          </Card>
        </div>
      </Dialog>
      <ReasonDialog open={dialog === 'reject'} title="Reject application" message="The restaurant stays hidden from customers." label="Rejection reason" confirmLabel="Reject" danger onCancel={() => setDialog(null)} onConfirm={(reason) => { const res = actions.rejectRestaurant(r.id, reason); if (res.ok) { setDialog(null); run(res, 'Application rejected') } return res }} />
      <ConfirmAction open={dialog === 'delete'} title={`Delete ${r.name}?`} message="The restaurant and its menu disappear from the customer app. Past orders keep their snapshots. This can't be undone." confirmLabel="Delete restaurant" danger onCancel={() => setDialog(null)} onConfirm={() => { const res = actions.deleteRestaurant(r.id); if (res.ok) { setDialog(null); run(res, 'Restaurant deleted'); onClose() } return res }} />
    </>
  )
}

export default function Restaurants() {
  usePageTitle('Restaurants — Craveo Admin')
  const { catalog, can } = useAdmin()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'applications' ? 'applications' : 'all'
  const list = useListState({ filters: { status: 'all', active: 'all', cuisine: 'all' }, sortKey: 'name' })
  const [openId, setOpenId] = useState(null)
  const [form, setForm] = useState(null)
  const apps = catalog.all.filter((r) => r.admin.status === 'pending')
  const rows = useMemo(() => (tab === 'applications' ? apps : catalog.all), [tab, apps, catalog.all])
  const result = queryRows(rows, {
    search: list.search, searchKeys: ['name', 'area', 'ownerName', (r) => r.cuisines.join(' ')], filters: list.filters,
    filterFns: { status: (r, v) => r.admin.status === v, active: (r, v) => (v === 'active') === r.admin.active, cuisine: (r, v) => r.primaryCuisine === v },
    sortKey: list.sortKey, sortDir: list.sortDir, sorters: { rating: (r) => r.rating, commission: (r) => r.admin.commissionRate ?? -1, time: (r) => r.deliveryTime, name: (r) => r.name.toLowerCase() }, page: list.page, pageSize: list.pageSize,
  })
  const open = openId ? catalog.all.find((r) => r.id === openId) : null
  const columns = [
    { key: 'name', header: 'Restaurant', sortable: true, render: (r) => <span className="font-bold">{r.name} {r.admin.demo ? <DemoBadge /> : null}<span className="block text-xs font-normal text-ink-500">{r.area}</span></span> },
    { key: 'cuisine', header: 'Cuisine', render: (r) => r.cuisines.slice(0, 2).join(', ') },
    { key: 'rating', header: 'Rating', sortable: true, render: (r) => (r.reviews ? <span className="inline-flex items-center gap-1 font-bold"><Star className="h-3.5 w-3.5 fill-amber-accent text-amber-accent" aria-hidden="true" />{r.rating.toFixed(1)}</span> : <span className="text-ink-400">New</span>) },
    { key: 'time', header: 'Delivery', sortable: true, render: (r) => `${r.deliveryTime} min` },
    { key: 'commission', header: 'Commission', sortable: true, render: (r) => (r.admin.commissionRate === null ? <span className="text-ink-400">Default</span> : `${r.admin.commissionRate}%`) },
    { key: 'status', header: 'Status', render: (r) => <span className="flex flex-wrap gap-1"><StatusBadge status={r.admin.status} />{r.admin.status === 'approved' && !r.admin.active ? <StatusBadge status="inactive" /> : null}</span> },
  ]
  return (
    <Fade>
      <PageHeader title="Restaurants" description="Onboarding, verification, operating hours and commission. Approved, active restaurants appear in the customer app." actions={can('restaurants', 'create') ? <button type="button" className="btn btn-primary" onClick={() => setForm({ initial: EMPTY, id: null })}><Plus className="h-4 w-4" aria-hidden="true" />Register restaurant</button> : null} />
      <Tabs tabs={[{ id: 'all', label: 'All restaurants', count: catalog.all.length }, { id: 'applications', label: 'Applications', count: apps.length }]} value={tab} onChange={(id) => { const n = new URLSearchParams(params); if (id === 'all') n.delete('tab'); else n.set('tab', id); setParams(n, { replace: true }); list.setPage(1) }} label="Restaurant views" />
      <FilterBar>
        <SearchInput value={list.search} onChange={list.setSearch} placeholder="Name, area, owner, cuisine…" label="Search restaurants" />
        <FilterSelect label="Status" value={list.filters.status} onChange={(v) => list.setFilter('status', v)} options={[{ value: 'approved', label: 'Approved' }, { value: 'pending', label: 'Pending' }, { value: 'rejected', label: 'Rejected' }]} allLabel="Any status" />
        <FilterSelect label="Active" value={list.filters.active} onChange={(v) => list.setFilter('active', v)} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} allLabel="Active + inactive" />
        <FilterSelect label="Category" value={list.filters.cuisine} onChange={(v) => list.setFilter('cuisine', v)} options={CATEGORIES.map((c) => ({ value: c.id, label: c.name }))} allLabel="All categories" />
      </FilterBar>
      <DataTable caption="Restaurants" columns={columns} result={result} rowKey={(r) => r.id} sort={{ key: list.sortKey, dir: list.sortDir }} onSort={list.toggleSort} onPage={list.setPage} onPageSize={list.setPageSize} onRowClick={(r) => setOpenId(r.id)}
        empty={<div className="px-4 py-12 text-center"><p className="font-bold">No restaurants match</p><p className="text-sm text-ink-500">{tab === 'applications' ? 'There are no pending applications.' : 'Try clearing a filter.'}</p></div>} />
      {open && !form ? <Detail key={open.id} restaurant={open} onClose={() => setOpenId(null)} onEdit={() => setForm({ initial: fromRestaurant(open), id: open.id })} /> : null}
      {form ? <RestaurantForm initial={form.initial} editingId={form.id} onClose={() => setForm(null)} onSaved={(id) => { setForm(null); setOpenId(id) }} /> : null}
    </Fade>
  )
}
