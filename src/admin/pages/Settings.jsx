import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useAdmin } from '../context/adminContextValue.js'
import { Alert, Card, CheckField, ConfirmAction, Dialog, Fade, PageHeader, SelectField, Tabs, TextField, Toggle, StatusBadge } from '../components/ui.jsx'
import { useRun } from '../components/uiHooks.js'
import { CURRENCIES, LOCALES } from '../lib/validators.js'
import { formatCurrency } from '../../utils/format.js'
import usePageTitle from '../../hooks/usePageTitle.js'

const toForm = (s) => Object.fromEntries(Object.entries(s).filter(([k]) => k !== 'notifications').map(([k, v]) => [k, String(v ?? '')]))

function Platform() {
  const { settings, actions, can } = useAdmin()
  const run = useRun()
  const [v, setV] = useState(toForm(settings))
  const [errors, setErrors] = useState({})
  const [reset, setReset] = useState(false)
  const canEdit = can('settings', 'edit')
  const set = (k) => (e) => { setV({ ...v, [k]: e.target.value }); setErrors({ ...errors, [k]: undefined }) }
  const f = (k, label, extra = {}) => <TextField label={label} value={v[k]} onChange={set(k)} error={errors[k]} disabled={!canEdit} {...extra} />
  const dirty = JSON.stringify(v) !== JSON.stringify(toForm(settings))
  return (
    <div className="space-y-6">
      <Alert tone="info">New values apply to <strong>new orders only</strong>. Saved orders keep the totals they were placed with. Platform name and tagline are used in this admin panel; currency and locale are stored, but the storefront still formats prices as INR (₹).</Alert>
      <Card title="Platform & branding"><div className="grid gap-4 sm:grid-cols-2">{f('platformName', 'Platform name', { maxLength: 40 })}{f('tagline', 'Tagline')}<SelectField label="Currency" value={v.currency} onChange={set('currency')} error={errors.currency} disabled={!canEdit} options={CURRENCIES.map((c) => ({ value: c, label: c }))} /><SelectField label="Locale" value={v.locale} onChange={set('locale')} error={errors.locale} disabled={!canEdit} options={LOCALES.map((c) => ({ value: c, label: c }))} /></div></Card>
      <Card title="Pricing & tax" subtitle="Used by the customer cart and checkout for new orders."><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{f('defaultDeliveryFee', 'Default delivery fee (₹)', { type: 'number', hint: 'Prefilled for new restaurants only.' })}{f('freeDeliveryThreshold', 'Free delivery above (₹)', { type: 'number' })}{f('platformFee', 'Platform fee (₹)', { type: 'number' })}{f('gstPercent', 'GST (%)', { type: 'number', step: '0.5' })}</div></Card>
      <Card title="Orders, refunds & partners"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{f('etaBufferMinutes', 'ETA buffer (min)', { type: 'number', hint: 'Added to a restaurant’s delivery time.' })}{f('refundWindowDays', 'Customer refund window (days)', { type: 'number' })}{f('defaultCommission', 'Default commission (%)', { type: 'number', step: '0.5' })}{f('partnerPayoutPerDelivery', 'Partner payout per delivery (₹)', { type: 'number' })}{f('partnerMaxActive', 'Max active deliveries per partner', { type: 'number' })}</div></Card>
      {canEdit ? <div className="flex flex-wrap gap-2"><button type="button" className="btn btn-primary" disabled={!dirty} onClick={() => { const r = actions.saveSettings(v); if (r.ok) { setErrors({}); run(r, 'Settings saved') } else { setErrors(r.errors ?? {}); if (!r.errors) run(r) } }}>Save changes</button><button type="button" className="btn btn-ghost" disabled={!dirty} onClick={() => { setV(toForm(settings)); setErrors({}) }}>Discard</button><button type="button" className="btn btn-ghost" onClick={() => setReset(true)}>Reset to defaults…</button></div> : <p className="text-sm text-ink-500">You have view-only access to settings.</p>}
      <ConfirmAction open={reset} title="Reset all settings?" message="Platform, pricing, tax and order settings return to their original defaults. Existing orders are unaffected." confirmLabel="Reset settings" danger onCancel={() => setReset(false)} onConfirm={() => { const r = actions.resetSettings(); if (r.ok) { setReset(false); run(r, 'Settings reset') } return r }} />
    </div>
  )
}

function ZoneForm({ initial, id, onClose }) {
  const { actions } = useAdmin()
  const run = useRun()
  const [v, setV] = useState(initial)
  const [errors, setErrors] = useState({})
  const set = (k) => (e) => { setV({ ...v, [k]: e.target.value }); setErrors({ ...errors, [k]: undefined }) }
  return (
    <Dialog open title={id ? 'Edit zone' : 'New delivery zone'} onClose={onClose} size="md" footer={<div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button><button type="button" className="btn btn-primary" onClick={() => { const r = actions.saveZone(v, id); if (r.ok) { run(r, 'Zone saved'); onClose() } else { setErrors(r.errors ?? {}); if (!r.errors) run(r) } }}>Save zone</button></div>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Zone name" value={v.name} onChange={set('name')} error={errors.name} className="sm:col-span-2" />
        <TextField label="Coverage (areas / PIN codes)" value={v.coverage} onChange={set('coverage')} error={errors.coverage} className="sm:col-span-2" />
        <TextField label="Delivery fee (₹)" type="number" value={v.deliveryFee} onChange={set('deliveryFee')} error={errors.deliveryFee} />
        <TextField label="Minimum order (₹)" type="number" value={v.minOrder} onChange={set('minOrder')} error={errors.minOrder} />
        <TextField label="Extra delivery time (min)" type="number" value={v.etaExtra} onChange={set('etaExtra')} error={errors.etaExtra} />
        <div className="self-end"><CheckField label="Zone active" checked={v.active} onChange={(x) => setV({ ...v, active: x })} /></div>
      </div>
    </Dialog>
  )
}

function Zones() {
  const { state, actions, can } = useAdmin()
  const run = useRun()
  const [form, setForm] = useState(null)
  const [del, setDel] = useState(null)
  return (
    <div className="space-y-4">
      <Alert tone="warn">Zones are a configuration record only. The customer app does <strong>not</strong> check addresses against these zones — there is no geospatial or PIN-code validation yet.</Alert>
      {can('settings', 'create') ? <div className="flex justify-end"><button type="button" className="btn btn-primary" onClick={() => setForm({ initial: { name: '', coverage: '', deliveryFee: '30', minOrder: '149', etaExtra: '0', active: true }, id: null })}><Plus className="h-4 w-4" aria-hidden="true" />New zone</button></div> : null}
      <div className="grid gap-4 lg:grid-cols-2">{state.zones.map((z) => (
        <Card key={z.id} title={z.name} subtitle={z.coverage} actions={<StatusBadge status={z.active ? 'active' : 'inactive'} />}>
          <dl className="grid grid-cols-3 gap-3 text-sm">{[['Delivery fee', formatCurrency(z.deliveryFee)], ['Min. order', formatCurrency(z.minOrder)], ['Extra time', `+${z.etaExtra} min`]].map(([k, val]) => <div key={k}><dt className="text-xs text-ink-400">{k}</dt><dd className="font-extrabold">{val}</dd></div>)}</dl>
          {can('settings', 'edit') ? <div className="mt-4 flex flex-wrap items-center gap-3"><Toggle checked={z.active} label={`${z.name} active`} onChange={(on) => run(actions.saveZone({ ...z, deliveryFee: String(z.deliveryFee), minOrder: String(z.minOrder), etaExtra: String(z.etaExtra), active: on }, z.id), on ? 'Zone activated' : 'Zone paused')} /><button type="button" className="btn btn-ghost btn-sm" onClick={() => setForm({ initial: { name: z.name, coverage: z.coverage, deliveryFee: String(z.deliveryFee), minOrder: String(z.minOrder), etaExtra: String(z.etaExtra), active: z.active }, id: z.id })}><Pencil className="h-4 w-4" aria-hidden="true" />Edit</button>{can('settings', 'delete') ? <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDel(z)}><Trash2 className="h-4 w-4" aria-hidden="true" />Delete</button> : null}</div> : null}
        </Card>))}</div>
      {form ? <ZoneForm initial={form.initial} id={form.id} onClose={() => setForm(null)} /> : null}
      <ConfirmAction open={Boolean(del)} title={`Delete ${del?.name}?`} message="This only removes the configuration record." confirmLabel="Delete zone" danger onCancel={() => setDel(null)} onConfirm={() => { const r = actions.deleteZone(del.id); if (r.ok) { setDel(null); run(r, 'Zone deleted') } return r }} />
    </div>
  )
}

const PREFS = [['orders', 'New orders'], ['refunds', 'Refund requests'], ['restaurants', 'Restaurant applications'], ['partners', 'Delivery partner registrations'], ['support', 'Support tickets']]

function Notifs() {
  const { settings, actions, can } = useAdmin()
  const run = useRun()
  return (
    <Card title="In-app notification preferences" subtitle="Controls which events appear in the notification bell.">
      <Alert tone="info" className="mb-4">Email and SMS notifications are not available — no messaging service is connected.</Alert>
      <ul className="divide-y divide-ink-200/60">{PREFS.map(([k, label]) => <li key={k} className="flex items-center justify-between gap-3 py-3 text-sm"><span className="font-bold">{label}</span><Toggle checked={settings.notifications[k] !== false} disabled={!can('settings', 'edit')} label={label} onChange={(on) => run(actions.saveNotificationPrefs({ ...settings.notifications, [k]: on }), 'Preference saved')} /></li>)}</ul>
    </Card>
  )
}

export default function Settings() {
  usePageTitle('Settings — Craveo Admin')
  const { settings } = useAdmin()
  const [tab, setTab] = useState('platform')
  return (
    <Fade>
      <PageHeader title="Settings & zones" description="Platform, pricing and tax rules, delivery zones and notification preferences." />
      <Tabs tabs={[{ id: 'platform', label: 'Platform & pricing' }, { id: 'zones', label: 'Delivery zones' }, { id: 'notifications', label: 'Notifications' }]} value={tab} onChange={setTab} label="Settings sections" />
      {tab === 'platform' ? <Platform key={JSON.stringify(settings)} /> : null}{tab === 'zones' ? <Zones /> : null}{tab === 'notifications' ? <Notifs /> : null}
    </Fade>
  )
}
