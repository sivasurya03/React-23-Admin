import { Star } from 'lucide-react'

export function RatingBadge({ value, className = '' }) {
  return (
    <span className={`badge bg-leaf text-white ${className}`} aria-label={`Rated ${value} out of 5`}>
      {Number(value).toFixed(1)}
      <Star className="h-3 w-3 fill-current" aria-hidden="true" />
    </span>
  )
}

export function Stars({ value, size = 'h-4 w-4' }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`${size} ${n <= Math.round(value) ? 'fill-amber-accent text-amber-accent' : 'text-ink-200'}`} aria-hidden="true" />
      ))}
    </span>
  )
}
