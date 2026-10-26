import { createPortal } from 'react-dom'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Heart, LogOut, Receipt, ShieldCheck, ShoppingBag, X } from 'lucide-react'
import Logo from '../common/Logo.jsx'
import LocationMenu from './LocationMenu.jsx'
import useModalBehavior from '../../hooks/useModalBehavior.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { useCart } from '../../context/CartContext.jsx'
import { useWishlist } from '../../context/WishlistContext.jsx'
import { NAV_LINKS } from './navLinks.js'

export default function MobileDrawer({ onClose }) {
  const ref = useModalBehavior(true, onClose)
  const { user, isAuthenticated, logout } = useAuth()
  const { push } = useToast()
  const { itemCount } = useCart()
  const { count } = useWishlist()
  const navigate = useNavigate()

  const linkCls = ({ isActive }) => `flex min-h-12 items-center rounded-2xl px-4 text-base font-bold ${isActive ? 'bg-brand-50 text-brand-600' : 'text-ink-900 hover:bg-cream-100'}`

  return createPortal(
    <div className="fixed inset-0 z-[75] lg:hidden">
      <motion.div className="absolute inset-0 bg-ink-900/55" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} aria-hidden="true" />
      <motion.aside
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
        initial={{ x: '-100%' }}
        animate={{ x: 0 }}
        exit={{ x: '-100%', transition: { duration: 0.2, ease: 'easeIn' } }}
        transition={{ type: 'tween', ease: [0.22, 1, 0.36, 1], duration: 0.3 }}
        className="relative flex h-full w-[86%] max-w-sm flex-col bg-cream-50 shadow-lift"
      >
        <div className="flex h-16 items-center justify-between px-4">
          <Logo />
          <button type="button" onClick={onClose} className="inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-cream-200" aria-label="Close menu">
            <X className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 space-y-6 overflow-y-auto px-4 pb-8 pt-2">
          <LocationMenu compact />
          <nav aria-label="Mobile primary" className="space-y-1">
            {NAV_LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} onClick={onClose} className={linkCls}>{l.label}</NavLink>
            ))}
            <NavLink to="/wishlist" onClick={onClose} className={linkCls}>
              <Heart className="mr-2 h-5 w-5" aria-hidden="true" />Wishlist
              {count ? <span className="ml-auto badge bg-brand-500 text-white">{count}</span> : null}
            </NavLink>
            <NavLink to="/cart" onClick={onClose} className={linkCls}>
              <ShoppingBag className="mr-2 h-5 w-5" aria-hidden="true" />Cart
              {itemCount ? <span className="ml-auto badge bg-brand-500 text-white">{itemCount}</span> : null}
            </NavLink>
            <NavLink to="/help" onClick={onClose} className={linkCls}>Help &amp; FAQs</NavLink>
            <NavLink to="/admin/login" onClick={onClose} className={linkCls}>
              <ShieldCheck className="mr-2 h-5 w-5 text-brand-500" aria-hidden="true" />Admin Panel
              <span className="ml-auto badge bg-cream-200 text-ink-700">Demo</span>
            </NavLink>
          </nav>
          <div className="border-t border-ink-200 pt-5">
            {isAuthenticated ? (
              <div className="space-y-3">
                <div className="rounded-2xl bg-white p-4 shadow-soft">
                  <p className="font-bold">{user.name}</p>
                  <p className="truncate text-sm text-ink-500">{user.email}</p>
                  <span className="badge mt-2 bg-cream-100 text-ink-700">Demo session</span>
                </div>
                <Link to="/orders" onClick={onClose} className="btn btn-ghost w-full"><Receipt className="h-4 w-4" aria-hidden="true" />My orders</Link>
                <button
                  type="button"
                  className="btn btn-dark w-full"
                  onClick={() => {
                    logout()
                    onClose()
                    push('You have been logged out', { type: 'info' })
                    navigate('/')
                  }}
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />Log out
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Link to="/login" onClick={onClose} className="btn btn-ghost">Log in</Link>
                <Link to="/signup" onClick={onClose} className="btn btn-primary">Sign up</Link>
              </div>
            )}
          </div>
        </div>
      </motion.aside>
    </div>,
    document.body,
  )
}
