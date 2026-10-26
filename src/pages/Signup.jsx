import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import AuthShell from '../components/checkout/AuthShell.jsx'
import Field from '../components/checkout/Field.jsx'
import { describedBy } from '../utils/a11y.js'
import PasswordField from '../components/common/PasswordField.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { passwordStrength, validateSignup } from '../utils/validation.js'
import usePageTitle from '../hooks/usePageTitle.js'

const STRENGTH = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong']

export default function Signup() {
  usePageTitle('Sign up — Craveo')
  const { signup, isAuthenticated } = useAuth()
  const { push } = useToast()
  const navigate = useNavigate()
  const from = useLocation().state?.from || '/'
  const [values, setValues] = useState({ name: '', email: '', password: '', confirm: '' })
  const [touched, setTouched] = useState({})
  const [serverError, setServerError] = useState({})
  const [busy, setBusy] = useState(false)

  if (isAuthenticated && !busy) return <Navigate to={from} replace />

  const errors = { ...validateSignup(values), ...serverError }
  const show = (n) => (touched[n] ? errors[n] : serverError[n])
  const bind = (n) => ({
    id: n, value: values[n],
    onChange: (e) => { setValues((v) => ({ ...v, [n]: e.target.value })); setServerError({}) },
    onBlur: () => setTouched((t) => ({ ...t, [n]: true })),
  })
  const strength = passwordStrength(values.password)

  const submit = async (e) => {
    e.preventDefault()
    setTouched({ name: true, email: true, password: true, confirm: true })
    if (Object.keys(validateSignup(values)).length) return
    setBusy(true)
    const res = await signup(values)
    if (!res.ok) { setServerError({ [res.field]: res.message }); setBusy(false); return }
    push(`Welcome to Craveo, ${values.name.trim().split(' ')[0]}!`)
    navigate(from, { replace: true })
  }

  return (
    <AuthShell title="Create your account" subtitle="Save favourites and keep your demo order history.">
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field id="name" label="Full name" error={show('name')}>
          <input autoComplete="name" className="input" aria-invalid={show('name') ? 'true' : 'false'} aria-describedby={describedBy('name', show('name'))} {...bind('name')} />
        </Field>
        <Field id="email" label="Email" error={show('email')}>
          <input type="email" autoComplete="email" inputMode="email" className="input" aria-invalid={show('email') ? 'true' : 'false'} aria-describedby={describedBy('email', show('email'))} {...bind('email')} />
        </Field>
        <Field id="password" label="Password" error={show('password')} hint="At least 8 characters with a letter and a number.">
          <PasswordField autoComplete="new-password" invalid={Boolean(show('password'))} describedBy={describedBy('password', show('password'), true)} {...bind('password')} />
        </Field>
        {values.password ? (
          <div aria-live="polite">
            <div className="flex gap-1.5" aria-hidden="true">{[1, 2, 3, 4].map((n) => <span key={n} className={`h-1.5 flex-1 rounded-full ${n <= strength ? (strength <= 1 ? 'bg-brand-500' : strength === 2 ? 'bg-amber-accent' : 'bg-leaf') : 'bg-cream-200'}`} />)}</div>
            <p className="mt-1 text-xs font-semibold text-ink-500">Password strength: {STRENGTH[strength]}</p>
          </div>
        ) : null}
        <Field id="confirm" label="Confirm password" error={show('confirm')}>
          <PasswordField autoComplete="new-password" invalid={Boolean(show('confirm'))} describedBy={describedBy('confirm', show('confirm'))} {...bind('confirm')} />
        </Field>
        <button type="submit" disabled={busy} className="btn btn-primary w-full !min-h-12">{busy ? 'Creating account…' : 'Create account'}</button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-500">Already have an account? <Link to="/login" state={{ from }} className="font-bold text-brand-600 hover:underline">Log in</Link></p>
    </AuthShell>
  )
}
