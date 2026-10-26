import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import { useAdmin } from '../context/adminContextValue.js'
import { Alert, Badge, Card, ConfirmAction, Dialog, Fade, PageHeader, SelectField, StatusBadge, Tabs, TextField, Toggle } from '../components/ui.jsx'
import { useRun } from '../components/uiHooks.js'
import { ACTIONS, MODULES, ROLES } from '../lib/rbac.js'
import PasswordField from '../../components/common/PasswordField.jsx'
import { Field } from '../components/ui.jsx'
import usePageTitle from '../../hooks/usePageTitle.js'

function NewAdmin({ onClose }) {
  const { actions } = useAdmin()
  const run = useRun()
  const [v, setV] = useState({ name: '', email: '', role: 'support', password: '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => { setV({ ...v, [k]: e.target.value }); setErrors({ ...errors, [k]: undefined }) }
  const submit = async () => {
    setBusy(true)
    const r = await actions.createAdminUser(v)
    setBusy(false)
    if (r.ok) { run(r, 'Demo admin created'); onClose() } else { setErrors(r.errors ?? {}); if (!r.errors) run(r) }
  }
  return (
    <Dialog open title="Add demo admin" onClose={onClose} size="md" footer={<div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button><button type="button" className="btn btn-primary" disabled={busy} onClick={submit}>{busy ? 'Creating…' : 'Create admin'}</button></div>}>
      <div className="grid gap-4">
        <TextField label="Name" value={v.name} onChange={set('name')} error={errors.name} />
        <TextField label="Email" type="email" value={v.email} onChange={set('email')} error={errors.email} />
        <SelectField label="Role" value={v.role} onChange={set('role')} error={errors.role} options={ROLES.map((r) => ({ value: r.id, label: r.label }))} />
        <Field label="Password" htmlFor="new-admin-pw" error={errors.password} hint="Only a salted hash is stored — never the password itself."><PasswordField id="new-admin-pw" value={v.password} onChange={set('password')} invalid={Boolean(errors.password)} autoComplete="new-password" /></Field>
      </div>
    </Dialog>
  )
}

function Matrix() {
  const { state, actions, admin } = useAdmin()
  const run = useRun()
  const [reset, setReset] = useState(false)
  const isSuper = admin.role === 'super_admin'
  return (
    <div className="space-y-4">
      <Alert tone="warn">Demo limitation: permissions are enforced in the browser only (menus, pages and actions). Anyone with DevTools can bypass them. Real production authorization must be enforced by the backend.</Alert>
      {!isSuper ? <Alert tone="info">You can view the matrix, but only a Super Admin can change it.</Alert> : null}
      {ROLES.map((role) => (
        <Card key={role.id} title={role.label} subtitle={role.description} padded={false}>
          <div className="overflow-x-auto"><table className="w-full min-w-[34rem] text-sm"><thead className="bg-cream-100 text-xs uppercase tracking-wider text-ink-500"><tr><th scope="col" className="px-4 py-2 text-left">Module</th>{ACTIONS.map((a) => <th key={a.id} scope="col" className="px-2 py-2 text-center">{a.label}</th>)}</tr></thead>
            <tbody className="divide-y divide-ink-200/60">{MODULES.map((m) => <tr key={m.id}><th scope="row" className="px-4 py-2 text-left font-semibold">{m.label}</th>{ACTIONS.map((a) => { const on = state.matrix[role.id][m.id].includes(a.id); return <td key={a.id} className="px-2 py-2 text-center"><input type="checkbox" className="h-4 w-4 accent-[#ef4f3a]" checked={on} disabled={!isSuper || role.id === 'super_admin'} aria-label={`${role.label}: ${a.label} ${m.label}`} onChange={(e) => run(actions.setPermission(role.id, m.id, a.id, e.target.checked))} /></td> })}</tr>)}</tbody></table></div>
        </Card>
      ))}
      {isSuper ? <button type="button" className="btn btn-ghost" onClick={() => setReset(true)}>Restore least-privilege defaults…</button> : null}
      <ConfirmAction open={reset} title="Restore default permissions?" message="All custom permission changes are replaced by the least-privilege defaults." confirmLabel="Restore defaults" danger onCancel={() => setReset(false)} onConfirm={() => { const r = actions.resetMatrix(); if (r.ok) { setReset(false); run(r, 'Defaults restored') } return r }} />
    </div>
  )
}

function Admins() {
  const { state, actions, admin } = useAdmin()
  const run = useRun()
  const [adding, setAdding] = useState(false)
  const isSuper = admin.role === 'super_admin'
  return (
    <div className="space-y-4">
      {isSuper ? <div className="flex justify-end"><button type="button" className="btn btn-primary" onClick={() => setAdding(true)}><UserPlus className="h-4 w-4" aria-hidden="true" />Add demo admin</button></div> : <Alert tone="info">Only a Super Admin can add or change admin users.</Alert>}
      <Card padded={false}><ul className="divide-y divide-ink-200/60">{state.adminUsers.map((u) => (
        <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div className="min-w-0"><p className="font-bold">{u.name} {u.id === admin.id ? <Badge tone="brand">You</Badge> : null}</p><p className="truncate text-sm text-ink-500">{u.email}</p></div>
          <div className="flex flex-wrap items-center gap-3"><StatusBadge status={u.active !== false ? 'active' : 'inactive'} />
            <select className="input !min-h-9 !w-auto" aria-label={`Role for ${u.name}`} value={u.role} disabled={!isSuper} onChange={(e) => run(actions.setAdminRole(u.id, e.target.value), 'Role updated')}>{ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}</select>
            <Toggle checked={u.active !== false} disabled={!isSuper} label={`${u.name} active`} onChange={(on) => run(actions.setAdminActive(u.id, on), on ? 'Admin activated' : 'Admin deactivated')} /></div>
        </li>))}</ul></Card>
      {adding ? <NewAdmin onClose={() => setAdding(false)} /> : null}
    </div>
  )
}

export default function Roles() {
  usePageTitle('Roles — Craveo Admin')
  const [tab, setTab] = useState('admins')
  return (
    <Fade>
      <PageHeader title="Roles & admins" description="Admin users, role assignment and the permission matrix." />
      <Tabs tabs={[{ id: 'admins', label: 'Admin users' }, { id: 'matrix', label: 'Permission matrix' }]} value={tab} onChange={setTab} label="Role views" />
      {tab === 'admins' ? <Admins /> : <Matrix />}
    </Fade>
  )
}
