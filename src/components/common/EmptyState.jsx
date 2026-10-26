import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

export function PlateIllustration({ className = 'h-36 w-36' }) {
  return (
    <svg viewBox="0 0 160 160" className={className} aria-hidden="true">
      <ellipse cx="80" cy="132" rx="52" ry="8" fill="#e4dccf" opacity="0.7" />
      <circle cx="80" cy="76" r="54" fill="#fff" stroke="#e4dccf" strokeWidth="3" />
      <circle cx="80" cy="76" r="38" fill="#fbf3e6" stroke="#f3e7d3" strokeWidth="2" />
      <path d="M58 76h44" stroke="#ef4f3a" strokeWidth="5" strokeLinecap="round" opacity="0.85" />
      <path d="M64 66c6-6 26-6 32 0" stroke="#f59e3b" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M64 86c6 6 26 6 32 0" stroke="#2f8f5b" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M126 28v38M120 28v14c0 5 3 8 6 8s6-3 6-8V28" stroke="#3d3630" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      <path d="M32 28c-6 6-8 16-4 26 2 5 5 7 8 7V28z" fill="#3d3630" />
    </svg>
  )
}

export default function EmptyState({ title, message, actionLabel, actionTo, onAction, secondary, headingLevel = 1 }) {
  const Heading = `h${headingLevel}`
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="mx-auto flex max-w-md flex-col items-center px-4 py-14 text-center">
      <PlateIllustration />
      <Heading className="mt-5 text-2xl font-bold">{title}</Heading>
      <p className="mt-2 text-ink-500">{message}</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {actionTo ? <Link to={actionTo} className="btn btn-primary">{actionLabel}</Link> : null}
        {onAction ? <button type="button" onClick={onAction} className="btn btn-primary">{actionLabel}</button> : null}
        {secondary}
      </div>
    </motion.div>
  )
}
