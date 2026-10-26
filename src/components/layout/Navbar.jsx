import { useCallback, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Heart, LogOut, Menu, Receipt, Search, ShieldCheck, ShoppingBag, User, Crown } from 'lucide-react'
import Logo from '../common/Logo.jsx'
import LocationMenu from './LocationMenu.jsx'
import SearchOverlay from './SearchOverlay.jsx'
import MobileDrawer from './MobileDrawer.jsx'
import { NAV_LINKS } from './navLinks.js'
import { useCart } from '../../context/CartContext.jsx'
import { useWishlist } from '../../context/WishlistContext.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import useClickOutside from '../../hooks/useClickOutside.js'

function CountBadge({ count }) {
  return (
    <AnimatePresence initial={false}>
      {count > 0 ? (
        <motion.span
          key="badge"
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.4, opacity: 0 }}
          className="absolute -right-0.5 -top-0.5 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1 text-[11px] font-extrabold leading-none text-white ring-2 ring-cream-50"
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span key={count} initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -8, opacity: 0 }} transition={{ duration: 0.15 }} aria-hidden="true">
              {count > 99 ? '99+' : count}
            </motion.span>
          </AnimatePresence>
        </motion.span>
      ) : null}
    </AnimatePresence>
  )
}

function ProfileMenu() {
  const { user, logout, isPlus } = useAuth()
  const { push } = useToast()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const close = useCallback(() => setOpen(false), [])
  useClickOutside(ref, close, open)
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} className="inline-flex h-10 items-center gap-2 rounded-full border border-ink-200 bg-white pl-1 pr-3 text-sm font-bold hover:border-ink-900">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-sm font-extrabold text-white" aria-hidden="true">{user.name.trim().charAt(0).toUpperCase()}</span>
        <span className="max-w-24 truncate">{user.name.split(' ')[0]}</span>
        <span className="sr-only">Account menu</span>
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div role="menu" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }} className="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border border-ink-200 bg-white p-2 shadow-lift">
            <div className="px-3 pb-2 pt-2">
              <p className="truncate font-bold">{user.name}</p>
              <p className="truncate text-xs text-ink-500">{user.email}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="badge bg-cream-100 text-ink-700">Demo session</span>
                {isPlus ? <span className="badge bg-amber-accent/20 text-amber-800"><Crown className="h-3 w-3" aria-hidden="true" />Plus</span> : null}
              </div>
            </div>
            <Link role="menuitem" to="/orders" onClick={close} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-cream-100"><Receipt className="h-4 w-4" aria-hidden="true" />My orders</Link>
            <Link role="menuitem" to="/wishlist" onClick={close} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-cream-100"><Heart className="h-4 w-4" aria-hidden="true" />Wishlist</Link>
            <button
              role="menuitem"
              type="button"
              onClick={() => {
                logout()
                close()
                push('You have been logged out', { type: 'info' })
                navigate('/')
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-brand-600 hover:bg-brand-50"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />Log out
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

export default function Navbar() {
  const { itemCount } = useCart()
  const { count: wishCount } = useWishlist()
  const { isAuthenticated } = useAuth()
  const [searchOpen, setSearchOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const iconBtn = 'relative inline-flex h-11 w-11 items-center justify-center rounded-full text-ink-900 hover:bg-cream-200'

  return (
    <header className="sticky top-0 z-40 border-b border-ink-200/60 bg-cream-50/85 backdrop-blur-xl">
      <div className="container-page flex h-16 items-center gap-3 sm:h-[4.5rem] sm:gap-5">
        <button type="button" className={`${iconBtn} -ml-2 lg:hidden`} onClick={() => setDrawerOpen(true)} aria-label="Open menu" aria-haspopup="dialog">
          <Menu className="h-6 w-6" aria-hidden="true" />
        </button>
        <Logo />
        <div className="ml-2 hidden lg:block"><LocationMenu /></div>

        <nav aria-label="Primary" className="ml-4 hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => `relative rounded-full px-4 py-2 text-sm font-bold transition-colors ${isActive ? 'text-brand-600' : 'text-ink-700 hover:text-ink-900'}`}>
              {({ isActive }) => (
                <>
                  {l.label}
                  {isActive ? <motion.span layoutId="nav-underline" className="absolute inset-x-4 -bottom-0.5 h-0.5 rounded-full bg-brand-500" transition={{ type: 'spring', stiffness: 500, damping: 36 }} /> : null}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-0.5 sm:gap-1.5">
          <button type="button" className={iconBtn} onClick={() => setSearchOpen(true)} aria-label="Search restaurants and dishes" aria-haspopup="dialog">
            <Search className="h-5 w-5" aria-hidden="true" />
          </button>
          <Link to="/wishlist" className={`${iconBtn} hidden sm:inline-flex`} aria-label={`Wishlist, ${wishCount} saved`}>
            <Heart className="h-5 w-5" aria-hidden="true" />
            <CountBadge count={wishCount} />
          </Link>
          <Link to="/cart" className={iconBtn} aria-label={`Cart, ${itemCount} ${itemCount === 1 ? 'item' : 'items'}`}>
            <ShoppingBag className="h-5 w-5" aria-hidden="true" />
            <CountBadge count={itemCount} />
          </Link>
          <Link to="/admin/login" className="ml-1 hidden h-10 items-center gap-2 rounded-full border border-ink-200 bg-white px-3 text-sm font-bold text-ink-900 transition-colors hover:border-brand-500 hover:text-brand-600 md:inline-flex" aria-label="Admin Panel (demo sign in)">
            <ShieldCheck className="h-4 w-4 text-brand-500" aria-hidden="true" /><span className="hidden lg:inline">Admin Panel</span><span className="lg:hidden">Admin</span>
          </Link>
          <div className="ml-1 hidden sm:block">
            {isAuthenticated ? (
              <ProfileMenu />
            ) : (
              <Link to="/login" className="btn btn-dark btn-sm"><User className="h-4 w-4" aria-hidden="true" />Log in</Link>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>{searchOpen ? <SearchOverlay key="search" onClose={() => setSearchOpen(false)} /> : null}</AnimatePresence>
      <AnimatePresence>{drawerOpen ? <MobileDrawer key="drawer" onClose={() => setDrawerOpen(false)} /> : null}</AnimatePresence>
    </header>
  )
}
