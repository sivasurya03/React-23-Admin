import { useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { useAdmin } from '../context/adminContextValue.js'
import { Alert, Card, DataTable, Fade, PageHeader, StatCard, Tabs } from '../components/ui.jsx'
import { useListState } from '../components/uiHooks.js'
import { BarChart } from '../components/charts.jsx'
import RangeFilter from '../components/RangeFilter.jsx'
import { bucketForRange, filterByRange, resolveRange, restaurantStats, seriesByBucket, summarize } from '../lib/analytics.js'
import { financeSummary, orderFinancials, rateFor } from '../lib/finance.js'
import { partnerMetrics } from '../lib/partners.js'
import { statusLabel, paymentStatusOf } from '../lib/orders.js'
import { queryRows } from '../lib/table.js'
import { toCsv, downloadCsv } from '../lib/csv.js'
import { formatCurrency, formatDateTime } from '../../utils/format.js'
import usePageTitle from '../../hooks/usePageTitle.js'

const TABS = [['sales', 'Sales'], ['orders', 'Orders'], ['restaurants', 'Restaurant performance'], ['delivery', 'Delivery performance'], ['commission', 'Commission & refunds']]

function Report({ name, rows, columns, csvColumns, summary, chart }) {
  const list = useListState({ pageSize: 10 })
  const result = queryRows(rows, { page: list.page, pageSize: list.pageSize })
  return (
    <div className="space-y-5">
      {summary}
      {chart}
      <div className="flex justify-end"><button type="button" className="btn btn-ghost btn-sm" disabled={!rows.length} onClick={() => downloadCsv(`craveo-${name}.csv`, toCsv(rows, csvColumns ?? columns.map((c) => ({ label: c.header, value: c.csv ?? ((r) => r[c.key]) }))))}><Download className="h-4 w-4" aria-hidden="true" />Export CSV ({rows.length} rows)</button></div>
      <DataTable caption={`${name} report`} columns={columns} result={result} rowKey={(r) => r.id ?? r.key ?? r.name} onPage={list.setPage} onPageSize={list.setPageSize} empty={<div className="px-4 py-12 text-center"><p className="font-bold">No data for this period</p></div>} />
    </div>
  )
}

export default function Reports() {
  usePageTitle('Reports — Craveo Admin')
  const { orders, state, financeCtx, catalog, settings } = useAdmin()
  const [tab, setTab] = useState('sales')
  const [range, setRange] = useState({ preset: '30d', from: '', to: '' })
  const [source, setSource] = useState('all')
  const resolved = useMemo(() => resolveRange(range), [range])
  const scoped = useMemo(() => filterByRange(orders.filter((o) => source === 'all' || o.source === source), resolved), [orders, source, resolved])
  const s = useMemo(() => summarize(scoped), [scoped])
  const fin = useMemo(() => financeSummary(scoped, financeCtx), [scoped, financeCtx])
  const sales = useMemo(() => seriesByBucket(scoped, bucketForRange(resolved), resolved.error ? null : resolved).map((r) => ({ ...r, id: r.key })), [scoped, resolved])
  const fmt = formatCurrency

  const rest = useMemo(() => restaurantStats(scoped).sort((a, b) => b.revenue - a.revenue).map((r) => ({ ...r, id: r.id, commission: catalog.all.find((x) => x.id === r.id)?.admin.commissionRate ?? settings.defaultCommission })), [scoped, catalog, settings.defaultCommission])
  const delivery = useMemo(() => state.partners.map((p) => ({ id: p.id, name: p.name, ...partnerMetrics(p.id, scoped, settings.partnerPayoutPerDelivery) })).filter((p) => p.assigned > 0 || p.completed > 0), [state.partners, scoped, settings.partnerPayoutPerDelivery])
  const commissionRows = useMemo(() => scoped.filter((o) => !o.cancelled && o.statusIndex >= 4).map((o) => { const f = orderFinancials(o, { rate: rateFor(o, financeCtx), payoutPerDelivery: financeCtx.payoutPerDelivery }); return { id: o.id, at: o.createdAt, restaurant: o.restaurant.name, ...f, refund: o.refund?.status === 'approved' ? o.refund.amount : 0 } }), [scoped, financeCtx])

  const stat = (items) => <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{items.map(([l, v, h]) => <StatCard key={l} label={l} value={v} hint={h} />)}</div>
  return (
    <Fade>
      <PageHeader title="Reports" description="Built from real order data in the selected period. CSV exports contain exactly the rows shown." />
      <div className="mb-5 flex flex-wrap items-end gap-3"><RangeFilter value={range} onChange={setRange} error={resolved.error} /><label className="text-xs font-bold uppercase tracking-wider text-ink-400">Data<select className="input mt-1 !min-h-10 !w-auto" value={source} onChange={(e) => setSource(e.target.value)} aria-label="Data source"><option value="all">Live + demo</option><option value="live">Live only</option><option value="demo">Demo only</option></select></label></div>
      <Tabs tabs={TABS.map(([id, label]) => ({ id, label }))} value={tab} onChange={setTab} label="Reports" />
      {resolved.error ? <Alert tone="warn" className="mb-4">{resolved.error} Showing all dates until fixed.</Alert> : null}
      {tab === 'sales' ? <Report name="sales" rows={sales} summary={stat([['Orders', s.orders, `${s.delivered} delivered`], ['Gross order value', fmt(s.gmv), 'non-cancelled'], ['Net revenue', fmt(s.revenue), 'after refunds'], ['Avg. order', fmt(s.avgOrderValue)]])} chart={<Card title="Revenue per period"><BarChart data={sales.map((r) => ({ label: r.label, value: r.revenue }))} format={fmt} label="Revenue per period" /></Card>}
        columns={[{ key: 'label', header: 'Period' }, { key: 'orders', header: 'Orders' }, { key: 'revenue', header: 'Net revenue', render: (r) => <span className="font-bold tabular-nums">{fmt(r.revenue)}</span>, csv: (r) => r.revenue }]} /> : null}
      {tab === 'orders' ? <Report name="orders" rows={scoped} summary={stat([['Orders', s.orders], ['Delivered', s.delivered], ['Cancelled', s.cancelled, `${Math.round(s.cancelRate * 100)}% rate`], ['Open refund requests', s.openRefunds]])}
        columns={[{ key: 'id', header: 'Order' }, { key: 'at', header: 'Placed', render: (o) => formatDateTime(o.createdAt), csv: (o) => o.createdAt }, { key: 'restaurant', header: 'Restaurant', render: (o) => o.restaurant.name, csv: (o) => o.restaurant.name }, { key: 'customer', header: 'Customer', render: (o) => o.customer.name, csv: (o) => o.customer.name }, { key: 'status', header: 'Status', render: (o) => statusLabel(o), csv: (o) => statusLabel(o) }, { key: 'payment', header: 'Payment', render: (o) => paymentStatusOf(o), csv: (o) => paymentStatusOf(o) }, { key: 'total', header: 'Total', render: (o) => fmt(o.totals.total), csv: (o) => o.totals.total }, { key: 'source', header: 'Source', render: (o) => o.source, csv: (o) => o.source }]} /> : null}
      {tab === 'restaurants' ? <Report name="restaurant-performance" rows={rest} summary={stat([['Restaurants with orders', rest.length], ['Top restaurant', rest[0]?.name ?? '—', rest[0] ? fmt(rest[0].revenue) : ''], ['Total net revenue', fmt(s.revenue)], ['Cancel rate', `${Math.round(s.cancelRate * 100)}%`]])}
        columns={[{ key: 'name', header: 'Restaurant' }, { key: 'orders', header: 'Orders' }, { key: 'delivered', header: 'Delivered' }, { key: 'cancelled', header: 'Cancelled' }, { key: 'cancelRate', header: 'Cancel rate', render: (r) => `${Math.round(r.cancelRate * 100)}%`, csv: (r) => `${Math.round(r.cancelRate * 100)}%` }, { key: 'revenue', header: 'Net revenue', render: (r) => <span className="font-bold tabular-nums">{fmt(r.revenue)}</span>, csv: (r) => r.revenue }, { key: 'commission', header: 'Commission %' }]} /> : null}
      {tab === 'delivery' ? <Report name="delivery-performance" rows={delivery} summary={stat([['Active partners', delivery.length], ['Deliveries completed', delivery.reduce((a, d) => a + d.completed, 0)], ['Cancelled assigned orders', delivery.reduce((a, d) => a + d.cancelled, 0)], ['Simulated partner earnings', fmt(delivery.reduce((a, d) => a + d.earnings, 0))]])}
        columns={[{ key: 'name', header: 'Partner' }, { key: 'assigned', header: 'Assigned' }, { key: 'completed', header: 'Completed' }, { key: 'cancelled', header: 'Cancelled' }, { key: 'rate', header: 'Cancel rate', render: (d) => `${Math.round(d.cancellationRate * 100)}%`, csv: (d) => `${Math.round(d.cancellationRate * 100)}%` }, { key: 'avg', header: 'Avg. delivery (min)', render: (d) => d.avgDeliveryMinutes ?? '—', csv: (d) => d.avgDeliveryMinutes ?? '' }, { key: 'earnings', header: 'Earnings', render: (d) => fmt(d.earnings), csv: (d) => d.earnings }]} /> : null}
      {tab === 'commission' ? <Report name="commission-refunds" rows={commissionRows} summary={stat([['Commission earned', fmt(fin.commission), 'delivered orders'], ['Platform net', fmt(fin.platformNet)], ['Approved refunds', fmt(fin.refunded)], ['Open refund requests', fmt(fin.pendingRefunds)]])}
        columns={[{ key: 'id', header: 'Order' }, { key: 'restaurant', header: 'Restaurant' }, { key: 'foodNet', header: 'Food net', render: (r) => fmt(r.foodNet), csv: (r) => r.foodNet }, { key: 'rate', header: 'Rate', render: (r) => `${r.rate}%`, csv: (r) => r.rate }, { key: 'commission', header: 'Commission', render: (r) => <span className="font-bold tabular-nums">{fmt(r.commission)}</span>, csv: (r) => r.commission }, { key: 'restaurantPayable', header: 'Restaurant payable', render: (r) => fmt(r.restaurantPayable), csv: (r) => r.restaurantPayable }, { key: 'refund', header: 'Refunded', render: (r) => (r.refund ? fmt(r.refund) : '—'), csv: (r) => r.refund }]} /> : null}
    </Fade>
  )
}
