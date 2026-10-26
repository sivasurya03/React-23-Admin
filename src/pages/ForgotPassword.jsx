import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, MailCheck } from 'lucide-react'
import AuthShell from '../components/checkout/AuthShell.jsx'
import Field from '../components/checkout/Field.jsx'
import { describedBy } from '../utils/a11y.js'
import { validateForgotPassword } from '../utils/validation.js'
import usePageTitle from '../hooks/usePageTitle.js'

// FRONTEND DEMO ONLY. There is no server, so no reset email is ever sent and no
// password is ever changed here. The page validates the address, simulates a short
// request, and then says plainly what a real app would do. It deliberately does not
// reveal whether an account exists for the address.
export default function ForgotPassword() {
  usePageTitle('Forgot password — Craveo')
  const [email, setEmail] = useState('')
  const [touched, setTouched] = useState(false)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const timer = useRef(null)
  const headingRef = useRef(null)

  useEffect(() => () => clearTimeout(timer.current), [])
  useEffect(() => { if (done) headingRef.current?.focus() }, [done])

  const error = touched ? validateForgotPassword({ email }).email : undefined

  const submit = (e) => {
    e.preventDefault()
    setTouched(true)
    if (busy || Object.keys(validateForgotPassword({ email })).length) return
    setBusy(true)
    timer.current = setTimeout(() => { setBusy(false); setDone(true) }, 900)
  }

  return (
    <AuthShell title="Forgot your password?" subtitle="Enter the email you signed up with and we’ll show you how recovery works in this demo.">
      <AnimatePresence mode="wait" initial={false}>
        {done ? (
          <motion.div key="done" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} role="status" aria-live="polite">
            <div className="flex items-start gap-3 rounded-2xl bg-leaf/10 p-4">
              <MailCheck className="mt-0.5 h-6 w-6 shrink-0 text-leaf" aria-hidden="true" />
              <div>
                <h2 ref={headingRef} tabIndex={-1} className="font-sans text-lg font-extrabold outline-none">Demo request received</h2>
                <p className="mt-1 text-sm leading-relaxed text-ink-700">
                  <strong>No email was sent.</strong> Craveo is a frontend demo with no backend or email service, so your password cannot be reset from here and nothing was changed for <span className="break-all font-bold">{email.trim()}</span>.
                </p>
                <p className="mt-2 text-sm leading-relaxed text-ink-500">
                  In a real app this step would email a single-use, expiring reset link. To keep going in the demo, create a new account with a different email, or use “Continue as demo guest” on the login page.
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Link to="/login" className="btn btn-primary w-full">Back to log in</Link>
              <Link to="/signup" className="btn btn-ghost w-full">Create a new account</Link>
            </div>
          </motion.div>
        ) : (
          <motion.form key="form" onSubmit={submit} noValidate initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="space-y-4">
            <Field id="email" label="Registered email" error={error}>
              <input
                id="email" name="email" type="email" autoComplete="email" inputMode="email" className="input"
                value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => setTouched(true)}
                aria-invalid={error ? 'true' : 'false'} aria-describedby={describedBy('email', error)}
              />
            </Field>
            <button type="submit" disabled={busy} className="btn btn-primary w-full !min-h-12">{busy ? 'Checking…' : 'Send reset link (demo)'}</button>
            <p className="text-center text-sm">
              <Link to="/login" className="inline-flex items-center gap-1.5 font-bold text-brand-600 hover:underline"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Back to log in</Link>
            </p>
          </motion.form>
        )}
      </AnimatePresence>
    </AuthShell>
  )
}
