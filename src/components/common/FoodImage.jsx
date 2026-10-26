import { useId, useState } from 'react'
import { CATEGORY_ICONS, CATEGORY_TONES } from '../../utils/categoryIcons.js'
import { imageCandidates } from '../../data/images.js'

// Tries each candidate URL in order, then falls back to a locally generated
// illustrated tile so a failed network image never leaves a broken box.
export default function FoodImage({ photo, srcs, alt, category = 'pizza', width = 800, className = '', imgClassName = '', priority = false, label }) {
  const candidates = srcs ?? imageCandidates(photo, width)
  const [failed, setFailed] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const patternId = `dots-${useId().replace(/:/g, '')}`
  const exhausted = failed >= candidates.length
  const [from, to] = CATEGORY_TONES[category] ?? CATEGORY_TONES.pizza
  const Icon = CATEGORY_ICONS[category] ?? CATEGORY_ICONS.pizza

  if (exhausted) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`relative flex items-center justify-center overflow-hidden ${className}`}
        style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
      >
        <svg className="absolute inset-0 h-full w-full opacity-20" aria-hidden="true">
          <defs>
            <pattern id={patternId} width="22" height="22" patternUnits="userSpaceOnUse">
              <circle cx="3" cy="3" r="2" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#${patternId})`} />
        </svg>
        <div className="relative flex flex-col items-center gap-1 text-white/95">
          <Icon className="h-1/3 min-h-8 w-1/3 min-w-8 max-w-20" strokeWidth={1.5} aria-hidden="true" />
          {label ? <span className="px-3 text-center text-xs font-bold uppercase tracking-wider text-white/90 line-clamp-2">{label}</span> : null}
        </div>
      </div>
    )
  }

  return (
    <div className={`relative overflow-hidden bg-cream-200 ${className}`}>
      <img
        key={candidates[failed]}
        src={candidates[failed]}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed((n) => n + 1)}
        className={`h-full w-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'} ${imgClassName}`}
      />
    </div>
  )
}
