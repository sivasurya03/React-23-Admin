import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Download } from 'lucide-react'
import { useAdmin } from '../context/adminContextValue.js'
import { Alert, Badge, Card, ConfirmAction, DataTable, DemoBadge, Dialog, Fade, FilterBar, FilterSelect, KeyValue, PageHeader, SearchInput, StatCard, StatusBadge, Tabs } from '../components/ui.jsx'
import { useListState, useRun } from '../components/uiHooks.js'
import RangeFilter from '../components/RangeFilter.jsx'
import { resolveRange, filterByRange } from '../lib/analytics.js'
import { buildTransactions, eligibleForPayout, eligibleForSettlement, financeSummary, orderFinancials, rateFor, settlementAdjustments, taxSummary, DEFAULT_FINANCE } from '../lib/finance.js'
import { queryRows } from '../lib/table.js'
import { toCsv, downloadCsv } from '../lib/csv.js'
import { formatCurrency, formatDateTime } from '../../utils/format.js'
import usePageTitle from '../../hooks/usePageTitle.js'

const TABS = [['overview', 'Overview'], ['transactions', 'Transactions'], ['settlements', 'Restaurant settlements'], ['payouts', 'Partner payouts'], ['refunds', 'Refunds'], ['tax', 'Tax summary'], ['rules', 'Calculation rules']]

function Overview({ orders, ctx }) {
  const { state } = useAdmin()
  const s = useMemo(() => financeSummary(orders, ctx), [orders, ctx])
  const tx = useMemo(() => buildTransactions(orders), [orders])
  const count = (st) => tx.filter((t) => t.status === st).length
  const adj = settlementAdjustments(orders, [...state.settlements])
  return (
    <div className="space-y-6">
      {adj.length ? <Alert tone="warn">{adj.length} settled order{adj.length > 1 ? 's' : ''} later received an approved refund ({adj.map((o) => o.id).join(', ')}). Settlements are not rewritten automatically — adjust the next settlement manually.</Alert> : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Gross order value" value={formatCurrency(s.gmv)} hint={`${s.liveOrderCount} non-cancelled orders`} />
        <StatCard label="Approved refunds" value={formatCurrency(s.refunded)} tone="warn" hint={`${formatCurrency(s.pendingRefunds)} awaiting review`} />
        <StatCard label="Net revenue" value={formatCurrency(s.netRevenue)} tone="good" hint="gross − approved refunds" />
        <StatCard label="Platform net earnings" value={formatCurrency(s.platformNet)} tone="info" hint={`on ${s.recognisedCount} delivered orders`} />
        <StatCard label="Commission" value={formatCurrency(s.commission)} hint="delivered orders" />
        <StatCard label="Platform fees" value={formatCurrency(s.platformFee)} hint="delivered orders" />
        <StatCard label="GST collected" value={formatCurrency(s.tax)} hint="passed through, not revenue" />
        <StatCard label="Owed to restaurants" value={formatCurrency(s.restaurantPayable)} hint="before settlement" />
      </div>
      <Card title="Payment status (simulated)"><div className="flex flex-wrap gap-3 text-sm">{['success', 'pending', 'failed', 'refunded'].map((st) => <span key={st} className="flex items-center gap-2"><StatusBadge status={st} /><strong className="tabular-nums">{count(st)}</strong></span>)}</div><p className="mt-3 text-xs text-ink-400">Payment states are derived from each order (COD is pending until delivered; UPI/card are simulated and treated as captured). No payment gateway exists.</p></Card>
    </div>
  )
}

function Transactions({ orders }) {
  const tx = useMemo(() => buildTransactions(orders), [orders])
  const list = useListState({ filters: { status: 'all' }, sortKey: 'at', sortDir: 'desc' })
  const [open, setOpen] = useState(null)
  const result = queryRows(tx, { search: list.search, searchKeys: ['id', 'orderId', 'customer'], filters: list.filters, sortKey: list.sortKey, sortDir: list.sortDir, page: list.page, pageSize: list.pageSize })
  const columns = [
    { key: 'id', header: 'Transaction', render: (t) => <span className="font-bold">{t.id} {t.source === 'demo' ? <DemoBadge /> : null}</span> },
    { key: 'orderId', header: 'Order', render: (t) => t.orderId },
    { key: 'customer', header: 'Customer', render: (t) => t.customer },
    { key: 'at', header: 'Date', sortable: true, render: (t) => <span className="whitespace-nowrap text-ink-500">{formatDateTime(t.at)}</span> },
    { key: 'method', header: 'Method', render: (t) => t.method },
    { key: 'amount', header: 'Amount', sortable: true, render: (t) => <span className="font-bold tabular-nums">{formatCurrency(t.amount)}</span> },
    { key: 'status', header: 'Status', render: (t) => <StatusBadge status={t.status} /> },
  ]
  const exportCsv = () => downloadCsv('craveo-transactions.csv', toCsv(result.all, [{ label: 'Transaction', value: (t) => t.id }, { label: 'Order', value: (t) => t.orderId }, { label: 'Customer', value: (t) => t.customer }, { label: 'Date', value: (t) => t.at }, { label: 'Method', value: (t) => t.method }, { label: 'Amount (INR)', value: (t) => t.amount }, { label: 'Status', value: (t) => t.status }, { label: 'Source', value: (t) => t.source }]))
  return (
    <>
      <FilterBar><SearchInput value={list.search} onChange={list.setSearch} placeholder="Transaction, order or customer…" /><FilterSelect label="Payment status" value={list.filters.status} onChange={(v) => list.setFilter('status', v)} options={['success', 'pending', 'failed', 'refunded'].map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }))} allLabel="Any status" /><button type="button" className="btn btn-ghost btn-sm" onClick={exportCsv} disabled={!result.total}><Download className="h-4 w-4" aria-hidden="true" />Export CSV</button></FilterBar>
      <DataTable caption="Transactions" columns={columns} result={result} rowKey={(t) => t.id} sort={{ key: list.sortKey, dir: list.sortDir }} onSort={list.toggleSort} onPage={list.setPage} onPageSize={list.setPageSize} onRowClick={setOpen} />
      <Dialog open={Boolean(open)} title={open?.id ?? ''} onClose={() => setOpen(null)} size="sm">{open ? <div className="space-y-3"><KeyValue items={[['Order', open.orderId], ['Customer', open.customer], ['Date', formatDateTime(open.at)], ['Method', open.method], ['Amount', formatCurrency(open.amount)], ['Refunded', open.refundAmount ? formatCurrency(open.refundAmount) : '—'], ['Status', open.status]]} /><Alert tone="warn">Simulated transaction. No payment gateway is connected and no real money moved.</Alert></div> : null}</Dialog>
    </>
  )
}

function Ledger({ kind }) {
  const { orders, catalog, state, actions, can, financeCtx } = useAdmin()
  const run = useRun()
  const [confirm, setConfirm] = useState(null)
  const isSettle = kind === 'settlements'
  const records = isSettle ? state.settlements : state.payouts
  const canCreate = can('finance', 'create')
  const canApprove = can('finance', 'approve')
  const money = (o) => orderFinancials(o, { rate: rateFor(o, financeCtx), payoutPerDelivery: financeCtx.payoutPerDelivery })
  const pending = useMemo(() => {
    if (isSettle) {
      const ids = [...new Set(orders.map((o) => o.restaurant?.id))]
      return ids.map((id) => { const el = eligibleForSettlement(orders, id, state.settlements); const name = catalog.all.find((r) => r.id === id)?.name ?? orders.find((o) => o.restaurant?.id === id)?.restaurant?.name ?? id; return { id, name, count: el.length, amount: el.reduce((s, o) => s + money(o).restaurantPayable, 0) } }).filter((r) => r.count > 0)
    }
    const ids = [...new Set(orders.map((o) => o.partnerId).filter(Boolean))]
    return ids.map((id) => { const el = eligibleForPayout(orders, id, state.payouts); const name = state.partners.find((p) => p.id === id)?.name ?? orders.find((o) => o.partnerId === id)?.partner?.name ?? id; return { id, name, count: el.length, amount: el.length * financeCtx.payoutPerDelivery } }).filter((r) => r.count > 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, catalog, state.settlements, state.payouts, state.partners, financeCtx, isSettle])
  const create = (row) => run(isSettle ? actions.createSettlement(row.id) : actions.createPayout(row.id), `${isSettle ? 'Settlement' : 'Payout'} record created (simulated)`)
  return (
    <div className="space-y-6">
      <Alert tone="warn">Simulation only. Marking a record “paid” updates this demo ledger — no bank transfer happens. Only delivered orders without an approved refund are included, and an order can appear in one record only.</Alert>
      <Card title={isSettle ? 'Ready to settle' : 'Ready to pay out'} subtitle={isSettle ? 'Restaurant payable = food net − commission' : `Flat ${formatCurrency(financeCtx.payoutPerDelivery)} per delivery`} padded={false}>
        {pending.length === 0 ? <p className="px-5 pb-5 text-sm text-ink-500">Nothing is waiting — everything delivered has been included in a record.</p> : (
          <ul className="divide-y divide-ink-200/60 px-5 pb-2">{pending.map((r) => <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><span><span className="font-bold">{r.name}</span><span className="block text-xs text-ink-500">{r.count} delivered order{r.count > 1 ? 's' : ''}</span></span><span className="flex items-center gap-3"><span className="font-bold tabular-nums">{formatCurrency(r.amount)}</span>{canCreate ? <button type="button" className="btn btn-dark btn-sm" onClick={() => create(r)}>Create record</button> : null}</span></li>)}</ul>
        )}
      </Card>
      <Card title="Records" padded={false}>
        {records.length === 0 ? <p className="px-5 pb-5 text-sm text-ink-500">No records yet.</p> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[34rem] text-left text-sm"><thead className="bg-cream-100 text-xs uppercase tracking-wider text-ink-500"><tr><th className="px-4 py-3">Record</th><th className="px-4 py-3">{isSettle ? 'Restaurant' : 'Partner'}</th><th className="px-4 py-3">Orders</th>{isSettle ? <th className="px-4 py-3">Commission</th> : null}<th className="px-4 py-3">{isSettle ? 'Net payable' : 'Amount'}</th><th className="px-4 py-3">Status</th><th className="px-4 py-3" /></tr></thead>
            <tbody className="divide-y divide-ink-200/60">{records.map((r) => <tr key={r.id}><td className="px-4 py-3 font-bold">{r.id}<span className="block text-xs font-normal text-ink-400">{formatDateTime(r.createdAt)}</span></td><td className="px-4 py-3">{isSettle ? r.restaurantName : r.partnerName}</td><td className="px-4 py-3">{r.orderCount}</td>{isSettle ? <td className="px-4 py-3 tabular-nums">{formatCurrency(r.commission)}</td> : null}<td className="px-4 py-3 font-bold tabular-nums">{formatCurrency(isSettle ? r.net : r.amount)}</td><td className="px-4 py-3"><StatusBadge status={r.status} label={r.status === 'paid' ? 'Paid (simulated)' : 'Pending'} /></td><td className="px-4 py-3 text-right">{r.status === 'pending' && canApprove ? <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirm(r)}>Mark paid</button> : null}</td></tr>)}</tbody></table></div>
        )}
      </Card>
      <ConfirmAction open={Boolean(confirm)} title="Mark as paid (simulated)?" message={confirm ? `${confirm.id} will be marked paid in the demo ledger. No money is transferred.` : ''} confirmLabel="Mark paid" onCancel={() => setConfirm(null)} onConfirm={() => { const r = isSettle ? actions.markSettlementPaid(confirm.id) : actions.markPayoutPaid(confirm.id); if (r.ok) { setConfirm(null); run(r, 'Marked paid (simulated)') } return r }} />
    </div>
  )
}

function Refunds({ orders }) {
  const rows = orders.filter((o) => o.refund)
  const total = (st) => rows.filter((o) => o.refund.status === st).reduce((s, o) => s + o.refund.amount, 0)
  const list = useListState({ filters: { status: 'all' } })
  const result = queryRows(rows, { search: list.search, searchKeys: ['id', 'customer.name', 'refund.id'], filters: list.filters, filterFns: { status: (o, v) => o.refund.status === v }, page: list.page, pageSize: list.pageSize })
  const columns = [
    { key: 'r', header: 'Refund', render: (o) => <span className="font-bold">{o.refund.id} {o.source === 'demo' ? <DemoBadge /> : null}</span> },
    { key: 'o', header: 'Order', render: (o) => o.id },
    { key: 'c', header: 'Customer', render: (o) => o.customer.name },
    { key: 'a', header: 'Amount', render: (o) => <span className="font-bold tabular-nums">{formatCurrency(o.refund.amount)}</span> },
    { key: 's', header: 'Status', render: (o) => <StatusBadge status={o.refund.status} /> },
    { key: 'd', header: 'Requested', render: (o) => <span className="whitespace-nowrap text-ink-500">{formatDateTime(o.refund.requestedAt)}</span> },
  ]
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3"><StatCard label="Awaiting review" value={formatCurrency(total('requested'))} tone="warn" /><StatCard label="Approved (simulated)" value={formatCurrency(total('approved'))} tone="good" /><StatCard label="Rejected" value={formatCurrency(total('rejected'))} tone="info" /></div>
      <FilterBar><SearchInput value={list.search} onChange={list.setSearch} placeholder="Refund, order or customer…" /><FilterSelect label="Status" value={list.filters.status} onChange={(v) => list.setFilter('status', v)} options={['requested', 'approved', 'rejected'].map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }))} allLabel="Any status" /></FilterBar>
      <DataTable caption="Refund records" columns={columns} result={result} rowKey={(o) => o.id} onPage={list.setPage} onPageSize={list.setPageSize} />
      <p className="text-xs text-ink-400">Review refunds from Orders → Refund requests. Approved refunds are simulated records only.</p>
    </div>
  )
}

function Tax({ orders }) {
  const rows = useMemo(() => taxSummary(orders), [orders])
  const { settings } = useAdmin()
  return (
    <div className="space-y-4">
      <Alert tone="info">GST shown is the amount saved on each order at the time it was placed (currently {settings.gstPercent}% for new orders). Cancelled and fully refunded orders are excluded. GST on platform fees and input-tax credits are not modelled.</Alert>
      <Card padded={false}><div className="overflow-x-auto"><table className="w-full min-w-[30rem] text-left text-sm"><thead className="bg-cream-100 text-xs uppercase tracking-wider text-ink-500"><tr><th className="px-4 py-3">Month</th><th className="px-4 py-3">Orders</th><th className="px-4 py-3">Taxable food value</th><th className="px-4 py-3">GST collected</th><th className="px-4 py-3">Platform fees</th></tr></thead><tbody className="divide-y divide-ink-200/60">{rows.map((r) => <tr key={r.month}><td className="px-4 py-3 font-bold">{r.month}</td><td className="px-4 py-3">{r.orders}</td><td className="px-4 py-3 tabular-nums">{formatCurrency(r.taxableValue)}</td><td className="px-4 py-3 font-bold tabular-nums">{formatCurrency(r.gst)}</td><td className="px-4 py-3 tabular-nums">{formatCurrency(r.platformFees)}</td></tr>)}{rows.length === 0 ? <tr><td colSpan={5} className="px-4 py-10 text-center text-ink-500">No orders in this period.</td></tr> : null}</tbody></table></div></Card>
    </div>
  )
}

function Rules() {
  const { settings } = useAdmin()
  const rows = [
    ['Food net', 'subtotal − discount'], ['Commission', `round(food net × rate ÷ 100). Rate = the restaurant override or the platform default (${settings.defaultCommission}%), frozen per order the first time the admin panel sees it.`],
    ['Restaurant payable', 'food net − commission'], ['GST collected', 'taken from the order as saved (currently ' + settings.gstPercent + '% of food net for new orders); shown separately, not revenue'],
    ['Platform fee', `flat fee on the order (currently ${formatCurrency(settings.platformFee)} for new orders)`], ['Partner payout', `flat ${formatCurrency(settings.partnerPayoutPerDelivery)} per delivered order`],
    ['Delivery margin', 'delivery fee collected − partner payout (can be negative)'], ['Platform net', 'commission + platform fee + delivery margin'],
    ['Gross order value', 'sum of totals of non-cancelled orders'], ['Net revenue', 'gross order value − approved refunds'],
    ['Settlements & payouts', 'only delivered orders with no approved refund; each order is included in at most one record'], ['Identity check', 'restaurant payable + commission + delivery fee + platform fee + GST = order total'],
  ]
  return <Card title="How every figure is calculated"><dl className="divide-y divide-ink-200/60">{rows.map(([k, v]) => <div key={k} className="grid gap-1 py-3 text-sm sm:grid-cols-[12rem_1fr]"><dt className="font-bold">{k}</dt><dd className="text-ink-700">{v}</dd></div>)}</dl><p className="mt-4 text-xs text-ink-400">Default commission fallback if settings are missing: {DEFAULT_FINANCE.defaultCommission}%. All amounts are in INR and use whole rupees. Everything here is a simulation — there is no payment provider.</p></Card>
}

export default function Finance() {
  usePageTitle('Finance — Craveo Admin')
  const { orders, financeCtx } = useAdmin()
  const [params, setParams] = useSearchParams()
  const tab = TABS.some(([id]) => id === params.get('tab')) ? params.get('tab') : 'overview'
  const [range, setRange] = useState({ preset: '30d', from: '', to: '' })
  const [source, setSource] = useState('all')
  const resolved = useMemo(() => resolveRange(range), [range])
  const scoped = useMemo(() => filterByRange(orders.filter((o) => source === 'all' || o.source === source), resolved), [orders, source, resolved])
  const usesRange = ['overview', 'transactions', 'refunds', 'tax'].includes(tab)
  return (
    <Fade>
      <PageHeader title="Payments & finance" description="Simulated payments, settlements and payouts calculated from order data. No real money is moved." />
      <Tabs tabs={TABS.map(([id, label]) => ({ id, label }))} value={tab} onChange={(id) => { const n = new URLSearchParams(params); if (id === 'overview') n.delete('tab'); else n.set('tab', id); setParams(n, { replace: true }) }} label="Finance views" />
      {usesRange ? (
        <div className="mb-5 flex flex-wrap items-end gap-3"><RangeFilter value={range} onChange={setRange} error={resolved.error} /><label className="text-xs font-bold uppercase tracking-wider text-ink-400">Data<select className="input mt-1 !min-h-10 !w-auto" value={source} onChange={(e) => setSource(e.target.value)} aria-label="Data source"><option value="all">Live + demo</option><option value="live">Live only</option><option value="demo">Demo only</option></select></label></div>
      ) : null}
      {tab === 'overview' ? <Overview orders={scoped} ctx={financeCtx} /> : null}
      {tab === 'transactions' ? <Transactions orders={scoped} /> : null}
      {tab === 'settlements' ? <Ledger kind="settlements" /> : null}
      {tab === 'payouts' ? <Ledger kind="payouts" /> : null}
      {tab === 'refunds' ? <Refunds orders={scoped} /> : null}
      {tab === 'tax' ? <Tax orders={scoped} /> : null}
      {tab === 'rules' ? <Rules /> : null}
      {tab === 'overview' || tab === 'transactions' ? <Badge className="mt-4">Includes demo data unless filtered</Badge> : null}
    </Fade>
  )
}
