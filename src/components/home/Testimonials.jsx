import { motion } from 'framer-motion'
import { Quote } from 'lucide-react'
import SectionHeading from '../common/SectionHeading.jsx'
import { Stars } from '../common/Rating.jsx'
import { staggerChild, staggerParent } from '../common/motionVariants.js'
import { TESTIMONIALS } from '../../data/index.js'

export default function Testimonials() {
  return (
    <section aria-labelledby="love-title" className="container-page py-10 sm:py-14">
      <SectionHeading id="love-title" eyebrow="Loved by foodies" title="Kind words from our (fictional) customers" subtitle="Sample reviews written for this demo." />
      <motion.ul variants={staggerParent} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }} className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {TESTIMONIALS.map((t) => (
          <motion.li key={t.id} variants={staggerChild} className="card flex flex-col p-6">
            <Quote className="h-6 w-6 text-brand-100" aria-hidden="true" fill="currentColor" />
            <p className="mt-3 flex-1 text-[15px] leading-relaxed text-ink-700">{t.text}</p>
            <div className="mt-5 flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-full text-base font-extrabold text-white" style={{ background: t.color }} aria-hidden="true">{t.name.charAt(0)}</span>
              <div>
                <p className="text-sm font-extrabold">{t.name}</p>
                <p className="text-xs text-ink-500">{t.city}</p>
              </div>
              <div className="ml-auto"><Stars value={t.rating} size="h-3.5 w-3.5" /></div>
            </div>
          </motion.li>
        ))}
      </motion.ul>
    </section>
  )
}
