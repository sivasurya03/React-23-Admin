import { useState } from 'react'
import { useToast } from '../../context/ToastContext.jsx'

/** List state (search / filters / sort / page) kept in one hook so every list behaves the same. */
export function useListState({ filters = {}, sortKey = null, sortDir = 'asc', pageSize = 10 } = {}) {
  const [s, setS] = useState({ search: '', filters, sortKey, sortDir, page: 1, pageSize })
  return {
    ...s,
    setSearch: (search) => setS((p) => ({ ...p, search, page: 1 })),
    setFilter: (key, value) => setS((p) => ({ ...p, filters: { ...p.filters, [key]: value }, page: 1 })),
    toggleSort: (key) => setS((p) => ({ ...p, sortKey: key, sortDir: p.sortKey === key && p.sortDir === 'asc' ? 'desc' : 'asc', page: 1 })),
    setPage: (page) => setS((p) => ({ ...p, page })),
    setPageSize: (n) => setS((p) => ({ ...p, pageSize: n, page: 1 })),
  }
}

/** Shows a toast for an action result: success message or the validation error. */
export function useRun() {
  const { push } = useToast()
  return (result, successMessage) => {
    if (result?.ok) { if (successMessage) push(successMessage); return true }
    push(result?.error ?? 'Something went wrong.', { type: 'error' })
    return false
  }
}
