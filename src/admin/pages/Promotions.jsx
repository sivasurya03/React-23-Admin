import { useMemo, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useAdmin } from '../context/adminContextValue.js'
import { Alert, Badge, Card, CheckField, ConfirmAction, DataTable, DemoBadge, Dialog, Fade, FilterBar, FilterSelect, PageHeader, SearchInput, SelectField, StatusBadge, Tabs, TextAreaField, TextField, Toggle } from '../components/ui.jsx'
import { useListState, useRun } from '../components/uiHooks.js'
import { COUPON_TYPES, campaignAnalytics, couponStatus, deriveCouponUsage, usageCounts } from '../lib/coupons.js'
import { queryRows } from '../lib/table.js'
import { formatCurrency, formatDateTime } from '../../utils/format.js'
import usePageTitle from '../../hooks/usePageTitle.js'

const toLocalInput = (iso) => { if (!iso) return ''; const d = new Date(iso); if (Number.isNaN(d.getTime())) return ''; const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}` }
const BLANK = { code: '', title: '', description: '', type: 'percent', value: '', maxDiscount: '', minSubtotal: '0', startsAt: '', expiresAt: '', usageLimit: '', active: true }
const fromCoupon = (c) => ({ code: c.code, title: c.title, description: c.description, type: c.type, value: c.value ?? '', maxDiscount: c.maxDiscount ?? '', minSubtotal: String(c.minSubtotal ?? 0), startsAt: toLocalInput(c.startsAt), expiresAt: toLocalInput(c.expiresAt), usageLimit: c.usageLimit ?? '', active: c.active !== false })

function CouponForm({ initial, editingCode, onClose }) {
  const { actions } = useAdmin()
  const run = useRun()
  const [v, setV] = useState(initial)
  const [errors, setErrors] = useState({})
  const set = (k) => (e) => { setV({ ...v, [k]: e.target.value }); setErrors({ ...errors, [k]: undefined }) }
  return (
    <Dialog open title={editingCode ? `Edit ${editingCode}` : 'Create coupon'} onClose={onClose} size="lg"
      footer={<div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button><button type="button" className="btn btn-primary" onClick={() => { const r = actions.saveCoupon(v, editingCode); if (r.ok) { run(r, editingCode ? 'Coupon updated' : 'Coupon created'); onClose() } else { setErrors(r.errors ?? {}); if (!r.errors) run(r) } }}>{editingCode ? 'Save changes' : 'Create coupon'}</button></div>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Code" value={v.code} onChange={(e) => { setV({ ...v, code: e.target.value.toUpperCase() }); setErrors({ ...errors, code: undefined }) }} error={errors.code} disabled={Boolean(editingCode)} hint={editingCode ? 'Codes cannot be changed after creation.' : '4–16 letters/digits'} maxLength={16} />
        <TextField label="Title" value={v.title} onChange={set('title')} error={errors.title} />
        <SelectField label="Discount type" value={v.type} onChange={set('type')} error={errors.type} options={COUPON_TYPES.map((t) => ({ value: t.id, label: t.label }))} />
        {v.type !== 'freeDelivery' ? <TextField label={v.type === 'percent' ? 'Percentage (%)' : 'Amount off (₹)'} type="number" value={v.value} onChange={set('value')} error={errors.value} /> : <div />}
        {v.type === 'percent' ? <TextField label="Maximum discount (₹, optional)" type="number" value={v.maxDiscount} onChange={set('maxDiscount')} error={errors.maxDiscount} /> : null}
        <TextField label="Minimum order value (₹)" type="number" value={v.minSubtotal} onChange={set('minSubtotal')} error={errors.minSubtotal} />
        <TextField label="Starts (optional)" type="datetime-local" value={v.startsAt} onChange={set('startsAt')} error={errors.startsAt} />
        <TextField label="Expires (optional)" type="datetime-local" value={v.expiresAt} onChange={set('expiresAt')} error={errors.expiresAt} />
        <TextField label="Total usage limit (optional)" type="number" value={v.usageLimit} onChange={set('usageLimit')} error={errors.usageLimit} hint="Blank = unlimited. Cancelled orders don't count." />
        <TextAreaField label="Description (optional)" value={v.description} onChange={set('description')} className="sm:col-span-2" hint="Left blank, a description is generated from the rules." />
        <div className="sm:col-span-2"><CheckField label="Active" checked={v.active} onChange={(x) => setV({ ...v, active: x })} /></div>
        <p className="rounded-xl bg-cream-100 p-3 text-xs text-ink-700 sm:col-span-2">Eligibility: applies to every customer and restaurant. Per-customer, first-order and restaurant-specific rules are not supported by the existing cart logic, so they are intentionally not offered. Coupons are checked by the same code the customer cart uses.</p>
      </div>
    </Dialog>
  )
}

function Coupons() {
  const { state, orders, actions, can } = useAdmin()
  const run = useRun()
  const usage = useMemo(() => deriveCouponUsage(orders), [orders])
  const counts = useMemo(() => usageCounts(usage), [usage])
  const list = useListState({ filters: { status: 'all', type: 'all' }, sortKey: 'code' })
  const [form, setForm] = useState(null)
  const [del, setDel] = useState(null)
  const rows = state.coupons.map((c) => ({ ...c, used: counts[c.code] ?? 0, state: couponStatus(c, new Date(), counts[c.code] ?? 0) }))
  const result = queryRows(rows, { search: list.search, searchKeys: ['code', 'title'], filters: list.filters, filterFns: { status: (c, v) => c.state === v, type: (c, v) => c.type === v }, sortKey: list.sortKey, sortDir: list.sortDir, sorters: { used: (c) => c.used }, page: list.page, pageSize: list.pageSize })
  const canEdit = can('promotions', 'edit')
  const columns = [
    { key: 'code', header: 'Code', sortable: true, render: (c) => <span className="font-bold">{c.code}<span className="block text-xs font-normal text-ink-500">{c.title}</span></span> },
    { key: 'type', header: 'Discount', render: (c) => (c.type === 'percent' ? `${c.value}%${c.maxDiscount ? ` (max ₹${c.maxDiscount})` : ''}` : c.type === 'flat' ? `₹${c.value} off` : 'Free delivery') },
    { key: 'min', header: 'Min. order', render: (c) => (c.minSubtotal ? formatCurrency(c.minSubtotal) : '—') },
    { key: 'valid', header: 'Validity', render: (c) => <span className="whitespace-nowrap text-xs text-ink-500">{c.startsAt ? formatDateTime(c.startsAt) : 'Any time'} → {c.expiresAt ? formatDateTime(c.expiresAt) : 'No expiry'}</span> },
    { key: 'used', header: 'Used', sortable: true, render: (c) => `${c.used}${c.usageLimit ? ` / ${c.usageLimit}` : ''}` },
    { key: 'state', header: 'Status', render: (c) => <StatusBadge status={c.state} /> },
    { key: 'on', header: 'Active', render: (c) => <span onClick={(e) => e.stopPropagation()}><Toggle checked={c.active !== false} disabled={!canEdit} label={`${c.code} active`} onChange={(v) => run(actions.toggleCoupon(c.code, v), v ? 'Coupon activated' : 'Coupon deactivated')} /></span> },
    { key: 'actions', header: '', render: (c) => <span className="flex justify-end gap-1">{canEdit ? <button type="button" className="btn btn-ghost btn-sm !px-2" aria-label={`Edit ${c.code}`} onClick={() => setForm({ initial: fromCoupon(c), code: c.code })}><Pencil className="h-4 w-4" aria-hidden="true" /></button> : null}{can('promotions', 'delete') ? <button type="button" className="btn btn-ghost btn-sm !px-2" aria-label={`Delete ${c.code}`} onClick={() => setDel(c)}><Trash2 className="h-4 w-4" aria-hidden="true" /></button> : null}</span> },
  ]
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><FilterBar><SearchInput value={list.search} onChange={list.setSearch} placeholder="Code or title…" label="Search coupons" /><FilterSelect label="Status" value={list.filters.status} onChange={(v) => list.setFilter('status', v)} options={['active', 'inactive', 'scheduled', 'expired', 'exhausted'].map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }))} allLabel="Any status" /><FilterSelect label="Type" value={list.filters.type} onChange={(v) => list.setFilter('type', v)} options={COUPON_TYPES.map((t) => ({ value: t.id, label: t.label }))} allLabel="Any type" /></FilterBar>{can('promotions', 'create') ? <button type="button" className="btn btn-primary" onClick={() => setForm({ initial: BLANK, code: null })}><Plus className="h-4 w-4" aria-hidden="true" />New coupon</button> : null}</div>
      <DataTable caption="Coupons" columns={columns} result={result} rowKey={(c) => c.code} sort={{ key: list.sortKey, dir: list.sortDir }} onSort={list.toggleSort} onPage={list.setPage} onPageSize={list.setPageSize} empty={<div className="px-4 py-12 text-center"><p className="font-bold">No coupons found</p></div>} />
      {form ? <CouponForm initial={form.initial} editingCode={form.code} onClose={() => setForm(null)} /> : null}
      <ConfirmAction open={Boolean(del)} title={`Delete ${del?.code}?`} message="Customers can no longer apply this code. Existing orders keep the discount they received." confirmLabel="Delete coupon" danger onCancel={() => setDel(null)} onConfirm={() => { const r = actions.deleteCoupon(del.code); if (r.ok) { setDel(null); run(r, 'Coupon deleted') } return r }} />
    </>
  )
}

function CampaignForm({ initial, id, onClose }) {
  const { actions, state } = useAdmin()
  const run = useRun()
  const [v, setV] = useState(initial)
  const [errors, setErrors] = useState({})
  const toggleCode = (code, on) => { setV({ ...v, couponCodes: on ? [...v.couponCodes, code] : v.couponCodes.filter((c) => c !== code) }); setErrors({ ...errors, couponCodes: undefined }) }
  const set = (k) => (e) => { setV({ ...v, [k]: e.target.value }); setErrors({ ...errors, [k]: undefined }) }
  return (
    <Dialog open title={id ? 'Edit campaign' : 'New campaign'} onClose={onClose} size="md"
      footer={<div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button><button type="button" className="btn btn-primary" onClick={() => { const r = actions.saveCampaign(v, id); if (r.ok) { run(r, 'Campaign saved'); onClose() } else { setErrors(r.errors ?? {}); if (!r.errors) run(r) } }}>Save campaign</button></div>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Name" value={v.name} onChange={set('name')} error={errors.name} className="sm:col-span-2" />
        <TextAreaField label="Description" value={v.description} onChange={set('description')} className="sm:col-span-2" />
        <TextField label="Starts" type="datetime-local" value={v.startsAt} onChange={set('startsAt')} error={errors.startsAt} />
        <TextField label="Ends" type="datetime-local" value={v.endsAt} onChange={set('endsAt')} error={errors.endsAt} />
        <fieldset className="sm:col-span-2"><legend className="mb-1.5 text-sm font-bold">Coupons in this campaign</legend><div className="grid gap-2 sm:grid-cols-2">{state.coupons.map((c) => <CheckField key={c.code} label={c.code} checked={v.couponCodes.includes(c.code)} onChange={(on) => toggleCode(c.code, on)} />)}</div>{errors.couponCodes ? <p className="field-error">{errors.couponCodes}</p> : null}</fieldset>
        <CheckField label="Active" checked={v.active} onChange={(x) => setV({ ...v, active: x })} />
      </div>
    </Dialog>
  )
}

function Campaigns() {
  const { state, orders, actions, can } = useAdmin()
  const run = useRun()
  const usage = useMemo(() => deriveCouponUsage(orders), [orders])
  const [form, setForm] = useState(null)
  const [del, setDel] = useState(null)
  return (
    <>
      <div className="mb-4 flex justify-end">{can('promotions', 'create') ? <button type="button" className="btn btn-primary" onClick={() => setForm({ initial: { name: '', description: '', startsAt: '', endsAt: '', couponCodes: [], active: true }, id: null })}><Plus className="h-4 w-4" aria-hidden="true" />New campaign</button> : null}</div>
      <div className="grid gap-4 lg:grid-cols-2">
        {state.campaigns.map((c) => {
          const a = campaignAnalytics(c, usage, orders)
          const now = Date.now()
          const phase = !c.active ? 'inactive' : new Date(c.endsAt).getTime() < now ? 'expired' : new Date(c.startsAt).getTime() > now ? 'scheduled' : 'live'
          return (
            <Card key={c.id} title={c.name} subtitle={c.description} actions={<StatusBadge status={phase} />}>
              <p className="text-xs text-ink-500">{formatDateTime(c.startsAt)} → {formatDateTime(c.endsAt)}</p>
              <p className="mt-2 flex flex-wrap gap-1.5">{c.couponCodes.map((k) => <Badge key={k} tone="brand">{k}</Badge>)}</p>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">{[['Redemptions', a.redemptions], ['Discount given', formatCurrency(a.savings)], ['Order value', formatCurrency(a.revenue)], ['Avg. order', formatCurrency(a.avgOrderValue)]].map(([k, val]) => <div key={k}><dt className="text-xs text-ink-400">{k}</dt><dd className="font-extrabold tabular-nums">{val}</dd></div>)}</dl>
              <p className="mt-1 text-xs text-ink-400">Derived from orders that used these coupons (live + demo). Discount rate {Math.round(a.discountRate * 100)}% of order value.</p>
              {can('promotions', 'edit') ? <div className="mt-4 flex flex-wrap items-center gap-3"><Toggle checked={c.active} label={`${c.name} active`} onChange={(v) => run(actions.toggleCampaign(c.id, v), v ? 'Campaign activated' : 'Campaign paused')} /><button type="button" className="btn btn-ghost btn-sm" onClick={() => setForm({ initial: { name: c.name, description: c.description, startsAt: toLocalInput(c.startsAt), endsAt: toLocalInput(c.endsAt), couponCodes: [...c.couponCodes], active: c.active }, id: c.id })}>Edit</button>{can('promotions', 'delete') ? <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDel(c)}>Delete</button> : null}</div> : null}
            </Card>
          )
        })}
        {state.campaigns.length === 0 ? <p className="text-ink-500">No campaigns yet.</p> : null}
      </div>
      {form ? <CampaignForm initial={form.initial} id={form.id} onClose={() => setForm(null)} /> : null}
      <ConfirmAction open={Boolean(del)} title={`Delete “${del?.name}”?`} message="The attached coupons stay available; only the campaign grouping is removed." confirmLabel="Delete campaign" danger onCancel={() => setDel(null)} onConfirm={() => { const r = actions.deleteCampaign(del.id); if (r.ok) { setDel(null); run(r, 'Campaign deleted') } return r }} />
    </>
  )
}

function Referral() {
  const { state, actions, can } = useAdmin()
  const run = useRun()
  const [v, setV] = useState({ ...state.referral })
  const [errors, setErrors] = useState({})
  const canEdit = can('promotions', 'edit')
  const set = (k) => (e) => { setV({ ...v, [k]: e.target.value }); setErrors({ ...errors, [k]: undefined }) }
  return (
    <Card title="Referral program" subtitle="Configuration only.">
      <Alert tone="warn" className="mb-4">The customer app has no referral flow yet, so saving this does not issue rewards. It stores the program rules for when the feature is built.</Alert>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-3 sm:col-span-2"><Toggle checked={Boolean(v.enabled)} disabled={!canEdit} label="Referral program enabled" onChange={(x) => setV({ ...v, enabled: x })} /><span className="text-sm font-bold">{v.enabled ? 'Enabled' : 'Disabled'}</span></div>
        <TextField label="Referrer reward (₹)" type="number" value={v.referrerReward} onChange={set('referrerReward')} error={errors.referrerReward} disabled={!canEdit} />
        <TextField label="New customer reward (₹)" type="number" value={v.refereeReward} onChange={set('refereeReward')} error={errors.refereeReward} disabled={!canEdit} />
        <TextField label="Minimum first-order value (₹)" type="number" value={v.minOrderValue} onChange={set('minOrderValue')} error={errors.minOrderValue} disabled={!canEdit} />
        <TextField label="Max referrals per user" type="number" value={v.maxReferralsPerUser} onChange={set('maxReferralsPerUser')} error={errors.maxReferralsPerUser} disabled={!canEdit} />
        <TextField label="Reward expiry (days)" type="number" value={v.rewardExpiryDays} onChange={set('rewardExpiryDays')} error={errors.rewardExpiryDays} disabled={!canEdit} />
      </div>
      {canEdit ? <div className="mt-5 flex gap-2"><button type="button" className="btn btn-primary" onClick={() => { const r = actions.saveReferral(v); if (r.ok) run(r, 'Referral settings saved'); else { setErrors(r.errors ?? {}); if (!r.errors) run(r) } }}>Save</button><button type="button" className="btn btn-ghost" onClick={() => { setV({ ...state.referral }); setErrors({}) }}>Reset</button></div> : null}
    </Card>
  )
}

function UsageTab() {
  const { orders } = useAdmin()
  const usage = useMemo(() => deriveCouponUsage(orders), [orders])
  const list = useListState({ filters: { code: 'all' }, sortKey: 'at', sortDir: 'desc' })
  const codes = [...new Set(usage.map((u) => u.code))].map((c) => ({ value: c, label: c }))
  const result = queryRows(usage, { search: list.search, searchKeys: ['code', 'orderId', 'customer'], filters: list.filters, sortKey: list.sortKey, sortDir: list.sortDir, page: list.page, pageSize: list.pageSize })
  const columns = [
    { key: 'code', header: 'Coupon', render: (u) => <span className="font-bold">{u.code}</span> },
    { key: 'orderId', header: 'Order', render: (u) => <span>{u.orderId} {u.source === 'demo' ? <DemoBadge /> : null}</span> },
    { key: 'customer', header: 'Customer', render: (u) => u.customer },
    { key: 'at', header: 'Date', sortable: true, render: (u) => <span className="whitespace-nowrap text-ink-500">{formatDateTime(u.at)}</span> },
    { key: 'savings', header: 'Customer saved', sortable: true, render: (u) => <span className="font-bold tabular-nums">{formatCurrency(u.savings)}</span> },
    { key: 'orderTotal', header: 'Order total', render: (u) => <span className="tabular-nums">{formatCurrency(u.orderTotal)}</span> },
    { key: 'cancelled', header: 'Counts?', render: (u) => (u.cancelled ? <Badge tone="bad">Cancelled</Badge> : <Badge tone="good">Yes</Badge>) },
  ]
  return (
    <>
      <FilterBar><SearchInput value={list.search} onChange={list.setSearch} placeholder="Coupon, order or customer…" /><FilterSelect label="Coupon" value={list.filters.code} onChange={(v) => list.setFilter('code', v)} options={codes} allLabel="All coupons" /></FilterBar>
      <DataTable caption="Coupon usage records" columns={columns} result={result} rowKey={(u) => u.id} sort={{ key: list.sortKey, dir: list.sortDir }} onSort={list.toggleSort} onPage={list.setPage} onPageSize={list.setPageSize} empty={<div className="px-4 py-12 text-center"><p className="font-bold">No coupon has been used yet</p></div>} />
    </>
  )
}

export default function Promotions() {
  usePageTitle('Promotions — Craveo Admin')
  const { state } = useAdmin()
  const [tab, setTab] = useState('coupons')
  return (
    <Fade>
      <PageHeader title="Offers & promotions" description="Coupons you create here are validated by the same logic as the customer cart and checkout." />
      <Tabs tabs={[{ id: 'coupons', label: 'Coupons', count: state.coupons.length }, { id: 'campaigns', label: 'Campaigns', count: state.campaigns.length }, { id: 'referral', label: 'Referral program' }, { id: 'usage', label: 'Usage records' }]} value={tab} onChange={setTab} label="Promotion views" />
      {tab === 'coupons' ? <Coupons /> : null}{tab === 'campaigns' ? <Campaigns /> : null}{tab === 'referral' ? <Referral /> : null}{tab === 'usage' ? <UsageTab /> : null}
    </Fade>
  )
}
