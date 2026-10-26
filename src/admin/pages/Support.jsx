import { useState } from 'react'
import { Plus, Send } from 'lucide-react'
import { useAdmin } from '../context/adminContextValue.js'
import { Alert, Badge, Card, DataTable, DemoBadge, Dialog, Fade, FilterBar, FilterSelect, PageHeader, ReasonDialog, SearchInput, SelectField, StatusBadge, TextAreaField, TextField, CheckField } from '../components/ui.jsx'
import { useListState, useRun } from '../components/uiHooks.js'
import { TRANSITIONS, STATUS_LABELS } from '../lib/support.js'
import { TICKET_CATEGORIES, TICKET_PRIORITIES, TICKET_STATUSES } from '../lib/validators.js'
import { queryRows } from '../lib/table.js'
import { formatDateTime } from '../../utils/format.js'
import usePageTitle from '../../hooks/usePageTitle.js'

const PRIORITY_TONE = { low: 'neutral', medium: 'info', high: 'orange', urgent: 'bad' }
const cap = (s) => s.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())

function NewTicket({ onClose }) {
  const { actions, orders } = useAdmin()
  const run = useRun()
  const [v, setV] = useState({ subject: '', category: 'order', priority: 'medium', customerName: '', customerEmail: '', orderId: '', message: '', isDispute: false })
  const [errors, setErrors] = useState({})
  const set = (k) => (e) => { setV({ ...v, [k]: e.target.value }); setErrors({ ...errors, [k]: undefined }) }
  const pickOrder = (id) => { const o = orders.find((x) => x.id === id); setV({ ...v, orderId: id, customerName: o ? o.customer.name : v.customerName, customerEmail: o ? o.customer.email : v.customerEmail }) }
  return (
    <Dialog open title="New ticket" onClose={onClose} size="md" footer={<div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button><button type="button" className="btn btn-primary" onClick={() => { const r = actions.createTicket(v); if (r.ok) { run(r, `Ticket ${r.id} created`); onClose() } else { setErrors(r.errors ?? {}); if (!r.errors) run(r) } }}>Create ticket</button></div>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Subject" value={v.subject} onChange={set('subject')} error={errors.subject} className="sm:col-span-2" maxLength={80} />
        <SelectField label="Category" value={v.category} onChange={set('category')} options={TICKET_CATEGORIES.map((c) => ({ value: c, label: cap(c) }))} />
        <SelectField label="Priority" value={v.priority} onChange={set('priority')} options={TICKET_PRIORITIES.map((c) => ({ value: c, label: cap(c) }))} />
        <SelectField label="Related order (optional)" value={v.orderId} onChange={(e) => pickOrder(e.target.value)} placeholder="None" options={orders.slice(0, 40).map((o) => ({ value: o.id, label: `${o.id} · ${o.customer.name}` }))} className="sm:col-span-2" />
        <TextField label="Customer name" value={v.customerName} onChange={set('customerName')} error={errors.customerName} />
        <TextField label="Customer email" type="email" value={v.customerEmail} onChange={set('customerEmail')} error={errors.customerEmail} />
        <TextAreaField label="Issue description" value={v.message} onChange={set('message')} error={errors.message} className="sm:col-span-2" />
        <div className="sm:col-span-2"><CheckField label="Treat as a dispute" checked={v.isDispute} onChange={(x) => setV({ ...v, isDispute: x })} hint="Disputes need a written resolution before the ticket can be resolved." /></div>
      </div>
    </Dialog>
  )
}

function Detail({ ticketId, onClose }) {
  const { state, actions, can } = useAdmin()
  const run = useRun()
  const t = state.tickets.find((x) => x.id === ticketId)
  const [reply, setReply] = useState('')
  const [dialog, setDialog] = useState(false)
  if (!t) return null
  const canEdit = can('support', 'edit')
  const admins = state.adminUsers.filter((u) => u.active !== false)
  return (
    <>
      <Dialog open title={`${t.id} · ${t.subject}`} onClose={onClose} size="lg">
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2"><StatusBadge status={t.status} label={STATUS_LABELS[t.status]} /><Badge tone={PRIORITY_TONE[t.priority]}>{cap(t.priority)}</Badge><Badge>{cap(t.category)}</Badge>{t.demo ? <DemoBadge /> : null}{t.orderId ? <Badge tone="info">{t.orderId}</Badge> : null}{t.dispute?.open ? <Badge tone="bad">Dispute open</Badge> : t.dispute ? <Badge tone="good">Dispute resolved</Badge> : null}</div>
          <p className="text-sm text-ink-500">{t.customerName} {t.customerEmail ? `· ${t.customerEmail}` : ''} · opened {formatDateTime(t.createdAt)}</p>
          {canEdit ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <SelectField label="Status" value={t.status} onChange={(e) => run(actions.setTicketStatus(t.id, e.target.value), 'Status updated')} options={[t.status, ...TRANSITIONS[t.status]].map((s) => ({ value: s, label: STATUS_LABELS[s] }))} />
              <SelectField label="Assigned to" value={t.assigneeId ?? ''} onChange={(e) => run(actions.assignTicket(t.id, e.target.value), 'Assignment updated')} placeholder="Unassigned" options={admins.map((a) => ({ value: a.id, label: `${a.name} (${a.role.replace(/_/g, ' ')})` }))} />
            </div>
          ) : null}
          <Card title="Conversation">
            <ol className="space-y-3" aria-label="Ticket conversation">{t.messages.map((m) => <li key={m.id} className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${m.from === 'admin' ? 'ml-auto bg-brand-50' : 'bg-cream-100'}`}><p className="text-xs font-bold text-ink-500">{m.author} · {formatDateTime(m.at)}</p><p className="mt-0.5 whitespace-pre-wrap break-words">{m.text}</p></li>)}</ol>
            {canEdit && t.status !== 'closed' ? (
              <form className="mt-4 space-y-2" onSubmit={(e) => { e.preventDefault(); if (run(actions.replyTicket(t.id, reply), 'Reply saved')) setReply('') }}>
                <TextAreaField label="Reply" value={reply} onChange={(e) => setReply(e.target.value)} maxLength={500} />
                <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-ink-400">Demo: replies stay in this panel. No email or SMS is sent.</p><button type="submit" className="btn btn-primary btn-sm"><Send className="h-4 w-4" aria-hidden="true" />Save reply</button></div>
              </form>
            ) : null}
          </Card>
          <Card title="Dispute review">
            {t.dispute?.open ? <><p className="text-sm text-ink-700">This ticket is under dispute review. Record the outcome to allow resolving the ticket.</p>{can('support', 'approve') ? <button type="button" className="btn btn-dark btn-sm mt-3" onClick={() => setDialog(true)}>Resolve dispute</button> : null}</>
              : t.dispute ? <p className="text-sm"><strong>Resolved {formatDateTime(t.dispute.resolvedAt)}.</strong> {t.dispute.note}</p>
              : <><p className="text-sm text-ink-500">No dispute on this ticket.</p>{canEdit ? <button type="button" className="btn btn-ghost btn-sm mt-3" onClick={() => run(actions.openDispute(t.id), 'Dispute opened')}>Open dispute</button> : null}</>}
          </Card>
        </div>
      </Dialog>
      <ReasonDialog open={dialog} title="Resolve dispute" message="Describe the outcome and any compensation. Refund amounts must be approved separately in Orders." label="Resolution note" minLength={10} confirmLabel="Resolve" onCancel={() => setDialog(false)} onConfirm={(note) => { const r = actions.resolveDispute(t.id, note); if (r.ok) { setDialog(false); run(r, 'Dispute resolved') } return r }} />
    </>
  )
}

export default function Support() {
  usePageTitle('Support — Craveo Admin')
  const { state, can } = useAdmin()
  const list = useListState({ filters: { status: 'all', priority: 'all', category: 'all', assignee: 'all' }, sortKey: 'updatedAt', sortDir: 'desc' })
  const [openId, setOpenId] = useState(null)
  const [creating, setCreating] = useState(false)
  const name = (id) => state.adminUsers.find((u) => u.id === id)?.name ?? 'Unassigned'
  const order = { urgent: 3, high: 2, medium: 1, low: 0 }
  const result = queryRows(state.tickets, { search: list.search, searchKeys: ['id', 'subject', 'customerName', 'orderId'], filters: list.filters, filterFns: { assignee: (t, v) => (v === 'none' ? !t.assigneeId : t.assigneeId === v) }, sortKey: list.sortKey, sortDir: list.sortDir, sorters: { priority: (t) => order[t.priority] }, page: list.page, pageSize: list.pageSize })
  const open = state.tickets.filter((t) => t.status === 'open').length
  const columns = [
    { key: 'id', header: 'Ticket', render: (t) => <span className="font-bold">{t.id} {t.demo ? <DemoBadge /> : null}<span className="block max-w-xs truncate text-xs font-normal text-ink-500">{t.subject}</span></span> },
    { key: 'customerName', header: 'Customer', render: (t) => t.customerName },
    { key: 'category', header: 'Category', render: (t) => cap(t.category) },
    { key: 'priority', header: 'Priority', sortable: true, render: (t) => <Badge tone={PRIORITY_TONE[t.priority]}>{cap(t.priority)}</Badge> },
    { key: 'status', header: 'Status', render: (t) => <span className="flex flex-wrap gap-1"><StatusBadge status={t.status} label={STATUS_LABELS[t.status]} />{t.dispute?.open ? <Badge tone="bad">Dispute</Badge> : null}</span> },
    { key: 'assignee', header: 'Assignee', render: (t) => name(t.assigneeId) },
    { key: 'updatedAt', header: 'Updated', sortable: true, render: (t) => <span className="whitespace-nowrap text-ink-500">{formatDateTime(t.updatedAt)}</span> },
  ]
  return (
    <Fade>
      <PageHeader title="Support & disputes" description={`${open} open ticket${open === 1 ? '' : 's'}. Replies are stored in this demo only.`} actions={can('support', 'create') ? <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}><Plus className="h-4 w-4" aria-hidden="true" />New ticket</button> : null} />
      <Alert tone="info" className="mb-4">Customers cannot raise tickets from the storefront yet, so tickets here are demo samples or logged manually by staff.</Alert>
      <FilterBar>
        <SearchInput value={list.search} onChange={list.setSearch} placeholder="Ticket, subject, customer, order…" label="Search tickets" />
        <FilterSelect label="Status" value={list.filters.status} onChange={(v) => list.setFilter('status', v)} options={TICKET_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))} allLabel="Any status" />
        <FilterSelect label="Priority" value={list.filters.priority} onChange={(v) => list.setFilter('priority', v)} options={TICKET_PRIORITIES.map((s) => ({ value: s, label: cap(s) }))} allLabel="Any priority" />
        <FilterSelect label="Category" value={list.filters.category} onChange={(v) => list.setFilter('category', v)} options={TICKET_CATEGORIES.map((s) => ({ value: s, label: cap(s) }))} allLabel="Any category" />
        <FilterSelect label="Assignee" value={list.filters.assignee} onChange={(v) => list.setFilter('assignee', v)} options={[{ value: 'none', label: 'Unassigned' }, ...state.adminUsers.map((u) => ({ value: u.id, label: u.name }))]} allLabel="Anyone" />
      </FilterBar>
      <DataTable caption="Support tickets" columns={columns} result={result} rowKey={(t) => t.id} sort={{ key: list.sortKey, dir: list.sortDir }} onSort={list.toggleSort} onPage={list.setPage} onPageSize={list.setPageSize} onRowClick={(t) => setOpenId(t.id)} empty={<div className="px-4 py-12 text-center"><p className="font-bold">No tickets match</p></div>} />
      {openId ? <Detail ticketId={openId} onClose={() => setOpenId(null)} /> : null}
      {creating ? <NewTicket onClose={() => setCreating(false)} /> : null}
    </Fade>
  )
}
