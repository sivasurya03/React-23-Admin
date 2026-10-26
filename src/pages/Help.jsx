import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { FAQS } from '../data/index.js'
import usePageTitle from '../hooks/usePageTitle.js'

export default function Help() {
  usePageTitle('Help & FAQs — Craveo')
  const [open, setOpen] = useState(0)
  return (
    <div className="container-page max-w-3xl py-10 sm:py-14">
      <h1 className="text-4xl font-bold sm:text-5xl">Help &amp; FAQs</h1>
      <p className="mt-3 text-ink-500">Answers about how this demo works. Craveo is a portfolio project — there is no real support team.</p>
      <ul className="mt-8 space-y-3">
        {FAQS.map((f, i) => {
          const isOpen = open === i
          return (
            <li key={f.q} className="card overflow-hidden">
              <h2 className="font-sans">
                <button type="button" aria-expanded={isOpen} aria-controls={`faq-${i}`} id={`faq-btn-${i}`} onClick={() => setOpen(isOpen ? -1 : i)} className="flex min-h-14 w-full items-center justify-between gap-4 px-5 py-3 text-left text-base font-extrabold">
                  {f.q}<ChevronDown className={`h-5 w-5 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                </button>
              </h2>
              <AnimatePresence initial={false}>
                {isOpen ? (
                  <motion.div id={`faq-${i}`} role="region" aria-labelledby={`faq-btn-${i}`} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                    <p className="px-5 pb-5 text-ink-500">{f.a}</p>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
