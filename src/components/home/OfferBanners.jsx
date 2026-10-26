import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Copy } from 'lucide-react'
import { OFFER_BANNERS } from '../../data/index.js'
import { staggerChild, staggerParent } from '../common/motionVariants.js'
import { useToast } from '../../context/ToastContext.jsx'

export default function OfferBanners() {
  const { push } = useToast()
  const copy = async (code) => {
    try {
      await navigator.clipboard.writeText(code)
      push(`${code} copied — paste it in your cart`)
    } catch {
      push(`Your code is ${code}. Enter it in your cart.`, { type: 'info' })
    }
  }
  return (
    <section aria-label="Offers" className="container-page py-6 sm:py-10">
      <motion.ul variants={staggerParent} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }} className="grid gap-4 md:grid-cols-3">
        {OFFER_BANNERS.map((o) => (
          <motion.li key={o.id} variants={staggerChild} whileHover={{ y: -4 }} className={`relative flex flex-col overflow-hidden rounded-[1.75rem] bg-gradient-to-br p-6 shadow-soft ${o.tone} ${o.dark ? 'text-white' : 'text-ink-900'}`}>
            <span className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" aria-hidden="true" />
            <p className={`text-xs font-bold uppercase tracking-[0.14em] ${o.dark ? 'text-white/75' : 'text-brand-600'}`}>{o.eyebrow}</p>
            <h3 className="mt-2 text-2xl font-bold leading-tight">{o.title}</h3>
            <p className={`mt-2 text-sm leading-relaxed ${o.dark ? 'text-white/80' : 'text-ink-500'}`}>{o.body}</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link to={o.to} className={`btn btn-sm ${o.dark ? 'bg-white text-ink-900 hover:bg-cream-100' : 'btn-dark'}`}>{o.cta}</Link>
              <button type="button" onClick={() => copy(o.code)} className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border border-dashed px-3.5 text-xs font-extrabold tracking-wider ${o.dark ? 'border-white/60 text-white hover:bg-white/10' : 'border-ink-400 text-ink-900 hover:bg-white'}`} aria-label={`Copy coupon code ${o.code}`}>
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />{o.code}
              </button>
            </div>
          </motion.li>
        ))}
      </motion.ul>
    </section>
  )
}
