import { useEffect, useId, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Search, TriangleAlert, Info, CircleCheck, SearchX } from 'lucide-react'
import Modal from '../../components/common/Modal.jsx'

const TONES = {
  neutral: 'bg-cream-200 text-ink-700',
  info: 'bg-sky-100 text-sky-800',
  warn: 'bg-amber-100 text-amber-900',
  orange: 'bg-orange-100 text-orange-800',
  good: 'bg-emerald-100 text-emerald-800',
  bad: 'bg-red-100 text-red-800',
  brand: 'bg-brand-50 text-brand-700',
  dark: 'bg-ink-900 text-white',
}

export function Badge({ tone = 'neutral', children, className = '' }) {
  return <span className={`badge ${TONES[tone] ?? TONES.neutral} ${className}`}>{children}</span>
}

export const DemoBadge = () => <Badge tone="warn" className="!px-2 !py-0.5 text-[10px] uppercase tracking-wider">Demo</Badge>

const STATUS_TONES = {
  active: 'good', approved: 'good', verified: 'good', success: 'good', paid: 'good', delivered: 'good', resolved: 'good', online: 'good', live: 'good',
  pending: 'warn', requested: 'warn', submitted: 'warn', in_progress: 'info', open: 'warn', scheduled: 'info', confirmed: 'info', preparing: 'orange', processing: 'info',
  rejected: 'bad', failed: 'bad', cancelled: 'bad', blocked: 'bad', expired: 'bad', exhausted: 'bad', missing: 'neutral', suspended: 'orange',
  inactive: 'neutral', closed: 'neutral', offline: 'neutral', refunded: 'info',
}
export function StatusBadge({ status, label }) {
  const key = String(status)
  return <Badge tone={STATUS_TONES[key] ?? 'neutral'}>{label ?? key.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())}</Badge>
}

export function PageHeader({ title, description, actions, badge }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="flex flex-wrap items-center gap-3 text-3xl font-bold sm:text-4xl">{title}{badge}</h1>
        {description ? <p className="mt-1.5 max-w-3xl text-ink-500">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  )
}

export function Card({ title, subtitle, actions, children, className = '', padded = true }) {
  return (
    <section className={`card ${padded ? 'p-5' : ''} ${className}`}>
      {title || actions ? (
        <header className={`flex flex-wrap items-start justify-between gap-3 ${padded ? 'mb-4' : 'p-5 pb-3'}`}>
          <div className="min-w-0">
            {title ? <h2 className="font-sans text-base font-extrabold">{title}</h2> : null}
            {subtitle ? <p className="text-sm text-ink-500">{subtitle}</p> : null}
          </div>
          {actions}
        </header>
      ) : null}
      {children}
    </section>
  )
}

export function StatCard({ label, value, hint, icon: Icon, delta, tone = 'brand' }) {
  const toneCls = { brand: 'bg-brand-50 text-brand-600', good: 'bg-emerald-50 text-emerald-700', info: 'bg-sky-50 text-sky-700', warn: 'bg-amber-50 text-amber-800' }[tone]
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-ink-500">{label}</p>
        {Icon ? <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${toneCls}`}><Icon className="h-5 w-5" aria-hidden="true" /></span> : null}
      </div>
      <p className="mt-2 break-words text-2xl font-extrabold tabular-nums sm:text-3xl">{value}</p>
      <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-500">
        {delta !== undefined && delta !== null ? <span className={`font-bold ${delta >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}%</span> : null}
        {hint}
      </p>
    </div>
  )
}

export function Alert({ tone = 'info', children, className = '' }) {
  const map = { info: ['bg-sky-50 text-sky-900', Info], warn: ['bg-amber-50 text-amber-900', TriangleAlert], good: ['bg-emerald-50 text-emerald-900', CircleCheck], bad: ['bg-red-50 text-red-900', TriangleAlert] }
  const [cls, Icon] = map[tone]
  return <div role={tone === 'bad' ? 'alert' : 'note'} className={`flex items-start gap-2 rounded-2xl p-3 text-sm font-medium ${cls} ${className}`}><Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><div className="min-w-0">{children}</div></div>
}

export function Field({ label, error, hint, children, className = '', htmlFor }) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-bold text-ink-700">{label}</label>
      {children}
      {hint && !error ? <p className="mt-1 text-xs text-ink-400">{hint}</p> : null}
      {error ? <p className="field-error" role="alert">{error}</p> : null}
    </div>
  )
}

export function TextField({ label, error, hint, className, ...props }) {
  const id = useId()
  return (
    <Field label={label} error={error} hint={hint} className={className} htmlFor={id}>
      <input id={id} className="input w-full" aria-invalid={Boolean(error)} {...props} />
    </Field>
  )
}

export function SelectField({ label, error, hint, className, options, placeholder, ...props }) {
  const id = useId()
  return (
    <Field label={label} error={error} hint={hint} className={className} htmlFor={id}>
      <select id={id} className="input w-full" aria-invalid={Boolean(error)} {...props}>
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((o) => <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>)}
      </select>
    </Field>
  )
}

export function TextAreaField({ label, error, hint, className, ...props }) {
  const id = useId()
  return (
    <Field label={label} error={error} hint={hint} className={className} htmlFor={id}>
      <textarea id={id} className="input min-h-24 w-full py-2" aria-invalid={Boolean(error)} {...props} />
    </Field>
  )
}

export function Toggle({ checked, onChange, label, disabled = false }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${checked ? 'bg-brand-500' : 'bg-ink-200'}`}>
      <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-[1.375rem]' : 'translate-x-0.5'}`} />
    </button>
  )
}

export function CheckField({ label, checked, onChange, hint }) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 text-sm font-semibold text-ink-700">
      <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#ef4f3a]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}{hint ? <span className="block text-xs font-normal text-ink-400">{hint}</span> : null}</span>
    </label>
  )
}

export function SearchInput({ value, onChange, placeholder = 'Search…', label = 'Search' }) {
  return (
    <div className="relative min-w-0 flex-1 sm:max-w-xs">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
      <input type="search" className="input w-full !pl-9" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={label} />
    </div>
  )
}

export function FilterSelect({ label, value, onChange, options, allLabel = 'All' }) {
  return (
    <select className="input !w-auto min-w-0 max-w-full" aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="all">{allLabel}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

export function FilterBar({ children }) {
  return <div className="mb-4 flex flex-wrap items-center gap-2">{children}</div>
}

export function Tabs({ tabs, value, onChange, label = 'Sections' }) {
  return (
    <div className="mb-5 -mx-1 overflow-x-auto px-1" role="tablist" aria-label={label}>
      <div className="inline-flex min-w-full gap-1 border-b border-ink-200/80">
        {tabs.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)}
            className={`-mb-px inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-bold transition-colors ${value === t.id ? 'border-brand-500 text-brand-600' : 'border-transparent text-ink-500 hover:text-ink-900'}`}>
            {t.label}
            {t.count !== undefined ? <span className="rounded-full bg-cream-200 px-2 py-0.5 text-xs text-ink-700">{t.count}</span> : null}
          </button>
        ))}
      </div>
    </div>
  )
}

export function Pager({ result, onPage, onPageSize }) {
  const { page, pages, from, to, total, pageSize } = result
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-200/70 px-4 py-3 text-sm text-ink-500">
      <p>{total ? `Showing ${from}–${to} of ${total}` : 'No results'}</p>
      <div className="flex items-center gap-2">
        {onPageSize ? (
          <label className="flex items-center gap-1.5">Rows
            <select className="input !min-h-9 !w-auto !py-0" value={pageSize} onChange={(e) => onPageSize(Number(e.target.value))}>
              {[5, 10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        ) : null}
        <button type="button" className="btn btn-ghost btn-sm !px-2" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><ChevronLeft className="h-4 w-4" aria-hidden="true" /></button>
        <span className="tabular-nums" aria-live="polite">Page {page} / {pages}</span>
        <button type="button" className="btn btn-ghost btn-sm !px-2" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page"><ChevronRight className="h-4 w-4" aria-hidden="true" /></button>
      </div>
    </div>
  )
}

export function EmptyRow({ title = 'Nothing here', message = 'Try changing your filters.' }) {
  return (
    <div className="flex flex-col items-center px-4 py-12 text-center">
      <SearchX className="h-8 w-8 text-ink-400" aria-hidden="true" />
      <p className="mt-3 font-bold">{title}</p>
      <p className="text-sm text-ink-500">{message}</p>
    </div>
  )
}

export function Skeleton({ rows = 5 }) {
  return (
    <div className="space-y-3 p-5" role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => <div key={i} className="h-9 animate-pulse rounded-xl bg-cream-200 motion-reduce:animate-none" />)}
    </div>
  )
}

/**
 * Table with sortable headers, empty and loading states. Wide tables scroll inside their own box
 * so the page body never scrolls sideways on phones.
 */
export function DataTable({ columns, result, rowKey, sort, onSort, onPage, onPageSize, onRowClick, empty, loading = false, caption }) {
  return (
    <div className="card overflow-hidden">
      {loading ? <Skeleton /> : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              {caption ? <caption className="sr-only">{caption}</caption> : null}
              <thead className="bg-cream-100 text-xs uppercase tracking-wider text-ink-500">
                <tr>
                  {columns.map((c) => (
                    <th key={c.key} scope="col" className={`whitespace-nowrap px-4 py-3 font-bold ${c.className ?? ''}`} aria-sort={sort?.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                      {c.sortable && onSort ? (
                        <button type="button" onClick={() => onSort(c.key)} className="inline-flex items-center gap-1 uppercase hover:text-ink-900">
                          {c.header}
                          {sort?.key === c.key ? (sort.dir === 'asc' ? <ArrowUp className="h-3 w-3" aria-hidden="true" /> : <ArrowDown className="h-3 w-3" aria-hidden="true" />) : null}
                        </button>
                      ) : c.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-200/60">
                {result.rows.map((row) => (
                  <tr key={rowKey(row)} className={onRowClick ? 'cursor-pointer hover:bg-cream-50' : ''} onClick={onRowClick ? () => onRowClick(row) : undefined}>
                    {columns.map((c) => <td key={c.key} className={`px-4 py-3 align-middle ${c.className ?? ''}`}>{c.render ? c.render(row) : row[c.key]}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {result.total === 0 ? (empty ?? <EmptyRow />) : null}
          <Pager result={result} onPage={onPage} onPageSize={onPageSize} />
        </>
      )}
    </div>
  )
}

/** Dialog with title, body and footer. */
export function Dialog({ open, title, onClose, children, footer, size = 'md' }) {
  const titleId = useId()
  return (
    <AnimatePresence>
      {open ? <Modal key="dlg" title={title} titleId={titleId} onClose={onClose} size={size} footer={footer}><div className="px-5 py-5 sm:px-6">{children}</div></Modal> : null}
    </AnimatePresence>
  )
}

/** Confirmation that can also require a written reason (cancellations, rejections, suspensions). */
export function ReasonDialog({ open, title, message, label = 'Reason', confirmLabel = 'Confirm', danger = false, minLength = 5, required = true, onConfirm, onCancel }) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  useEffect(() => { if (open) { setReason(''); setError('') } }, [open])
  const submit = async () => {
    if (required && reason.trim().length < minLength) { setError(`Enter at least ${minLength} characters.`); return }
    const result = await onConfirm(reason.trim())
    if (result && result.ok === false) setError(result.error ?? 'Could not complete this action.')
  }
  return (
    <Dialog open={open} title={title} onClose={onCancel} size="sm"
      footer={<div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button><button type="button" className={`btn ${danger ? 'btn-dark' : 'btn-primary'}`} onClick={submit}>{confirmLabel}</button></div>}>
      <p className="text-ink-500">{message}</p>
      {required || label ? <TextAreaField className="mt-4" label={label} value={reason} onChange={(e) => { setReason(e.target.value); setError('') }} error={error} maxLength={300} data-autofocus /> : null}
      {!required && error ? <p className="field-error" role="alert">{error}</p> : null}
    </Dialog>
  )
}

export function ConfirmAction({ open, title, message, confirmLabel, danger, onConfirm, onCancel }) {
  const [error, setError] = useState('')
  useEffect(() => { if (open) setError('') }, [open])
  return (
    <Dialog open={open} title={title} onClose={onCancel} size="sm"
      footer={<div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button><button type="button" className={`btn ${danger ? 'btn-dark' : 'btn-primary'}`} onClick={async () => { const r = await onConfirm(); if (r && r.ok === false) setError(r.error) }}>{confirmLabel}</button></div>}>
      <p className="text-ink-500">{message}</p>
      {error ? <p className="field-error mt-3" role="alert">{error}</p> : null}
    </Dialog>
  )
}

export function KeyValue({ items, cols = 2 }) {
  return (
    <dl className={`grid gap-x-6 gap-y-3 text-sm ${cols === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
      {items.filter(Boolean).map(([k, v]) => (
        <div key={k} className="min-w-0"><dt className="text-xs font-bold uppercase tracking-wider text-ink-400">{k}</dt><dd className="mt-0.5 break-words font-semibold text-ink-900">{v ?? '—'}</dd></div>
      ))}
    </dl>
  )
}

const fadeIn = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.25 } }
export const Fade = ({ children, className = '' }) => <motion.div {...fadeIn} className={className}>{children}</motion.div>
