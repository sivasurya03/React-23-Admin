import { Suspense } from 'react'
import { useLocation, useOutlet } from 'react-router-dom'
import { motion } from 'framer-motion'
import ToastViewport from '../common/ToastViewport.jsx'

function AuthSkeleton() {
  return (
    <div className="container-page py-10" role="status" aria-label="Loading">
      <div className="mx-auto h-[28rem] max-w-md animate-pulse rounded-3xl bg-cream-200" />
    </div>
  )
}

// Dedicated layout for /login, /signup and /forgot-password. It deliberately renders
// NO main Navbar, Footer, cart dialogs or other shopping chrome — only the page itself
// and the toast viewport. Being a route-level layout (not CSS hiding), it behaves the
// same on direct loads, refreshes and in-app navigation.
export default function AuthLayout() {
  const { pathname } = useLocation()
  const outlet = useOutlet()
  return (
    <div className="flex min-h-dvh flex-col bg-cream-50">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-ink-900 focus:px-4 focus:py-2 focus:text-white">
        Skip to content
      </a>
      <main id="main" className="flex-1" tabIndex={-1}>
        {/* Keyed by route; no exit animation, so the previous form is replaced in one frame. */}
        <motion.div key={pathname} initial={{ opacity: 0.4, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }}>
          <Suspense fallback={<AuthSkeleton />}>{outlet}</Suspense>
        </motion.div>
      </main>
      <ToastViewport />
    </div>
  )
}
