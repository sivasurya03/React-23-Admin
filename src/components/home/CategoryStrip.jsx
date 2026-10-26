import { motion } from 'framer-motion'
import SectionHeading from '../common/SectionHeading.jsx'
import CategoryTile from '../restaurant/CategoryTile.jsx'
import { staggerParent } from '../common/motionVariants.js'
import { CATEGORIES } from '../../data/index.js'

export default function CategoryStrip() {
  return (
    <section aria-labelledby="cat-title" className="container-page py-10 sm:py-14">
      <SectionHeading id="cat-title" eyebrow="Browse" title="What are you craving?" to="/restaurants" linkLabel="All restaurants" />
      <motion.ul variants={staggerParent} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }} className="no-scrollbar -mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:justify-between sm:overflow-visible sm:px-0">
        {CATEGORIES.map((c) => (
          <li key={c.id} className="shrink-0"><CategoryTile category={c} /></li>
        ))}
      </motion.ul>
    </section>
  )
}
