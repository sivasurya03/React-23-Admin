import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import AuthShell from '../components/checkout/AuthShell.jsx'
import Field from '../components/checkout/Field.jsx'
import { describedBy } from '../utils/a11y.js'
import PasswordField from '../components/common/PasswordField.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { validateLogin } from '../utils/validation.js'
import usePageTitle from '../hooks/usePageTitle.js'

export default function Login() {
  usePageTitle('Log in — Craveo')
  const { login, loginDemo, isAuthenticated } = useAuth()
  const { push } = useToast()
  const navigate = useNavigate()
  const from = useLocation().state?.from || '/'
  const [values, setValues] = useState({ email: '', password: '' })
  const [touched, setTouched] = useState({})
  const [serverError, setServerError] = useState({})
  const [busy, setBusy] = useState(false)

  if (isAuthenticated && !busy) return <Navigate to={from} replace />

  const errors = { ...validateLogin(values), ...serverError }
  const show = (n) => (touched[n] ? errors[n] : serverError[n])
  const bind = (n) => ({
    id: n, value: values[n],
    onChange: (e) => { setValues((v) => ({ ...v, [n]: e.target.value })); setServerError({}) },
    onBlur: () => setTouched((t) => ({ ...t, [n]: true })),
  })

  const submit = async (e) => {
    e.preventDefault()
    setTouched({ email: true, password: true })
    const local = validateLogin(values)
    if (Object.keys(local).length) return
    setBusy(true)
    const res = await login(values)
    if (!res.ok) { setServerError({ [res.field]: res.message }); setBusy(false); return }
    push('Welcome back!')
    navigate(from, { replace: true })
  }

  return (
    <AuthShell title="Welcome back" subtitle="Log in to see your orders and favourites.">
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field id="email" label="Email" error={show('email')}>
          <input type="email" autoComplete="email" inputMode="email" className="input" aria-invalid={show('email') ? 'true' : 'false'} aria-describedby={describedBy('email', show('email'))} {...bind('email')} />
        </Field>
        <Field id="password" label="Password" error={show('password')}>
          <PasswordField autoComplete="current-password" invalid={Boolean(show('password'))} describedBy={describedBy('password', show('password'))} {...bind('password')} />
        </Field>
        <div className="-mt-1 text-right"><Link to="/forgot-password" className="text-sm font-bold text-brand-600 hover:underline">Forgot password?</Link></div>
        <button type="submit" disabled={busy} className="btn btn-primary w-full !min-h-12">{busy ? 'Logging in…' : 'Log in'}</button>
      </form>
      <div className="my-5 flex items-center gap-3 text-xs font-bold uppercase tracking-wider text-ink-400"><span className="h-px flex-1 bg-ink-200" />or<span className="h-px flex-1 bg-ink-200" /></div>
      <button type="button" className="btn btn-ghost w-full" onClick={() => { loginDemo(); push('Signed in as Demo Guest'); navigate(from, { replace: true }) }}>Continue as demo guest</button>
      <p className="mt-6 text-center text-sm text-ink-500">New to Craveo? <Link to="/signup" state={{ from }} className="font-bold text-brand-600 hover:underline">Create an account</Link></p>
    </AuthShell>
  )
}
