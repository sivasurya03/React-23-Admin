import { Link } from 'react-router-dom'

export function LogoMark({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="#E8432E" />
      <path d="M40 22.5c-2.2-2.3-5.1-3.5-8.3-3.5-6.9 0-12.2 5.2-12.2 12.9S24.8 44.8 31.7 44.8c3.3 0 6.2-1.2 8.5-3.6" fill="none" stroke="#FFF7ED" strokeWidth="5.5" strokeLinecap="round" />
      <circle cx="45.5" cy="22" r="3.4" fill="#FFB454" />
    </svg>
  )
}

export default function Logo({ light = false }) {
  return (
    <Link to="/" className="inline-flex items-center gap-2.5" aria-label="Craveo home">
      <LogoMark />
      <span className={`font-display text-2xl font-bold tracking-tight ${light ? 'text-white' : 'text-ink-900'}`}>Craveo</span>
    </Link>
  )
}
