import { Component, Suspense, useCallback, useMemo, useRef, useState } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, Bike, ChartNoAxesCombined, ChevronDown, ClipboardList, FileClock, Gauge, Headset, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Settings, ShieldCheck, Store, Tags, UserRound, Users, UtensilsCrossed, Wallet, X } from 'lucide-react'
import { useAdmin } from '../context/adminContextValue.js'
import useClickOutside from '../../hooks/useClickOutside.js'
import useModalBehavior from '../../hooks/useModalBehavior.js'
import { readStorage, writeStorage } from '../../utils/storage.js'
import { formatDateTime } from '../../utils/format.js'
import { moduleForPath } from '../lib/rbac.js'
import { Alert, Skeleton } from './ui.jsx'
import Unauthorized from '../pages/Unauthorized.jsx'

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: Gauge, module: 'dashboard', end: true },
  { to: '/admin/orders', label: 'Orders', icon: ClipboardList, module: 'orders' },
  { to: '/admin/restaurants', label: 'Restaurants', icon: Store, module: 'restaurants' },
  { to: '/admin/menu', label: 'Menu', icon: UtensilsCrossed, module: 'menu' },
  { to: '/admin/delivery-partners', label: 'Delivery partners', icon: Bike, module: 'partners' },
  { to: '/admin/customers', label: 'Customers', icon: Users, module: 'customers' },
  { to: '/admin/finance', label: 'Payments & finance', icon: Wallet, module: 'finance' },
  { to: '/admin/promotions', label: 'Offers & promotions', icon: Tags, module: 'promotions' },
  { to: '/admin/support', label: 'Support', icon: Headset, module: 'support' },
  { to: '/admin/reports', label: 'Reports', icon: ChartNoAxesCombined, module: 'reports' },
  { to: '/admin/settings', label: 'Settings & zones', icon: Settings, module: 'settings' },
  { to: '/admin/roles', label: 'Roles & admins', icon: ShieldCheck, module: 'roles' },
  { to: '/admin/audit-logs', label: 'Audit logs', icon: FileClock, module: 'audit' },
]

const CRUMBS = { orders: 'Orders', restaurants: 'Restaurants', menu: 'Menu', 'delivery-partners': 'Delivery partners', customers: 'Customers', finance: 'Payments & finance', promotions: 'Offers & promotions', support: 'Support', reports: 'Reports', settings: 'Settings & zones', roles: 'Roles & admins', 'audit-logs': 'Audit logs', notifications: 'Notifications' }

class PageBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidUpdate(prev) { if (prev.resetKey !== this.props.resetKey && this.state.failed) this.setState({ failed: false }) }
  render() {
    if (this.state.failed) return <Alert tone="bad">This page hit an unexpected error. Your data is safe — try another page or reload.</Alert>
    return this.props.children
  }
}

// `scroll` = this nav is its own scroll container (mobile drawer). On desktop the surrounding
// wrapper scrolls instead, so the Collapse button scrolls together with the menu items.
function NavItems({ items, collapsed, onNavigate, scroll = true }) {
  return (
    <nav aria-label="Admin sections" className={`space-y-1 px-3 py-4 ${scroll ? 'sidebar-scroll flex-1 overflow-y-auto' : 'flex-none'}`}>
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} onClick={onNavigate} title={collapsed ? label : undefined}
          className={({ isActive }) => `flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold transition-colors ${isActive ? 'bg-brand-500 text-white shadow-soft' : 'text-white/75 hover:bg-white/10 hover:text-white'} ${collapsed ? 'justify-center' : ''}`}>
          <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span className={collapsed ? 'sr-only' : 'truncate'}>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

function Brand({ collapsed, name }) {
  return (
    <Link to="/admin" className="flex h-16 shrink-0 items-center gap-2.5 border-b border-white/10 px-4 text-white" aria-label={`${name} admin home`}>
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-amber-accent font-display text-lg font-bold" aria-hidden="true">{name.charAt(0)}</span>
      {collapsed ? null : <span className="min-w-0"><span className="block truncate font-display text-lg font-bold leading-none">{name}</span><span className="text-[10px] font-bold uppercase tracking-widest text-white/50">Admin panel</span></span>}
    </Link>
  )
}

function Drawer({ items, onClose, name }) {
  const ref = useModalBehavior(true, onClose)
  return (
    <div className="fixed inset-0 z-[60] lg:hidden">
      <motion.div className="absolute inset-0 bg-ink-900/55" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} aria-hidden="true" />
      <motion.aside ref={ref} role="dialog" aria-modal="true" aria-label="Admin navigation" className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-ink-900" initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', stiffness: 380, damping: 36 }}>
        <div className="flex items-center justify-between pr-2"><Brand name={name} /><button type="button" onClick={onClose} className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white/80 hover:bg-white/10" aria-label="Close menu"><X className="h-5 w-5" aria-hidden="true" /></button></div>
        <NavItems items={items} onNavigate={onClose} />
      </motion.aside>
    </div>
  )
}

function Notifications() {
  const { state, actions } = useAdmin()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()
  const close = useCallback(() => setOpen(false), [])
  useClickOutside(ref, close, open)
  const unread = state.notifications.filter((n) => !n.read).length
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-ink-700 hover:bg-cream-200" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} aria-expanded={open} aria-haspopup="true">
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unread ? <span className="absolute right-1 top-1 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-extrabold text-white">{unread > 9 ? '9+' : unread}</span> : null}
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-lift">
            <div className="flex items-center justify-between border-b border-ink-200/70 px-4 py-3">
              <p className="font-extrabold">Notifications</p>
              <button type="button" className="text-xs font-bold text-brand-600 hover:underline disabled:text-ink-400" disabled={!unread} onClick={() => actions.markAllNotificationsRead()}>Mark all as read</button>
            </div>
            <ul className="max-h-80 divide-y divide-ink-200/60 overflow-y-auto">
              {state.notifications.length === 0 ? <li className="px-4 py-8 text-center text-sm text-ink-500">You’re all caught up.</li> : state.notifications.slice(0, 8).map((n) => (
                <li key={n.id}>
                  <button type="button" className={`w-full px-4 py-3 text-left hover:bg-cream-50 ${n.read ? '' : 'bg-brand-50/50'}`} onClick={() => { actions.markNotificationRead(n.id); setOpen(false); if (n.link) navigate(n.link) }}>
                    <p className="flex items-center gap-2 text-sm font-bold">{n.read ? null : <span className="h-2 w-2 rounded-full bg-brand-500" aria-label="Unread" />}{n.title}</p>
                    <p className="text-sm text-ink-500">{n.body}</p>
                    <p className="mt-0.5 text-xs text-ink-400">{formatDateTime(n.at)}</p>
                  </button>
                </li>
              ))}
            </ul>
            <Link to="/admin/notifications" onClick={close} className="block border-t border-ink-200/70 px-4 py-2.5 text-center text-sm font-bold text-brand-600 hover:bg-cream-50">View all</Link>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

function ProfileMenu() {
  const { admin, logout } = useAdmin()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()
  const close = useCallback(() => setOpen(false), [])
  useClickOutside(ref, close, open)
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-cream-200" aria-expanded={open} aria-haspopup="true" aria-label="Profile menu">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-sm font-extrabold text-white" aria-hidden="true">{admin.name.charAt(0)}</span>
        <ChevronDown className="hidden h-4 w-4 text-ink-500 sm:block" aria-hidden="true" />
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-lift">
            <div className="border-b border-ink-200/70 px-4 py-3"><p className="truncate font-bold">{admin.name}</p><p className="truncate text-xs text-ink-500">{admin.email}</p><p className="mt-1 text-xs font-bold uppercase tracking-wider text-brand-600">{admin.role.replace(/_/g, ' ')}</p></div>
            <Link to="/" className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold hover:bg-cream-50" onClick={close}><UserRound className="h-4 w-4" aria-hidden="true" />View customer app</Link>
            <button type="button" className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold text-red-700 hover:bg-red-50" onClick={() => { close(); logout(); navigate('/admin/login', { replace: true }) }}><LogOut className="h-4 w-4" aria-hidden="true" />Log out</button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

function GlobalSearch() {
  const [q, setQ] = useState('')
  const navigate = useNavigate()
  const { can } = useAdmin()
  if (!can('orders', 'view')) return null
  return (
    <form role="search" className="hidden min-w-0 max-w-xs flex-1 md:block" onSubmit={(e) => { e.preventDefault(); if (q.trim()) navigate(`/admin/orders?q=${encodeURIComponent(q.trim())}`); setQ('') }}>
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} className="input !min-h-10 w-full" placeholder="Search orders or customers…" aria-label="Search orders or customers" />
    </form>
  )
}

export default function AdminLayout() {
  const { admin, can, settings, checking } = useAdmin()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(() => readStorage('craveo.adminSidebar', false) === true)
  const [drawer, setDrawer] = useState(false)
  const items = useMemo(() => NAV.filter((n) => can(n.module, 'view')), [can])
  const crumbs = location.pathname.split('/').filter(Boolean).slice(1)
  const moduleId = moduleForPath(location.pathname)
  const allowed = can(moduleId, 'view')
  const toggle = () => setCollapsed((c) => { writeStorage('craveo.adminSidebar', !c); return !c })
  const name = settings.platformName || 'Craveo'

  if (!admin && checking) return <div className="min-h-dvh bg-cream-50 p-6"><Skeleton rows={6} /></div>
  if (!admin) return <Navigate to="/admin/login" replace state={{ from: `${location.pathname}${location.search}` }} />

  return (
    <div className="min-h-dvh bg-cream-50 lg:flex">
      <aside className={`sticky top-0 hidden h-dvh shrink-0 flex-col bg-ink-900 transition-[width] duration-200 lg:flex ${collapsed ? 'w-[4.5rem]' : 'w-64'}`}>
        <Brand name={name} collapsed={collapsed} />
        <div className="sidebar-scroll flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
          <NavItems items={items} collapsed={collapsed} scroll={false} />
          <button type="button" onClick={toggle} className="m-3 mt-auto flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl text-sm font-bold text-white/70 hover:bg-white/10 hover:text-white" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-pressed={collapsed}>
            {collapsed ? <PanelLeftOpen className="h-5 w-5" aria-hidden="true" /> : <><PanelLeftClose className="h-5 w-5" aria-hidden="true" />Collapse</>}
          </button>
        </div>
      </aside>
      <AnimatePresence>{drawer ? <Drawer key="drawer" items={items} name={name} onClose={() => setDrawer(false)} /> : null}</AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-ink-200/70 bg-cream-50/90 px-4 backdrop-blur sm:px-6">
          <button type="button" onClick={() => setDrawer(true)} className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-cream-200 lg:hidden" aria-label="Open navigation menu"><Menu className="h-5 w-5" aria-hidden="true" /></button>
          <nav aria-label="Breadcrumb" className="min-w-0 flex-1 md:flex-none">
            <ol className="flex items-center gap-1.5 truncate text-sm text-ink-500">
              <li><Link to="/admin" className="font-semibold hover:text-brand-600">Admin</Link></li>
              {crumbs.map((c, i) => (
                <li key={c} className="flex items-center gap-1.5 truncate"><span aria-hidden="true">/</span>{i === crumbs.length - 1 ? <span className="truncate font-bold text-ink-900" aria-current="page">{CRUMBS[c] ?? c}</span> : <span>{CRUMBS[c] ?? c}</span>}</li>
              ))}
              {crumbs.length === 0 ? <li className="flex items-center gap-1.5"><span aria-hidden="true">/</span><span className="font-bold text-ink-900" aria-current="page">Dashboard</span></li> : null}
            </ol>
          </nav>
          <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-1 md:flex-1"><GlobalSearch /><Notifications /><ProfileMenu /></div>
        </header>
        <div className="bg-amber-50 px-4 py-2 text-center text-xs font-semibold text-amber-900 sm:px-6">Demo admin panel — data lives in this browser only. Payments, refunds, payouts and notifications are simulated; nothing real is charged or sent.</div>
        <main id="admin-main" className="mx-auto w-full max-w-[90rem] flex-1 px-4 py-6 sm:px-6 sm:py-8" tabIndex={-1}>
          {admin ? (
            <PageBoundary resetKey={location.pathname}>
              <Suspense fallback={<Skeleton rows={6} />}>
                {allowed ? <Outlet /> : <Unauthorized moduleId={moduleId} />}
              </Suspense>
            </PageBoundary>
          ) : null}
        </main>
      </div>
    </div>
  )
}
