import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Clock, Search, Sparkles, Star } from 'lucide-react'
import FoodImage from '../common/FoodImage.jsx'
import { poolImage } from '../../data/images.js'
import { useLocationPref } from '../../context/LocationContext.jsx'

const QUICK = ['Pizza', 'Biryani', 'Dosa', 'Burger', 'Coffee']

export default function Hero() {
  const navigate = useNavigate()
  const { location } = useLocationPref()
  const [query, setQuery] = useState('')

  const go = (q) => navigate(q ? `/restaurants?q=${encodeURIComponent(q)}` : '/restaurants')

  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden">
      <div className="pointer-events-none absolute -right-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-brand-100/70 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-amber-accent/15 blur-3xl" aria-hidden="true" />
      <div className="container-page relative grid items-center gap-10 py-10 sm:py-14 lg:grid-cols-[1.05fr_1fr] lg:gap-6 lg:py-20">
        <div>
          <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white px-3.5 py-1.5 text-sm font-bold text-brand-700 shadow-soft">
            <Sparkles className="h-4 w-4" aria-hidden="true" /> Free delivery on orders above ₹399
          </motion.p>
          <motion.h1 id="hero-title" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.08, ease: [0.22, 1, 0.36, 1] }} className="mt-5 text-[2.75rem] font-bold leading-[1.02] sm:text-6xl lg:text-7xl">
            Crave it.<br />
            <span className="text-brand-500">We’ll bring it</span> <span className="italic text-ink-900">hot.</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.16 }} className="mt-5 max-w-lg text-lg leading-relaxed text-ink-500">
            Pizzas, biryanis, dosas and desserts from kitchens you’ll love in {location}. Customise every dish, track every step.
          </motion.p>

          <motion.form
            role="search"
            onSubmit={(e) => { e.preventDefault(); go(query.trim()) }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.24 }}
            className="mt-8 flex max-w-xl flex-col gap-2 rounded-[1.75rem] bg-white p-2 shadow-lift sm:flex-row sm:items-center sm:rounded-full"
          >
            <label htmlFor="hero-search" className="sr-only">Search restaurants, dishes, cuisines or keywords</label>
            <div className="flex min-h-12 flex-1 items-center gap-3 px-4">
              <Search className="h-5 w-5 shrink-0 text-ink-400" aria-hidden="true" />
              <input id="hero-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search biryani, pizza, “dosa”…" autoComplete="off" className="min-w-0 flex-1 bg-transparent text-base font-medium outline-none placeholder:text-ink-400" />
            </div>
            <motion.button whileTap={{ scale: 0.97 }} type="submit" className="btn btn-primary h-12 sm:px-8">Find food</motion.button>
          </motion.form>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-5 flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-ink-500">Popular:</span>
            {QUICK.map((q) => (
              <button key={q} type="button" onClick={() => go(q)} className="rounded-full border border-ink-200 bg-white px-3.5 py-1.5 text-sm font-bold text-ink-700 hover:border-brand-500 hover:text-brand-600">{q}</button>
            ))}
          </motion.div>
        </div>

        <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
          <motion.div initial={{ opacity: 0, scale: 0.94, rotate: 2 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }} className="grid grid-cols-[1.15fr_1fr] grid-rows-2 gap-3 sm:gap-4">
            <FoodImage priority photo={poolImage('pizza', 0)} category="pizza" alt="Wood-fired margherita pizza" width={900} label="Wood-fired pizza" className="row-span-2 aspect-[3/4] rounded-[2rem] shadow-lift sm:rounded-[2.5rem]" />
            <FoodImage priority photo={poolImage('biryani', 0)} category="biryani" alt="Fragrant chicken dum biryani" width={600} label="Dum biryani" className="aspect-square rounded-[2rem] shadow-lift sm:rounded-[2.5rem]" />
            <FoodImage priority photo={poolImage('desserts', 1)} category="desserts" alt="Chocolate dessert slice" width={600} label="Fresh desserts" className="aspect-square rounded-[2rem] shadow-lift sm:rounded-[2.5rem]" />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="absolute -left-2 bottom-8 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-lift sm:-left-6">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><Clock className="h-5 w-5" aria-hidden="true" /></span>
            <span><span className="block text-sm font-extrabold">~28 min</span><span className="block text-xs text-ink-500">average delivery</span></span>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.85 }} className="absolute -top-3 right-2 flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-lift sm:right-0">
            <Star className="h-5 w-5 fill-amber-accent text-amber-accent" aria-hidden="true" />
            <span><span className="block text-sm font-extrabold">4.6 avg rating</span><span className="block text-xs text-ink-500">16 demo kitchens</span></span>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
