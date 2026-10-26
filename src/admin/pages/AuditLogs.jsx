import { useMemo, useState } from 'react'
import { useAdmin } from '../context/adminContextValue.js'
import { Alert, DataTable, Dialog, FilterBar, FilterSelect, Fade, KeyValue, PageHeader, SearchInput } from '../components/ui.jsx'
import { useListState } from '../components/uiHooks.js'
import { queryRows } from '../lib/table.js'
import { formatDateTime } from '../../utils/format.js'
import usePageTitle from '../../hooks/usePageTitle.js'

const pretty = (obj) => (obj && Object.keys(obj).length ? Object.entries(obj).map(([k, v]) => `${k}: ${v === null || v === undefined ? '—' : String(v)}`).join('\n') : '—')

export default function AuditLogs() {
  usePageTitle('Audit logs — Craveo Admin')
  const { state } = useAdmin()
  const list = useListState({ filters: { type: 'all', actor: 'all' }, sortKey: 'at', sortDir: 'desc' })
  const [open, setOpen] = useState(null)
  const types = useMemo(() => [...new Set(state.audit.map((a) => a.entity.type))].map((t) => ({ value: t, label: t.replace(/_/g, ' ') })), [state.audit])
  const actors = useMemo(() => [...new Set(state.audit.map((a) => a.actor.name))].map((t) => ({ value: t, label: t })), [state.audit])
  const result = queryRows(state.audit, { search: list.search, searchKeys: ['action', 'entity.label', 'entity.id', 'actor.name', 'note'], filters: list.filters, filterFns: { type: (r, v) => r.entity.type === v, actor: (r, v) => r.actor.name === v }, sortKey: list.sortKey, sortDir: list.sortDir, page: list.page, pageSize: list.pageSize })
  const columns = [
    { key: 'at', header: 'When', sortable: true, render: (r) => <span className="whitespace-nowrap">{formatDateTime(r.at)}</span> },
    { key: 'actor.name', header: 'Actor', render: (r) => <span><span className="font-bold">{r.actor.name}</span><span className="block text-xs text-ink-400">{r.actor.role.replace(/_/g, ' ')}</span></span> },
    { key: 'action', header: 'Action', sortable: true, render: (r) => <code className="rounded bg-cream-100 px-1.5 py-0.5 text-xs">{r.action}</code> },
    { key: 'entity', header: 'Affected entity', render: (r) => <span><span className="font-semibold">{r.entity.label}</span><span className="block text-xs text-ink-400">{r.entity.type.replace(/_/g, ' ')} · {r.entity.id}</span></span> },
    { key: 'note', header: 'Change', render: (r) => <span className="line-clamp-2 max-w-xs text-xs text-ink-500">{r.before || r.after ? `${r.before ? 'before: ' + Object.values(r.before).join(', ') : ''}${r.before && r.after ? ' → ' : ''}${r.after ? 'after: ' + Object.values(r.after).join(', ') : ''}` : r.note || '—'}</span> },
  ]
  return (
    <Fade>
      <PageHeader title="Audit logs" description="Administrative actions recorded in this browser." />
      <Alert tone="warn" className="mb-5">Demo / local data. These logs are stored in your browser’s LocalStorage, can be edited or cleared by anyone with device access, and are <strong>not</strong> tamper-proof security records. Production audit trails must be written server-side.</Alert>
      <FilterBar>
        <SearchInput value={list.search} onChange={list.setSearch} placeholder="Search action, entity, actor…" />
        <FilterSelect label="Entity type" value={list.filters.type} onChange={(v) => list.setFilter('type', v)} options={types} allLabel="All entities" />
        <FilterSelect label="Actor" value={list.filters.actor} onChange={(v) => list.setFilter('actor', v)} options={actors} allLabel="All actors" />
      </FilterBar>
      <DataTable caption="Audit log entries" columns={columns} result={result} rowKey={(r) => r.id} sort={{ key: list.sortKey, dir: list.sortDir }} onSort={list.toggleSort} onPage={list.setPage} onPageSize={list.setPageSize} onRowClick={setOpen}
        empty={<div className="px-4 py-12 text-center"><p className="font-bold">{state.audit.length ? 'No entries match' : 'No admin actions yet'}</p><p className="text-sm text-ink-500">{state.audit.length ? 'Try different filters.' : 'Approve a restaurant, cancel an order or edit a coupon and it will be recorded here.'}</p></div>} />
      <Dialog open={Boolean(open)} title="Audit entry" onClose={() => setOpen(null)} size="lg">
        {open ? (
          <div className="space-y-4">
            <KeyValue items={[['When', formatDateTime(open.at)], ['Actor', `${open.actor.name} (${open.actor.role.replace(/_/g, ' ')})`], ['Action', open.action], ['Entity', `${open.entity.label} · ${open.entity.type} · ${open.entity.id}`]]} />
            <div className="grid gap-3 sm:grid-cols-2"><div><p className="mb-1 text-xs font-bold uppercase tracking-wider text-ink-400">Before</p><pre className="overflow-x-auto whitespace-pre-wrap rounded-xl bg-cream-100 p-3 text-xs">{pretty(open.before)}</pre></div><div><p className="mb-1 text-xs font-bold uppercase tracking-wider text-ink-400">After</p><pre className="overflow-x-auto whitespace-pre-wrap rounded-xl bg-cream-100 p-3 text-xs">{pretty(open.after)}</pre></div></div>
            {open.note ? <p className="text-sm text-ink-700"><strong>Note:</strong> {open.note}</p> : null}
          </div>
        ) : null}
      </Dialog>
    </Fade>
  )
}
