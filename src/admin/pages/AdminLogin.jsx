import { useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, Lock } from 'lucide-react'
import { useAdmin } from '../context/adminContextValue.js'
import { TextField, Field, Alert } from '../components/ui.jsx'
import PasswordField from '../../components/common/PasswordField.jsx'
import { DEMO_CREDENTIALS } from '../store/demoCredentials.js'
import usePageTitle from '../../hooks/usePageTitle.js'
import { isValidEmail } from '../../utils/validation.js'

export default function AdminLogin() {
  usePageTitle('Admin sign in — Craveo')
  const { isAuthenticated, login, demoEnabled } = useAdmin()
  const navigate = useNavigate()
  const location = useLocation()
  const [values, setValues] = useState({ email: '', password: '' })
  const [selected, setSelected] = useState(null)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const formRef = useRef(null)
  const target = location.state?.from && location.state.from.startsWith('/admin') ? location.state.from : '/admin'
  if (isAuthenticated) return <Navigate to={target} replace />

  const pick = (account) => {
    setSelected(account.role)
    setValues({ email: account.email, password: account.password })
    setErrors({})
    formRef.current?.scrollIntoView({ block: 'nearest', behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }

  const edit = (key) => (e) => {
    setValues({ ...values, [key]: e.target.value })
    setSelected(null) // typing means this is no longer the untouched demo preset
    setErrors({})
  }

  const submit = async (e) => {
    e.preventDefault()
    const next = {}
    if (!isValidEmail(values.email)) next.email = 'Enter a valid admin email.'
    if (!values.password) next.password = 'Enter your password.'
    setErrors(next)
    if (Object.keys(next).length) return
    setBusy(true)
    const res = await login(values.email, values.password)
    setBusy(false)
    if (!res.ok) { setErrors({ form: res.error }); return }
    navigate(target, { replace: true })
  }

  const chosen = DEMO_CREDENTIALS.find((a) => a.role === selected)

  return (
    <div className="flex min-h-dvh items-center justify-center bg-cream-100 px-4 py-10">
      <div className="w-full max-w-xl">
        <Link to="/" className="mb-4 inline-flex min-h-10 items-center gap-1.5 rounded-full text-sm font-bold text-ink-700 hover:text-brand-600"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Back to Craveo</Link>
        <div className="card p-6 sm:p-8">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500 text-white"><Lock className="h-6 w-6" aria-hidden="true" /></span>
          <h1 className="mt-4 text-3xl font-bold">Admin sign in</h1>
          <p className="mt-1 text-sm text-ink-500">Sign in with an admin account. Customer accounts cannot sign in here.</p>

          <form ref={formRef} onSubmit={submit} noValidate className="mt-6 space-y-4">
            {chosen ? <p className="rounded-xl bg-brand-50 px-3 py-2 text-sm font-bold text-brand-700" role="status">Selected role: {chosen.label} (demo account)</p> : null}
            {errors.form ? <Alert tone="bad">{errors.form}</Alert> : null}
            <TextField label="Email" type="email" autoComplete="username" value={values.email} onChange={edit('email')} error={errors.email} />
            <Field label="Password" htmlFor="admin-password" error={errors.password}>
              <PasswordField id="admin-password" value={values.password} onChange={edit('password')} invalid={Boolean(errors.password)} autoComplete="current-password" />
            </Field>
            <button type="submit" className="btn btn-primary w-full" disabled={busy}>{busy ? 'Signing in…' : chosen ? `Sign in as ${chosen.label}` : 'Sign in'}</button>
          </form>

          {demoEnabled ? (
            <section className="mt-8 border-t border-ink-200/70 pt-6" aria-labelledby="demo-accounts">
              <h2 id="demo-accounts" className="text-sm font-extrabold uppercase tracking-wider text-ink-500">Demo accounts <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] text-amber-900">Training only</span></h2>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {DEMO_CREDENTIALS.map((a) => {
                  const on = selected === a.role
                  return (
                    <li key={a.role}>
                      <button type="button" onClick={() => pick(a)} aria-pressed={on}
                        className={`flex h-full w-full items-start gap-2 rounded-2xl border px-3 py-2.5 text-left transition-colors ${on ? 'border-brand-500 bg-brand-50' : 'border-ink-200 bg-white hover:border-brand-500'}`}>
                        <span className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${on ? 'border-brand-500 bg-brand-500 text-white' : 'border-ink-200'}`} aria-hidden="true">{on ? <Check className="h-3 w-3" /> : null}</span>
                        <span className="min-w-0"><span className="block font-bold">{a.label}</span><span className="block break-all text-xs text-ink-500">{a.email}</span><span className="block text-xs text-ink-400">{a.blurb}</span></span>
                      </button>
                    </li>
                  )
                })}
              </ul>
              <p className="mt-2 text-xs text-ink-400">Selecting a card fills the email and password above. Use the eye icon to reveal the password, then press Sign in.</p>
            </section>
          ) : null}

          <div className="mt-5 space-y-2 text-xs font-semibold">
            {demoEnabled ? <p className="rounded-xl bg-amber-50 p-3 text-amber-900">Demo accounts are checked in your browser and are <strong>not secure</strong>. They are for training only and give access to demo data.</p> : null}
            <p className="rounded-xl bg-cream-100 p-3 text-ink-700">Real admin accounts (any other email) are verified on the server and need backend configuration. If it isn’t set up, you’ll see a message saying so — nothing is ever accepted without verification.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
