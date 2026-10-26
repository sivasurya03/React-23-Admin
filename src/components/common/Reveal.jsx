import { motion } from 'framer-motion'

// Scroll-triggered fade/slide. MotionConfig(reducedMotion="user") at the app root
// removes the transform for users who prefer reduced motion.
export default function Reveal({ children, delay = 0, y = 24, className = '', as = 'div' }) {
  const Tag = motion[as] ?? motion.div
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </Tag>
  )
}
