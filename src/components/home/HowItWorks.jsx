import { motion } from 'framer-motion'
import { Bike, CreditCard, MapPin, UtensilsCrossed } from 'lucide-react'
import SectionHeading from '../common/SectionHeading.jsx'
import { staggerChild, staggerParent } from '../common/motionVariants.js'
import { HOW_IT_WORKS } from '../../data/index.js'

const ICONS = { MapPin, UtensilsCrossed, CreditCard, Bike }

export default function HowItWorks() {
  return (
    <section aria-labelledby="how-title" className="container-page py-10 sm:py-14">
      <SectionHeading id="how-title" eyebrow="How it works" title="From craving to doorstep in four steps" />
      <motion.ol variants={staggerParent} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {HOW_IT_WORKS.map((s, i) => {
          const Icon = ICONS[s.icon]
          return (
            <motion.li key={s.title} variants={staggerChild} className="card relative p-6">
              <span className="absolute right-5 top-4 font-display text-5xl font-bold text-cream-200" aria-hidden="true">{i + 1}</span>
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600"><Icon className="h-6 w-6" aria-hidden="true" /></span>
              <h3 className="mt-5 font-sans text-lg font-extrabold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-500">{s.body}</p>
            </motion.li>
          )
        })}
      </motion.ol>
    </section>
  )
}
