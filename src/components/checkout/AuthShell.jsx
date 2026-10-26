import { Link } from 'react-router-dom'
import { ArrowLeft, Info } from 'lucide-react'
import FoodImage from '../common/FoodImage.jsx'
import Logo from '../common/Logo.jsx'
import { poolImage } from '../../data/images.js'

export default function AuthShell({ title, subtitle, children }) {
  return (
    <div className="container-page flex min-h-dvh items-center py-6 sm:py-10">
      <div className="card mx-auto grid w-full max-w-5xl overflow-hidden lg:grid-cols-2">
        <div className="relative hidden lg:block">
          <FoodImage photo={poolImage('biryani', 0)} category="biryani" alt="Steaming plate of biryani" width={900} priority className="absolute inset-0 h-full w-full" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-900/80 via-ink-900/20 to-transparent" aria-hidden="true" />
          <div className="absolute inset-x-0 bottom-0 p-8 text-white">
            <Logo light />
            <p className="mt-4 font-display text-3xl font-bold leading-tight">Good food, a few taps away.</p>
          </div>
        </div>
        <div className="p-6 sm:p-10">
          <div className="mb-6 flex items-center justify-between gap-3 lg:justify-end">
            <span className="lg:hidden"><Logo /></span>
            <Link to="/" className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-bold text-ink-500 hover:bg-cream-200 hover:text-ink-900">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />Back to Home
            </Link>
          </div>
          <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
          <p className="mt-2 text-ink-500">{subtitle}</p>
          <p className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-900"><Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />Demo authentication: accounts live only in this browser. Don’t reuse a real password.</p>
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  )
}
