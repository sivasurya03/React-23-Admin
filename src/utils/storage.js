// Safe LocalStorage helpers. Every access is wrapped so private-mode browsers,
// blocked storage, quota errors and malformed JSON never crash the app.
export function readStorage(key, fallback) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return fallback
    const raw = window.localStorage.getItem(key)
    if (raw == null) return fallback
    const parsed = JSON.parse(raw)
    return parsed == null ? fallback : parsed
  } catch {
    return fallback
  }
}

export function writeStorage(key, value) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false
    window.localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function removeStorage(key) {
  try {
    window.localStorage.removeItem(key)
  } catch {
    /* storage unavailable — nothing to remove */
  }
}

export const STORAGE_KEYS = {
  cart: 'craveo.cart.v1',
  wishlist: 'craveo.wishlist.v1',
  orders: 'craveo.orders.v1',
  users: 'craveo.users.v1',
  session: 'craveo.session.v1',
  location: 'craveo.location.v1',
  checkoutDraft: 'craveo.checkoutDraft.v1',
  admin: 'craveo.admin.v1',
  adminSession: 'craveo.adminSession.v1',
}
