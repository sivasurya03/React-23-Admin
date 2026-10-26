import { readStorage, STORAGE_KEYS } from './storage.js'

// Account status is managed in the Admin panel (Customers). The customer login reads it here so a
// suspended/blocked account is actually refused. Client-side only — a real backend must enforce this.
export const ACCOUNT_STATUSES = ['active', 'suspended', 'blocked']

export function getAccountStatus(email) {
  const state = readStorage(STORAGE_KEYS.admin, null)
  const meta = state && typeof state === 'object' && state.customerMeta && typeof state.customerMeta === 'object' ? state.customerMeta : {}
  const entry = meta[String(email || '').trim().toLowerCase()]
  return entry && ACCOUNT_STATUSES.includes(entry.status) ? entry.status : 'active'
}

export const isAccountBlocked = (email) => getAccountStatus(email) !== 'active'
