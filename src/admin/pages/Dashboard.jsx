import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bike, ClipboardList, IndianRupee, Store, Users, Receipt } from 'lucide-react'
import { useAdmin } from '../context/adminContextValue.js'
import { Alert, Badge, Card, DemoBadge, Fade, PageHeader, StatCard, StatusBadge } from '../components/ui.jsx'
import { BarChart, Donut, LineChart } from '../components/charts.jsx'
import RangeFilter from '../components/RangeFilter.jsx'
import { bucketForRange, filterByRange, growth, hourLabel, peakHours, resolveRange, seriesByBucket, statusDistribution, summarize, topItems, topRestaurants } from '../lib/analytics.js'
import { statusLabel } from '../lib/orders.js'
import { formatCurrency, formatDateTime } from '../../utils/format.js'
import usePageTitle from '../../hooks/usePageTitle.js'

export default function Dashboard() {
  usePageTitle('Dashboard — Craveo Admin')
  const { orders, customers, catalog, state, admin } = useAdmin()
  const [range, setRange] = useState({ preset: '30d', from: '', to: '' })
  const [source, setSource] = useState('all')
  const resolved = useMemo(() => resolveRange(range), [range])

  const scoped = useMemo(() => orders.filter((o) => source === 'all' || o.source === source), [orders, source])
  const inRange = useMemo(() => filterByRange(scoped, resolved), [scoped, resolved])
  const stats = useMemo(() => summarize(inRange), [inRange])
  const trend = useMemo(() => growth(scoped, resolved), [scoped, resolved])
  const series = useMemo(() => seriesByBucket(inRange, bucketForRange(resolved), resolved.error ? null : resolved), [inRange, resolved])
  const hours = useMemo(() => peakHours(inRange), [inRange])
  const peak = hours.reduce((m, h) => (h.orders > m.orders ? h : m), hours[0])
  const live = orders.filter((o) => o.source === 'live').length
  const demo = orders.length - live
  const activeCustomers = useMemo(() => new Set(inRange.map((o) => o.customer?.email?.toLowerCase())).size, [inRange])
  const pendingApps = catalog.all.filter((r) => r.admin.status === 'pending').length
  const pendingPartners = state.partners.filter((p) => p.verification === 'pending').length
  const approved = catalog.all.filter((r) => r.admin.status === 'approved')

  return (
    <Fade>
      <PageHeader title={`Welcome back, ${admin.name.split(' ')[0]}`} description="Metrics are calculated from live customer orders and clearly labelled demo orders."
        actions={<div className="flex flex-wrap items-end gap-2"><label className="text-xs font-bold uppercase tracking-wider text-ink-400">Data<select className="input mt-1 !min-h-10 !w-auto" value={source} onChange={(e) => setSource(e.target.value)} aria-label="Data source"><option value="all">Live + demo</option><option value="live">Live orders only</option><option value="demo">Demo orders only</option></select></label><RangeFilter value={range} onChange={setRange} error={resolved.error} /></div>} />
      <Alert tone="info" className="mb-6">Showing {source === 'demo' ? `${demo} demo` : source === 'live' ? `${live} live` : `${live} live + ${demo} demo`} orders in total. Demo orders are sample data, not real business activity.</Alert>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total orders" value={stats.orders} icon={ClipboardList} delta={trend?.orders.pct ?? null} hint={trend ? 'vs previous period' : `${stats.delivered} delivered`} />
        <StatCard label="Net revenue" value={formatCurrency(stats.revenue)} icon={IndianRupee} tone="good" delta={trend?.revenue.pct ?? null} hint={trend ? 'vs previous period' : 'after cancellations & refunds'} />
        <StatCard label="Avg. order value" value={formatCurrency(stats.avgOrderValue)} icon={Receipt} tone="info" hint={`${Math.round(stats.cancelRate * 100)}% cancelled`} />
        <StatCard label="Active customers" value={activeCustomers} icon={Users} tone="warn" hint={`${customers.length} customers on record`} />
        <StatCard label="Restaurants" value={`${approved.filter((r) => r.admin.active).length} active`} icon={Store} hint={`${catalog.all.length} total · ${pendingApps} awaiting approval`} />
        <StatCard label="Delivery partners" value={`${state.partners.filter((p) => p.online).length} online`} icon={Bike} tone="info" hint={`${state.partners.filter((p) => p.verification === 'approved').length} verified · ${pendingPartners} pending`} />
        <StatCard label="Open refund requests" value={stats.openRefunds} tone="warn" icon={Receipt} hint={<Link className="font-bold text-brand-600 hover:underline" to="/admin/orders?tab=refunds">Review</Link>} />
        <StatCard label="Peak hour" value={peak?.orders ? hourLabel(peak.hour) : '—'} icon={ClipboardList} tone="good" hint={peak?.orders ? `${peak.orders} orders placed` : 'No orders in range'} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card title="Sales trend" subtitle="Net revenue per period" className="xl:col-span-2"><LineChart data={series.map((s) => ({ label: s.label, value: s.revenue }))} format={formatCurrency} label="Net revenue trend" /></Card>
        <Card title="Order status" subtitle="Orders in the selected period"><Donut data={statusDistribution(inRange)} label="Order status distribution" /></Card>
        <Card title="Peak hours" subtitle="Orders by hour of day (from order timestamps)" className="xl:col-span-2"><BarChart data={hours.map((h) => ({ label: hourLabel(h.hour), value: h.orders }))} format={(v) => `${v} orders`} highlight={peak?.orders ? peak.hour : null} label="Orders by hour" /></Card>
        <Card title="Top-selling foods">
          <ol className="space-y-2 text-sm">{topItems(inRange, 5).map((i, n) => <li key={i.key} className="flex items-center justify-between gap-3"><span className="min-w-0"><span className="mr-2 font-extrabold text-ink-400">{n + 1}</span><span className="font-semibold">{i.name}</span><span className="block truncate pl-5 text-xs text-ink-500">{i.restaurant}</span></span><span className="shrink-0 font-bold tabular-nums">{i.quantity} sold</span></li>)}{inRange.length === 0 ? <li className="text-ink-500">No orders in this period.</li> : null}</ol>
        </Card>
        <Card title="Top restaurants" subtitle="By net revenue" className="xl:col-span-2">
          <ol className="grid gap-2 text-sm sm:grid-cols-2">{topRestaurants(inRange, 6).map((r, n) => <li key={r.id} className="flex items-center justify-between gap-3 rounded-xl bg-cream-100 px-3 py-2"><span className="min-w-0 truncate"><span className="mr-2 font-extrabold text-ink-400">{n + 1}</span>{r.name}</span><span className="shrink-0 font-bold tabular-nums">{formatCurrency(r.revenue)}</span></li>)}{inRange.length === 0 ? <li className="text-ink-500">No orders in this period.</li> : null}</ol>
        </Card>
        <Card title="Recent activity" actions={<Link to="/admin/audit-logs" className="text-xs font-bold text-brand-600 hover:underline">All logs</Link>}>
          <ul className="space-y-2.5 text-sm">{state.audit.slice(0, 5).map((a) => <li key={a.id}><p className="font-semibold">{a.actor.name} · {a.action}</p><p className="truncate text-xs text-ink-500">{a.entity.label} · {formatDateTime(a.at)}</p></li>)}{state.audit.length === 0 ? <li className="text-ink-500">No admin actions recorded yet.</li> : null}</ul>
        </Card>
      </div>

      <Card className="mt-6" title="Recent orders" actions={<Link to="/admin/orders" className="text-sm font-bold text-brand-600 hover:underline">View all</Link>} padded={false}>
        <div className="overflow-x-auto"><table className="w-full min-w-[34rem] text-left text-sm"><thead className="bg-cream-100 text-xs uppercase tracking-wider text-ink-500"><tr><th className="px-4 py-3">Order</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Restaurant</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Status</th></tr></thead>
          <tbody className="divide-y divide-ink-200/60">{scoped.slice(0, 6).map((o) => <tr key={o.id}><td className="px-4 py-3 font-bold"><Link className="hover:text-brand-600" to={`/admin/orders?q=${o.id}`}>{o.id}</Link> {o.source === 'demo' ? <DemoBadge /> : <Badge tone="good">Live</Badge>}</td><td className="px-4 py-3">{o.customer?.name}</td><td className="px-4 py-3">{o.restaurant?.name}</td><td className="px-4 py-3 tabular-nums">{formatCurrency(o.totals.total)}</td><td className="px-4 py-3"><StatusBadge status={o.cancelled ? 'cancelled' : o.statusIndex >= 4 ? 'delivered' : 'confirmed'} label={statusLabel(o)} /></td></tr>)}</tbody></table></div>
      </Card>
    </Fade>
  )
}
