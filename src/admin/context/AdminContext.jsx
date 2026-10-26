import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AdminContext } from './adminContextValue.js'
import { DEMO_ENABLED } from '../config.js'
import { fetchSession, serverLogin, serverLogout } from '../store/adminApi.js'
import { useOrders } from '../../context/OrderContext.jsx'
import { readStorage, writeStorage, removeStorage, STORAGE_KEYS } from '../../utils/storage.js'
import { verifyPassword } from '../../utils/passwordHash.js'
import { restaurants as baseRestaurants } from '../../data/restaurants.js'
import { loadAdminState, saveAdminState, applyRuntimeFromState } from '../store/adminStore.js'
import { createActions } from '../store/actions.js'
import { buildCatalog } from '../lib/catalog.js'
import { can as canDo, isKnownRole } from '../lib/rbac.js'
import { deriveCustomers } from '../lib/customers.js'
import { rateFor } from '../lib/finance.js'
import { uid } from '../lib/util.js'

// DEMO ADMIN AUTH + DATA. Everything is client-side: the session, role checks and audit log can be
// altered by anyone with DevTools. A real deployment must enforce all of this on a server.

const SESSION_TTL = 8 * 60 * 60 * 1000
const MAX_ATTEMPTS = 5
const LOCK_MS = 60 * 1000

function loadSession() {
  const s = readStorage(STORAGE_KEYS.adminSession, null)
  if (s && typeof s.adminId === 'string' && Number.isFinite(s.at) && Date.now() - s.at < SESSION_TTL) return { adminId: s.adminId, at: s.at }
  return null
}

export function AdminProvider({ children }) {
  const { orders: liveOrders, updateOrder } = useOrders()
  const [state, setState] = useState(() => loadAdminState())
  const [session, setSession] = useState(() => (DEMO_ENABLED ? loadSession() : null))
  const [serverUser, setServerUser] = useState(null)
  const [checking, setChecking] = useState(true)
  const [customerVersion, setCustomerVersion] = useState(0)
  const stateRef = useRef(state)
  const attempts = useRef({ count: 0, lockedUntil: 0 })

  const commit = useCallback((producer) => {
    const prev = stateRef.current
    const next = producer(prev)
    if (!next || next === prev) return
    stateRef.current = next
    if (next.overlay !== prev.overlay || next.coupons !== prev.coupons || next.settings !== prev.settings || next.demoOrders !== prev.demoOrders) applyRuntimeFromState(next)
    setState(next)
  }, [])

  useEffect(() => { saveAdminState(state) }, [state])
  useEffect(() => {
    if (session) writeStorage(STORAGE_KEYS.adminSession, session)
    else removeStorage(STORAGE_KEYS.adminSession)
  }, [session])

  const admin = useMemo(() => {
    // A server session (real account) wins; its role comes from the server, not from LocalStorage.
    if (serverUser && isKnownRole(serverUser.role)) return { id: serverUser.id, name: serverUser.name, email: serverUser.email, role: serverUser.role, kind: 'server' }
    if (!session || !DEMO_ENABLED) return null
    const u = state.adminUsers.find((x) => x.id === session.adminId && x.active !== false)
    return u ? { id: u.id, name: u.name, email: u.email, role: u.role, kind: 'demo' } : null
  }, [session, serverUser, state.adminUsers])

  // Restore a real server session (HttpOnly cookie) after a page reload.
  useEffect(() => {
    let alive = true
    fetchSession().then((u) => { if (alive) { setServerUser(u); setChecking(false) } })
    return () => { alive = false }
  }, [])

  const orders = useMemo(
    () => [...liveOrders.map((o) => ({ ...o, source: 'live' })), ...state.demoOrders.map((o) => ({ ...o, source: 'demo' }))].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [liveOrders, state.demoOrders],
  )
  const catalog = useMemo(() => buildCatalog(baseRestaurants, state.overlay), [state.overlay])

  const refs = useRef({})
  refs.current = { orders, catalog, admin }

  const actions = useMemo(
    () => createActions({
      commit,
      getState: () => stateRef.current,
      getOrders: () => refs.current.orders,
      getCatalog: () => refs.current.catalog,
      getActor: () => refs.current.admin,
      updateLiveOrder: updateOrder,
    }),
    [commit, updateOrder],
  )

  // Detect new live orders / customer refund requests → in-app notifications. First run only baselines.
  useEffect(() => {
    const known = new Set(stateRef.current.knownLiveOrders)
    const baselined = known.has('__baseline__')
    const keys = []
    const events = []
    for (const o of liveOrders) {
      if (!known.has(o.id)) { keys.push(o.id); if (baselined) events.push({ type: 'orders', title: 'New order', body: `${o.id} from ${o.customer?.name ?? 'a customer'} at ${o.restaurant?.name ?? 'a restaurant'}.`, link: '/admin/orders' }) }
      if (o.refund?.requestedBy === 'customer') {
        const k = `rf:${o.id}:${o.refund.id}`
        if (!known.has(k)) { keys.push(k); if (baselined) events.push({ type: 'refunds', title: 'Refund requested', body: `${o.id}: ${o.refund.reason}`, link: '/admin/orders?tab=refunds' }) }
      }
    }
    if (!baselined) keys.push('__baseline__')
    if (!keys.length) return
    commit((s) => ({ ...s, knownLiveOrders: [...s.knownLiveOrders, ...keys].slice(-800) }))
    events.forEach((e) => actions.notify(e.type, e.title, e.body, e.link))
  }, [liveOrders, commit, actions])

  // Freeze the commission rate each order was first seen with, so later rate changes never rewrite history.
  useEffect(() => {
    const st = stateRef.current
    const rates = {}
    catalog.all.forEach((r) => { if (Number.isFinite(r.admin.commissionRate)) rates[r.id] = r.admin.commissionRate })
    const add = {}
    for (const o of orders) {
      if (st.commissionSnapshots[o.id] === undefined) add[o.id] = rateFor(o, { snapshots: {}, restaurantRates: rates, defaultRate: st.settings.defaultCommission })
    }
    if (Object.keys(add).length) commit((s) => ({ ...s, commissionSnapshots: { ...s.commissionSnapshots, ...add } }))
  }, [orders, catalog, commit])

  const customers = useMemo(() => {
    const users = readStorage(STORAGE_KEYS.users, [])
    const safe = Array.isArray(users) ? users.filter((u) => u && typeof u.email === 'string').map((u) => ({ id: u.id, name: u.name, email: u.email, plus: u.plus })) : []
    return deriveCustomers({ users: safe, liveOrders, demoOrders: state.demoOrders, meta: state.customerMeta })
    // customerVersion lets the Customers page re-read accounts created in another tab
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveOrders, state.demoOrders, state.customerMeta, customerVersion])

  const financeCtx = useMemo(() => {
    const restaurantRates = {}
    catalog.all.forEach((r) => { if (Number.isFinite(r.admin.commissionRate)) restaurantRates[r.id] = r.admin.commissionRate })
    return { snapshots: state.commissionSnapshots, restaurantRates, defaultRate: state.settings.defaultCommission, payoutPerDelivery: state.settings.partnerPayoutPerDelivery }
  }, [catalog, state.commissionSnapshots, state.settings.defaultCommission, state.settings.partnerPayoutPerDelivery])

  const writeAudit = useCallback((actor, action, label, note = '') => {
    commit((s) => ({ ...s, audit: [{ id: uid('AU'), at: new Date().toISOString(), actor, action, entity: { type: 'admin_user', id: actor.id, label }, before: null, after: null, note }, ...s.audit].slice(0, 400) }))
  }, [commit])

  const login = useCallback(async (email, password) => {
    const now = Date.now()
    const a = attempts.current
    if (a.lockedUntil > now) return { ok: false, error: `Too many attempts. Try again in ${Math.ceil((a.lockedUntil - now) / 1000)}s.` }
    const mail = String(email || '').trim().toLowerCase()
    const local = DEMO_ENABLED ? stateRef.current.adminUsers.find((u) => u.email.toLowerCase() === mail) : null

    if (!local) {
      // Not a built-in demo account → authenticate against the real server. Never accepted client-side.
      const res = await serverLogin(mail, String(password ?? ''))
      if (!res.ok) {
        if (!res.notConfigured) { a.count += 1; if (a.count >= MAX_ATTEMPTS) { a.lockedUntil = Date.now() + LOCK_MS; a.count = 0 } }
        return { ok: false, error: res.error }
      }
      a.count = 0
      setServerUser(res.user)
      writeAudit({ id: res.user.id, name: res.user.name, role: res.user.role }, 'auth.login', res.user.name, 'Real account (server-verified).')
      return { ok: true }
    }

    const valid = await verifyPassword(String(password ?? ''), local.salt, local.hash)
    if (!valid || local.active === false) {
      a.count += 1
      if (a.count >= MAX_ATTEMPTS) { a.lockedUntil = Date.now() + LOCK_MS; a.count = 0 }
      writeAudit({ id: 'anonymous', name: mail || 'unknown', role: '—' }, 'auth.login_failed', mail || 'unknown', 'Demo sign-in rejected.')
      return { ok: false, error: local.active === false ? 'This admin account is deactivated.' : 'Incorrect email or password.' }
    }
    a.count = 0
    setSession({ adminId: local.id, at: Date.now() })
    writeAudit({ id: local.id, name: local.name, role: local.role }, 'auth.login', local.name, 'Demo account (browser-side check).')
    return { ok: true }
  }, [writeAudit])

  const logout = useCallback(() => {
    const who = refs.current.admin
    if (who) actions.audit(who, { action: 'auth.logout', entity: { type: 'admin_user', id: who.id, label: who.name } })
    if (who?.kind === 'server') serverLogout()
    setServerUser(null)
    setSession(null)
  }, [actions])

  const can = useCallback((moduleId, action = 'view') => (admin ? canDo(state.matrix, admin.role, moduleId, action) : false), [admin, state.matrix])
  const reloadCustomers = useCallback(() => setCustomerVersion((v) => v + 1), [])

  const value = useMemo(
    () => ({ state, admin, isAuthenticated: Boolean(admin), checking, demoEnabled: DEMO_ENABLED, login, logout, can, orders, liveOrders, catalog, customers, financeCtx, reloadCustomers, actions, settings: state.settings }),
    [state, admin, checking, login, logout, can, orders, liveOrders, catalog, customers, financeCtx, reloadCustomers, actions],
  )
  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
}
