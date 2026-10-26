export default function Field({ id, label, error, hint, required = true, children }) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}{required ? <span className="text-brand-600" aria-hidden="true"> *</span> : <span className="font-medium text-ink-400"> (optional)</span>}
      </label>
      {children}
      {hint && !error ? <p id={`${id}-hint`} className="mt-1 text-xs text-ink-400">{hint}</p> : null}
      {error ? <p id={`${id}-error`} role="alert" className="field-error">{error}</p> : null}
    </div>
  )
}
