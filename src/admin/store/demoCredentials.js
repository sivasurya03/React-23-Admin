// TRAINING/DEMO ONLY. These five throw-away passwords exist so the demo login can be tested in one
// click. They unlock only the local, browser-side demo accounts in adminAccounts.js — never real
// accounts. Real accounts are verified on the server (netlify/functions/admin-auth.mjs).
export const DEMO_CREDENTIALS = [
  { role: 'super_admin', label: 'Super Admin', email: 'super@craveo.demo', password: 'Super@12345', blurb: 'Everything, incl. roles & audit' },
  { role: 'operations', label: 'Operations', email: 'ops@craveo.demo', password: 'Ops@12345', blurb: 'Orders, partners, onboarding' },
  { role: 'restaurant_manager', label: 'Restaurant Manager', email: 'restaurants@craveo.demo', password: 'Rest@12345', blurb: 'Restaurants & menus' },
  { role: 'finance', label: 'Finance', email: 'finance@craveo.demo', password: 'Fin@12345', blurb: 'Payments, settlements, refunds' },
  { role: 'support', label: 'Support', email: 'support@craveo.demo', password: 'Sup@12345', blurb: 'Tickets & customer lookups' },
]
