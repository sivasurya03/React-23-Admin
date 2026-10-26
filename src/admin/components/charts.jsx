import { useState } from 'react'

// Dependency-free SVG charts. All values come from real order data supplied by the caller.
const nice = (max) => {
  if (max <= 0) return 1
  const p = 10 ** Math.floor(Math.log10(max))
  const n = max / p
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p
}

export function BarChart({ data, height = 200, format = (v) => v, color = '#ef4f3a', label = 'Bar chart', highlight = null }) {
  const [hover, setHover] = useState(null)
  const W = 600
  const H = height
  const pad = { l: 8, r: 8, t: 14, b: 26 }
  const max = nice(Math.max(0, ...data.map((d) => d.value)))
  const bw = (W - pad.l - pad.r) / Math.max(1, data.length)
  const every = Math.ceil(data.length / 12)
  if (!data.length) return <p className="py-10 text-center text-sm text-ink-500">No data for this period.</p>
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={label}>
        {[0, 0.5, 1].map((t) => <line key={t} x1={pad.l} x2={W - pad.r} y1={pad.t + (H - pad.t - pad.b) * (1 - t)} y2={pad.t + (H - pad.t - pad.b) * (1 - t)} stroke="#e4dccf" strokeDasharray="3 4" />)}
        {data.map((d, i) => {
          const h = ((H - pad.t - pad.b) * d.value) / max
          const x = pad.l + i * bw
          return (
            <g key={d.label + i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} tabIndex={0} aria-label={`${d.label}: ${format(d.value)}`}>
              <rect x={x + bw * 0.14} y={H - pad.b - h} width={Math.max(1, bw * 0.72)} height={Math.max(h, d.value > 0 ? 1 : 0)} rx="3" fill={highlight !== null && highlight === i ? '#b53020' : color} opacity={hover === null || hover === i ? 1 : 0.55} />
              {i % every === 0 ? <text x={x + bw / 2} y={H - 8} textAnchor="middle" fontSize="10" fill="#6b6259">{d.label}</text> : null}
            </g>
          )
        })}
      </svg>
      <p className="mt-1 h-5 text-center text-xs font-semibold text-ink-700" aria-live="polite">{hover !== null ? `${data[hover].label}: ${format(data[hover].value)}` : ''}</p>
    </div>
  )
}

export function LineChart({ data, height = 200, format = (v) => v, color = '#ef4f3a', label = 'Line chart' }) {
  const [hover, setHover] = useState(null)
  const W = 600
  const H = height
  const pad = { l: 8, r: 8, t: 14, b: 26 }
  if (data.length < 2) return <p className="py-10 text-center text-sm text-ink-500">Not enough data points to draw a trend.</p>
  const max = nice(Math.max(0, ...data.map((d) => d.value)))
  const step = (W - pad.l - pad.r) / (data.length - 1)
  const pts = data.map((d, i) => [pad.l + i * step, pad.t + (H - pad.t - pad.b) * (1 - d.value / max)])
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
  const area = `${line} L${pts.at(-1)[0]} ${H - pad.b} L${pts[0][0]} ${H - pad.b} Z`
  const every = Math.ceil(data.length / 10)
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={label}>
        {[0, 0.5, 1].map((t) => <line key={t} x1={pad.l} x2={W - pad.r} y1={pad.t + (H - pad.t - pad.b) * (1 - t)} y2={pad.t + (H - pad.t - pad.b) * (1 - t)} stroke="#e4dccf" strokeDasharray="3 4" />)}
        <path d={area} fill={color} opacity="0.1" />
        <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {data.map((d, i) => (
          <g key={d.label + i}>
            <rect x={pts[i][0] - step / 2} y={0} width={step} height={H} fill="transparent" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
            {hover === i ? <circle cx={pts[i][0]} cy={pts[i][1]} r="4.5" fill="#fff" stroke={color} strokeWidth="2.5" /> : null}
            {i % every === 0 ? <text x={pts[i][0]} y={H - 8} textAnchor="middle" fontSize="10" fill="#6b6259">{d.label}</text> : null}
          </g>
        ))}
      </svg>
      <p className="mt-1 h-5 text-center text-xs font-semibold text-ink-700" aria-live="polite">{hover !== null ? `${data[hover].label}: ${format(data[hover].value)}` : ''}</p>
    </div>
  )
}

const DONUT_COLORS = ['#f59e3b', '#3b8fc4', '#ef4f3a', '#2f8f5b', '#8b8178', '#b53020']

export function Donut({ data, label = 'Distribution' }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  const R = 54
  const C = 2 * Math.PI * R
  let offset = 0
  return (
    <div className="flex flex-wrap items-center gap-5">
      <svg viewBox="0 0 140 140" className="h-36 w-36 shrink-0" role="img" aria-label={label}>
        <circle cx="70" cy="70" r={R} fill="none" stroke="#f3e7d3" strokeWidth="18" />
        {total > 0 ? data.map((d, i) => {
          const len = (d.value / total) * C
          const el = <circle key={d.key ?? d.label} cx="70" cy="70" r={R} fill="none" stroke={DONUT_COLORS[i % DONUT_COLORS.length]} strokeWidth="18" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset} transform="rotate(-90 70 70)" />
          offset += len
          return el
        }) : null}
        <text x="70" y="68" textAnchor="middle" fontSize="22" fontWeight="800" fill="#1f1b18">{total}</text>
        <text x="70" y="86" textAnchor="middle" fontSize="10" fill="#6b6259">orders</text>
      </svg>
      <ul className="min-w-0 flex-1 space-y-1.5 text-sm">
        {data.map((d, i) => (
          <li key={d.key ?? d.label} className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2"><span className="h-3 w-3 shrink-0 rounded-full" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} aria-hidden="true" /><span className="truncate">{d.label}</span></span>
            <span className="font-bold tabular-nums">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
