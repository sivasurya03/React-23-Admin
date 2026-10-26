// Role-based access control (CLIENT-SIDE, demo only). This hides UI and blocks actions inside the
// browser, but anyone with DevTools can bypass it. Real authorization MUST be enforced by a backend.

export const MODULES = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'orders', label: 'Orders & refunds' },
  { id: 'restaurants', label: 'Restaurants' },
  { id: 'menu', label: 'Menu' },
  { id: 'partners', label: 'Delivery partners' },
  { id: 'customers', label: 'Customers' },
  { id: 'finance', label: 'Payments & finance' },
  { id: 'promotions', label: 'Offers & promotions' },
  { id: 'support', label: 'Support & disputes' },
  { id: 'reports', label: 'Reports' },
  { id: 'settings', label: 'Settings & zones' },
  { id: 'roles', label: 'Roles & admins' },
  { id: 'audit', label: 'Audit logs' },
]

export const ACTIONS = [
  { id: 'view', label: 'View' },
  { id: 'create', label: 'Create' },
  { id: 'edit', label: 'Edit' },
  { id: 'approve', label: 'Approve' },
  { id: 'refund', label: 'Review refunds' },
  { id: 'delete', label: 'Delete' },
]

export const ROLES = [
  { id: 'super_admin', label: 'Super Admin', description: 'Full access, including roles and audit logs.' },
  { id: 'operations', label: 'Operations', description: 'Orders, delivery partners and restaurant onboarding.' },
  { id: 'restaurant_manager', label: 'Restaurant Manager', description: 'Restaurants and menus.' },
  { id: 'finance', label: 'Finance', description: 'Payments, settlements, payouts and refunds.' },
  { id: 'support', label: 'Support', description: 'Tickets, disputes and customer lookups.' },
]

const ALL = ACTIONS.map((a) => a.id)

// Least-privilege defaults: a role only gets what its job needs.
export const DEFAULT_MATRIX = {
  super_admin: Object.fromEntries(MODULES.map((m) => [m.id, [...ALL]])),
  operations: {
    dashboard: ['view'], orders: ['view', 'edit'], restaurants: ['view', 'edit', 'approve'], menu: ['view'],
    partners: ['view', 'create', 'edit', 'approve'], customers: ['view'], support: ['view'], reports: ['view'], settings: ['view'],
  },
  restaurant_manager: {
    dashboard: ['view'], orders: ['view'], restaurants: ['view', 'create', 'edit'], menu: ['view', 'create', 'edit', 'delete'],
    promotions: ['view'], reports: ['view'],
  },
  finance: {
    dashboard: ['view'], orders: ['view', 'refund'], customers: ['view'], finance: ['view', 'create', 'edit', 'approve', 'refund'],
    promotions: ['view'], reports: ['view'],
  },
  support: {
    dashboard: ['view'], orders: ['view', 'refund'], restaurants: ['view'], partners: ['view'], customers: ['view'],
    support: ['view', 'create', 'edit', 'approve'],
  },
}

export const isKnownRole = (role) => ROLES.some((r) => r.id === role)

/** Sanitises a stored matrix. Unknown roles/modules/actions are dropped; Super Admin is always full. */
export function normalizeMatrix(raw) {
  const out = {}
  for (const role of ROLES) {
    const stored = raw && typeof raw === 'object' ? raw[role.id] : null
    const base = DEFAULT_MATRIX[role.id]
    out[role.id] = {}
    for (const m of MODULES) {
      const list = stored && Array.isArray(stored[m.id]) ? stored[m.id] : base[m.id] ?? []
      out[role.id][m.id] = ACTIONS.map((a) => a.id).filter((a) => list.includes(a))
    }
  }
  out.super_admin = DEFAULT_MATRIX.super_admin
  return out
}

export function can(matrix, role, moduleId, action = 'view') {
  if (!isKnownRole(role)) return false
  if (role === 'super_admin') return true
  const list = matrix?.[role]?.[moduleId]
  return Array.isArray(list) && list.includes(action)
}

// Route → module used by the guard. Anything not listed needs the dashboard view permission.
export const ROUTE_MODULES = [
  ['/admin/orders', 'orders'], ['/admin/restaurants', 'restaurants'], ['/admin/menu', 'menu'],
  ['/admin/delivery-partners', 'partners'], ['/admin/customers', 'customers'], ['/admin/finance', 'finance'],
  ['/admin/promotions', 'promotions'], ['/admin/support', 'support'], ['/admin/reports', 'reports'],
  ['/admin/settings', 'settings'], ['/admin/roles', 'roles'], ['/admin/audit-logs', 'audit'],
]

export function moduleForPath(pathname) {
  const hit = ROUTE_MODULES.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  return hit ? hit[1] : 'dashboard'
}
