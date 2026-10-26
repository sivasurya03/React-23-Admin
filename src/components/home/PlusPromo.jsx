import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check, Crown } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import Reveal from '../common/Reveal.jsx'

export default function PlusPromo() {
  const { isAuthenticated, isPlus, togglePlus } = useAuth()
  const { push } = useToast()
  return (
    <section aria-labelledby="plus-title" className="container-page py-10 sm:py-14">
      <Reveal>
        <div className="relative overflow-hidden rounded-[2rem] bg-ink-900 px-6 py-10 text-white sm:px-12 sm:py-14">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-brand-500/30 blur-3xl" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-amber-accent/20 blur-3xl" aria-hidden="true" />
          <div className="relative grid items-center gap-8 lg:grid-cols-[1.3fr_1fr]">
            <div>
              <span className="badge bg-amber-accent/20 text-amber-300"><Crown className="h-3.5 w-3.5" aria-hidden="true" />Craveo Plus · demo membership</span>
              <h2 id="plus-title" className="mt-4 text-3xl font-bold leading-tight sm:text-5xl">Free delivery, every time you order.</h2>
              <p className="mt-4 max-w-lg text-white/70">Join the demo Plus plan to see how a membership changes your totals. No payment is taken — it’s a toggle stored in your browser.</p>
            </div>
            <div className="rounded-3xl bg-white/8 p-6 ring-1 ring-white/15">
              <ul className="space-y-3 text-sm font-semibold">
                <li className="flex items-center gap-2.5"><Check className="h-5 w-5 text-emerald-400" aria-hidden="true" />Delivery fee waived at checkout</li>
                <li className="flex items-center gap-2.5"><Check className="h-5 w-5 text-emerald-400" aria-hidden="true" />Works with every restaurant</li>
                <li className="flex items-center gap-2.5"><Check className="h-5 w-5 text-emerald-400" aria-hidden="true" />Plus badge on your profile</li>
              </ul>
              <div className="mt-6">
                {isAuthenticated ? (
                  <motion.button whileTap={{ scale: 0.97 }} type="button" className="btn btn-primary w-full" onClick={() => { togglePlus(); push(isPlus ? 'Craveo Plus turned off (demo)' : 'Craveo Plus is on — delivery fees are waived (demo)', { type: 'info' }) }}>
                    {isPlus ? 'Leave Plus (demo)' : 'Join Plus — free demo'}
                  </motion.button>
                ) : (
                  <Link to="/signup" className="btn btn-primary w-full">Sign up to join Plus</Link>
                )}
                <p className="mt-3 text-center text-xs text-white/50">{isPlus ? 'You’re a Plus member in this demo.' : 'Demo only — nothing is charged.'}</p>
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  )
}
