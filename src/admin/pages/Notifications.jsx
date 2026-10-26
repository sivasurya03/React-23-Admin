import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { useAdmin } from '../context/adminContextValue.js'
import { Badge, Card, Fade, PageHeader } from '../components/ui.jsx'
import { formatDateTime } from '../../utils/format.js'
import usePageTitle from '../../hooks/usePageTitle.js'

export default function Notifications() {
  usePageTitle('Notifications — Craveo Admin')
  const { state, actions } = useAdmin()
  const navigate = useNavigate()
  const unread = state.notifications.filter((n) => !n.read).length
  return (
    <Fade>
      <PageHeader title="Notifications" description="In-app events only. No emails or SMS are sent by this demo." actions={<button type="button" className="btn btn-ghost btn-sm" disabled={!unread} onClick={() => actions.markAllNotificationsRead()}>Mark all as read</button>} />
      <Card padded={false}>
        {state.notifications.length === 0 ? (
          <div className="flex flex-col items-center px-4 py-14 text-center"><Bell className="h-8 w-8 text-ink-400" aria-hidden="true" /><p className="mt-3 font-bold">No notifications yet</p><p className="text-sm text-ink-500">New orders, refund requests, applications and tickets will appear here.</p></div>
        ) : (
          <ul className="divide-y divide-ink-200/60">
            {state.notifications.map((n) => (
              <li key={n.id} className={`flex flex-wrap items-start justify-between gap-3 px-5 py-4 ${n.read ? '' : 'bg-brand-50/40'}`}>
                <div className="min-w-0"><p className="flex items-center gap-2 font-bold">{n.title}<Badge tone={n.read ? 'neutral' : 'brand'}>{n.read ? 'Read' : 'Unread'}</Badge></p><p className="text-sm text-ink-500">{n.body}</p><p className="text-xs text-ink-400">{formatDateTime(n.at)}</p></div>
                <div className="flex gap-2">{n.link ? <button type="button" className="btn btn-ghost btn-sm" onClick={() => { actions.markNotificationRead(n.id); navigate(n.link) }}>Open</button> : null}{n.read ? null : <button type="button" className="btn btn-ghost btn-sm" onClick={() => actions.markNotificationRead(n.id)}>Mark read</button>}</div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </Fade>
  )
}
