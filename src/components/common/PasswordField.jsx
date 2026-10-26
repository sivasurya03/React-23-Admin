import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export default function PasswordField({ id, value, onChange, onBlur, invalid, describedBy, autoComplete, placeholder }) {
  const [shown, setShown] = useState(false)
  return (
    <div className="relative">
      <input
        id={id}
        name={id}
        type={shown ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-invalid={invalid ? 'true' : 'false'}
        aria-describedby={describedBy}
        className="input pr-12"
      />
      <button type="button" onClick={() => setShown((s) => !s)} aria-label={shown ? 'Hide password' : 'Show password'} aria-pressed={shown} className="absolute right-1.5 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-ink-500 hover:bg-cream-200">
        {shown ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
      </button>
    </div>
  )
}
