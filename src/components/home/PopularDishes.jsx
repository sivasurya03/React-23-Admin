import { motion } from 'framer-motion'
import SectionHeading from '../common/SectionHeading.jsx'
import DishCard from '../menu/DishCard.jsx'
import { staggerParent } from '../common/motionVariants.js'
import { popularDishes } from '../../data/index.js'

export default function PopularDishes() {
  return (
    <section aria-labelledby="dishes-title" className="bg-cream-100/70 py-12 sm:py-16">
      <div className="container-page">
        <SectionHeading id="dishes-title" eyebrow="Bestsellers" title="Popular dishes right now" subtitle="Add straight to your cart — customise sizes and extras where you see the badge." to="/restaurants" linkLabel="Explore menus" />
        <motion.div variants={staggerParent} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {popularDishes.map((d) => <DishCard key={`${d.restaurantId}-${d.id}`} dish={d} />)}
        </motion.div>
      </div>
    </section>
  )
}
