export default function VegMark({ veg = true, className = '' }) {
  const color = veg ? '#2f8f5b' : '#b53020'
  return (
    <span
      className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border-[1.5px] bg-white ${className}`}
      style={{ borderColor: color }}
      role="img"
      aria-label={veg ? 'Vegetarian' : 'Non-vegetarian'}
    >
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
    </span>
  )
}
