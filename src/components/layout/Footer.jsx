import { Link } from 'react-router-dom'
import Logo from '../common/Logo.jsx'

const COLUMNS = [
  {
    title: 'Explore',
    links: [
      { to: '/', label: 'Home' },
      { to: '/restaurants', label: 'All restaurants' },
      { to: '/restaurants?offers=1', label: 'Offers & deals' },
      { to: '/restaurants?fee=free', label: 'Free delivery' },
      { to: '/restaurants?veg=1', label: 'Pure veg' },
    ],
  },
  {
    title: 'Cuisines',
    links: [
      { to: '/restaurants?cuisine=pizza', label: 'Pizza' },
      { to: '/restaurants?cuisine=biryani', label: 'Biryani' },
      { to: '/restaurants?cuisine=south-indian', label: 'South Indian' },
      { to: '/restaurants?cuisine=desserts', label: 'Desserts' },
      { to: '/restaurants?cuisine=healthy', label: 'Healthy' },
    ],
  },
  {
    title: 'Your account',
    links: [
      { to: '/login', label: 'Log in' },
      { to: '/signup', label: 'Sign up' },
      { to: '/orders', label: 'Order history' },
      { to: '/wishlist', label: 'Wishlist' },
      { to: '/cart', label: 'Cart' },
    ],
  },
  {
    title: 'Support',
    links: [
      { to: '/help', label: 'Help & FAQs' },
      { to: '/about', label: 'About this demo' },
      { to: '/terms', label: 'Terms of use' },
      { to: '/privacy', label: 'Privacy' },
      { to: '/admin/login', label: 'Admin Access' },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="mt-20 bg-ink-900 text-white/80">
      <div className="container-page py-14">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div className="max-w-sm">
            <Logo light />
            <p className="mt-4 text-sm leading-relaxed text-white/65">
              Craveo is a frontend demo of a premium food delivery experience. Restaurants, payments and tracking are simulated — no real orders are placed.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="font-sans text-sm font-bold uppercase tracking-wider text-white">{col.title}</h2>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link to={l.to} className="text-sm text-white/65 transition-colors hover:text-white">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-12 flex flex-col gap-2 border-t border-white/10 pt-6 text-sm text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Craveo. Demo project — not a real service.</p>
          <p>
            Photography via Unsplash. Brand and data are fictional. <Link to="/admin/login" className="font-semibold text-white/70 underline-offset-2 hover:text-white hover:underline">Admin Access (demo)</Link>
          </p>
        </div>
      </div>
    </footer>
  )
}
