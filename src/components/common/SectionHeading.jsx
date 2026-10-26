import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

export default function SectionHeading({ eyebrow, title, subtitle, to, linkLabel = 'See all', id }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4 sm:mb-8">
      <div className="min-w-0">
        {eyebrow ? <p className="mb-1.5 text-xs font-bold uppercase tracking-[0.14em] text-brand-600">{eyebrow}</p> : null}
        <h2 id={id} className="text-3xl font-bold leading-tight text-ink-900 sm:text-4xl">{title}</h2>
        {subtitle ? <p className="mt-2 max-w-xl text-ink-500">{subtitle}</p> : null}
      </div>
      {to ? (
        <Link to={to} className="group hidden shrink-0 items-center gap-1.5 text-sm font-bold text-brand-600 hover:text-brand-700 sm:inline-flex">
          {linkLabel}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  )
}
