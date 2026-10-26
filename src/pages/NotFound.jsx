import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { PlateIllustration } from '../components/common/EmptyState.jsx'
import usePageTitle from '../hooks/usePageTitle.js'

export default function NotFound() {
  usePageTitle('Page not found — Craveo')
  return (
    <div className="container-page flex flex-col items-center py-16 text-center sm:py-24">
      <motion.div initial={{ rotate: -8, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 160, damping: 14 }}><PlateIllustration className="h-40 w-40" /></motion.div>
      <p className="mt-6 font-display text-7xl font-bold text-brand-500">404</p>
      <h1 className="mt-2 text-3xl font-bold sm:text-4xl">This plate is empty</h1>
      <p className="mt-3 max-w-md text-ink-500">The page you’re looking for doesn’t exist or has moved. Let’s get you back to the good stuff.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/" className="btn btn-primary">Back to home</Link>
        <Link to="/restaurants" className="btn btn-ghost">Browse restaurants</Link>
      </div>
    </div>
  )
}
