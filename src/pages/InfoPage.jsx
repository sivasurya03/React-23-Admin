import { Link } from 'react-router-dom'
import usePageTitle from '../hooks/usePageTitle.js'

const PAGES = {
  about: {
    title: 'About this demo',
    intro: 'Craveo is a frontend-only portfolio project showing a premium food delivery experience.',
    sections: [
      ['What is real', 'The interface, cart maths, coupon rules, form validation, customisation logic, wishlist, order history and tracking timeline all run in your browser.'],
      ['What is simulated', 'Restaurants, menus, delivery partners, payments, authentication and order tracking are demo data. No server is contacted, no money moves and no food is prepared.'],
      ['Where your data lives', 'Cart, wishlist, orders and your demo account are stored in your browser’s LocalStorage only. Clearing site data removes them.'],
    ],
  },
  terms: {
    title: 'Terms of use',
    intro: 'These terms apply to this demonstration project.',
    sections: [
      ['Demo only', 'Craveo is not a real service. Orders placed here are not fulfilled and payments are never processed.'],
      ['No warranty', 'The project is provided as-is for evaluation and learning, without warranty of any kind.'],
      ['Content', 'Restaurant names and reviews are fictional. Any resemblance to real businesses is coincidental. Photography is sourced from Unsplash.'],
    ],
  },
  privacy: {
    title: 'Privacy',
    intro: 'Craveo has no backend and collects nothing.',
    sections: [
      ['Data stays on your device', 'Anything you type — names, addresses, phone numbers — is saved only in your browser’s LocalStorage so the demo can show it back to you.'],
      ['No tracking', 'There are no analytics, cookies for tracking, or third-party data sharing. Fonts and images load from Google Fonts and Unsplash, which may log standard request data.'],
      ['Passwords', 'Demo passwords are salted and hashed in your browser, but this is not production-grade security. Use a throwaway password.'],
    ],
  },
}

export default function InfoPage({ kind }) {
  const page = PAGES[kind]
  usePageTitle(`${page.title} — Craveo`)
  return (
    <div className="container-page max-w-3xl py-10 sm:py-14">
      <h1 className="text-4xl font-bold sm:text-5xl">{page.title}</h1>
      <p className="mt-3 text-lg text-ink-500">{page.intro}</p>
      <div className="mt-8 space-y-4">
        {page.sections.map(([h, p]) => (
          <section key={h} className="card p-6"><h2 className="font-sans text-lg font-extrabold">{h}</h2><p className="mt-2 leading-relaxed text-ink-500">{p}</p></section>
        ))}
      </div>
      <Link to="/" className="btn btn-primary mt-8">Back to home</Link>
    </div>
  )
}
