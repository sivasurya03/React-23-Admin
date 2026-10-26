import { RANGE_PRESETS } from '../lib/analytics.js'

// Preset + custom date range. The parent resolves it with resolveRange() and shows `error` if any.
export default function RangeFilter({ value, onChange, error }) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="text-xs font-bold uppercase tracking-wider text-ink-400">Period
        <select className="input mt-1 !min-h-10 !w-auto" value={value.preset} onChange={(e) => onChange({ ...value, preset: e.target.value })} aria-label="Date range">
          {RANGE_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
      </label>
      {value.preset === 'custom' ? (
        <>
          <label className="text-xs font-bold uppercase tracking-wider text-ink-400">From<input type="date" className="input mt-1 !min-h-10 !w-auto" value={value.from} onChange={(e) => onChange({ ...value, from: e.target.value })} aria-invalid={Boolean(error)} /></label>
          <label className="text-xs font-bold uppercase tracking-wider text-ink-400">To<input type="date" className="input mt-1 !min-h-10 !w-auto" value={value.to} onChange={(e) => onChange({ ...value, to: e.target.value })} aria-invalid={Boolean(error)} /></label>
        </>
      ) : null}
      {error ? <p className="field-error w-full" role="alert">{error}</p> : null}
    </div>
  )
}
