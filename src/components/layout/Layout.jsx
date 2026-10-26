import { Suspense, useEffect } from 'react'
import { useLocation, useOutlet } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Navbar from './Navbar.jsx'
import Footer from './Footer.jsx'
import CartConflictDialog from './CartConflictDialog.jsx'
import ToastViewport from '../common/ToastViewport.jsx'

function PageSkeleton() {
  return (
    <div className="container-page py-12" role="status" aria-label="Loading page">
      <div className="h-10 w-64 animate-pulse rounded-xl bg-cream-200" />
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((n) => <div key={n} className="h-64 animate-pulse rounded-3xl bg-cream-200" />)}
      </div>
    </div>
  )
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname])
  return null
}

// Short fade/slide between routes. mode="wait" with a brief exit means the old page
// is always replaced by the new one — there is never an empty frame left on screen.
export default function Layout() {
  const location = useLocation()
  // useOutlet() returns an element captured at render time, so the exiting page keeps
  // showing its own content (a bare <Outlet /> would already render the new route).
  const outlet = useOutlet()
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-ink-900 focus:px-4 focus:py-2 focus:text-white">
        Skip to content
      </a>
      <ScrollToTop />
      <Navbar />
      <main id="main" className="flex-1" tabIndex={-1}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <Suspense fallback={<PageSkeleton />}>{outlet}</Suspense>
          </motion.div>
        </AnimatePresence>
      </main>
      <Footer />
      <CartConflictDialog />
      <ToastViewport />
    </div>
  )
}
