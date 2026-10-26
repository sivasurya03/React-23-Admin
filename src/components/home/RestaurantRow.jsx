import { motion } from 'framer-motion'
import SectionHeading from '../common/SectionHeading.jsx'
import RestaurantCard from '../restaurant/RestaurantCard.jsx'
import { staggerParent } from '../common/motionVariants.js'

export default function RestaurantRow({ id, eyebrow, title, subtitle, restaurants, to, linkLabel }) {
  return (
    <section aria-labelledby={id} className="container-page py-10 sm:py-14">
      <SectionHeading id={id} eyebrow={eyebrow} title={title} subtitle={subtitle} to={to} linkLabel={linkLabel} />
      <motion.div variants={staggerParent} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {restaurants.map((r) => <RestaurantCard key={r.id} restaurant={r} />)}
      </motion.div>
    </section>
  )
}
