// Pure support-ticket rules.
export const TRANSITIONS = {
  open: ['in_progress', 'resolved', 'closed'],
  in_progress: ['open', 'resolved', 'closed'],
  resolved: ['in_progress', 'closed'],
  closed: ['open'],
}
export const STATUS_LABELS = { open: 'Open', in_progress: 'In progress', resolved: 'Resolved', closed: 'Closed' }
export const canTransition = (from, to) => (TRANSITIONS[from] ?? []).includes(to)

const fail = (error) => ({ ok: false, error })
const text = (v) => String(v ?? '').trim()

export function nextTicketId(tickets) {
  const max = tickets.reduce((m, t) => Math.max(m, Number(String(t.id).replace(/\D/g, '')) || 0), 1000)
  return `TK-${max + 1}`
}

export function buildTicket(values, { id, now = new Date(), author = 'Admin', actorId = null }) {
  const at = now.toISOString()
  return {
    id, subject: text(values.subject), category: values.category, priority: values.priority, status: 'open', demo: false,
    customerId: values.customerId || null, customerName: text(values.customerName), customerEmail: text(values.customerEmail), orderId: values.orderId || null,
    assigneeId: actorId, createdAt: at, updatedAt: at,
    messages: [{ id: `${id}-m1`, from: 'customer', author: text(values.customerName), text: text(values.message), at, loggedBy: author }],
    dispute: values.isDispute ? { open: true, note: '', resolvedAt: null } : null,
  }
}

export function appendMessage(ticket, { from = 'admin', author, body, now = new Date() }) {
  const t = text(body)
  if (t.length < 2) return fail('Write a reply first.')
  if (ticket.status === 'closed') return fail('Reopen the ticket before replying.')
  const at = now.toISOString()
  const message = { id: `${ticket.id}-m${ticket.messages.length + 1}`, from, author, text: t, at }
  return { ok: true, ticket: { ...ticket, status: ticket.status === 'open' ? 'in_progress' : ticket.status, messages: [...ticket.messages, message], updatedAt: at } }
}

export function changeStatus(ticket, next, { now = new Date() } = {}) {
  if (ticket.status === next) return fail(`Ticket is already ${STATUS_LABELS[next].toLowerCase()}.`)
  if (!canTransition(ticket.status, next)) return fail(`A ${STATUS_LABELS[ticket.status].toLowerCase()} ticket cannot move to ${STATUS_LABELS[next].toLowerCase()}.`)
  if (ticket.dispute?.open && (next === 'resolved' || next === 'closed')) return fail('Resolve the dispute with a resolution note before closing this ticket.')
  return { ok: true, ticket: { ...ticket, status: next, updatedAt: now.toISOString() } }
}

export function openDispute(ticket, { now = new Date() } = {}) {
  if (ticket.dispute?.open) return fail('A dispute is already open on this ticket.')
  return { ok: true, ticket: { ...ticket, status: ticket.status === 'closed' ? 'open' : ticket.status, dispute: { open: true, note: '', resolvedAt: null }, updatedAt: now.toISOString() } }
}

export function resolveDispute(ticket, note, { now = new Date() } = {}) {
  if (!ticket.dispute?.open) return fail('There is no open dispute on this ticket.')
  if (text(note).length < 10) return fail('Write a resolution note (at least 10 characters) explaining the outcome.')
  const at = now.toISOString()
  return { ok: true, ticket: { ...ticket, status: ticket.status === 'closed' ? 'closed' : 'resolved', dispute: { open: false, note: text(note), resolvedAt: at }, updatedAt: at } }
}
