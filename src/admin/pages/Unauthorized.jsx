import { Link } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { useAdmin } from '../context/adminContextValue.js'
import { MODULES } from '../lib/rbac.js'
import usePageTitle from '../../hooks/usePageTitle.js'

export default function Unauthorized({ moduleId }) {
  usePageTitle('Access denied — Craveo Admin')
  const { admin, can } = useAdmin()
  const label = MODULES.find((m) => m.id === moduleId)?.label ?? 'this page'
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-16 text-center">
      <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600"><ShieldAlert className="h-8 w-8" aria-hidden="true" /></span>
      <h1 className="mt-5 text-3xl font-bold">Access denied</h1>
      <p className="mt-2 text-ink-500">Your role ({admin?.role.replace(/_/g, ' ')}) does not have permission to view <strong>{label}</strong>. Ask a Super Admin if you need access.</p>
      <p className="mt-2 text-xs text-ink-400">Demo note: this is a client-side check. In production the server must enforce it.</p>
      <Link to={can('dashboard', 'view') ? '/admin' : '/'} className="btn btn-primary mt-6">{can('dashboard', 'view') ? 'Back to dashboard' : 'Back to Craveo'}</Link>
    </div>
  )
}
