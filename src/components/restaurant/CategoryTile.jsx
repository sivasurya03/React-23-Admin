import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import FoodImage from '../common/FoodImage.jsx'
import { staggerChild } from '../common/motionVariants.js'

export default function CategoryTile({ category }) {
  return (
    <motion.div variants={staggerChild} whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 400, damping: 28 }} className="shrink-0 snap-start">
      <Link to={`/restaurants?cuisine=${category.id}`} className="group flex w-28 flex-col items-center gap-3 rounded-3xl p-2 text-center sm:w-32" aria-label={`Browse ${category.name} restaurants`}>
        <FoodImage
          photo={category.photo}
          category={category.id}
          alt={`${category.name} dish`}
          width={320}
          className="h-24 w-24 rounded-full ring-4 ring-white shadow-soft sm:h-28 sm:w-28"
          imgClassName="transition-transform duration-500 group-hover:scale-110"
        />
        <span>
          <span className="block text-sm font-extrabold">{category.name}</span>
          <span className="block text-xs text-ink-500">{category.blurb}</span>
        </span>
      </Link>
    </motion.div>
  )
}
