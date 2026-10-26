// Form validators. Each returns an { field: message } map; an empty object means valid.
import { isValidEmail, isValidPhone } from '../../utils/validation.js'
import { CATEGORIES } from '../../data/categories.js'
import { blank } from './util.js'

const text = (v) => String(v ?? '').trim()
const numIn = (v, min, max) => { const n = Number(v); return !blank(v) && Number.isFinite(n) && n >= min && n <= max }

export function validateRestaurant(v, { existingNames = [], editingName = null } = {}) {
  const e = {}
  const name = text(v.name)
  if (name.length < 2) e.name = 'Enter the restaurant name (2+ characters).'
  else if (name.length > 60) e.name = 'Keep the name under 60 characters.'
  else if (existingNames.some((n) => n.toLowerCase() === name.toLowerCase() && n.toLowerCase() !== String(editingName ?? '').toLowerCase())) e.name = 'A restaurant with this name already exists.'
  if (!CATEGORIES.some((c) => c.id === v.primaryCuisine)) e.primaryCuisine = 'Choose a primary category.'
  if (text(v.ownerName).length < 2) e.ownerName = 'Enter the owner / contact name.'
  if (!isValidPhone(v.phone)) e.phone = 'Enter a valid 10-digit Indian mobile number.'
  if (!isValidEmail(v.email)) e.email = 'Enter a valid email address.'
  if (text(v.area).length < 2) e.area = 'Enter the area / locality.'
  if (text(v.address).length < 8) e.address = 'Enter the full street address (8+ characters).'
  if (!numIn(v.deliveryTime, 10, 120) || !Number.isInteger(Number(v.deliveryTime))) e.deliveryTime = 'Delivery time must be 10–120 minutes.'
  if (!numIn(v.deliveryFee, 0, 200)) e.deliveryFee = 'Delivery fee must be ₹0–₹200.'
  if (!numIn(v.costForTwo, 0, 5000)) e.costForTwo = 'Cost for two must be ₹0–₹5,000.'
  if (![1, 2, 3].includes(Number(v.priceLevel))) e.priceLevel = 'Choose a price level.'
  if (text(v.about).length > 400) e.about = 'Keep the description under 400 characters.'
  if (!blank(v.commissionRate) && !numIn(v.commissionRate, 0, 40)) e.commissionRate = 'Commission must be between 0% and 40%.'
  const hours = Array.isArray(v.hours) ? v.hours : []
  hours.forEach((h, i) => { if (!text(h.day) || !text(h.hours)) e[`hours.${i}`] = 'Fill in both the days and the opening hours.' })
  return e
}

export function validateCommission(value) {
  if (blank(value)) return { ok: true, value: null }
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0 || n > 40) return { ok: false, error: 'Commission must be between 0% and 40%.' }
  if (Math.round(n * 2) / 2 !== n) return { ok: false, error: 'Use steps of 0.5% (e.g. 12 or 12.5).' }
  return { ok: true, value: n }
}

export function validateOptionGroups(groups) {
  const errors = []
  if (!Array.isArray(groups)) return errors
  groups.forEach((g, gi) => {
    const label = `Option group ${gi + 1}`
    if (text(g.title).length < 2) errors.push(`${label}: add a title.`)
    const opts = Array.isArray(g.options) ? g.options : []
    if (!opts.length) errors.push(`${label}: add at least one option.`)
    opts.forEach((o, oi) => {
      if (!text(o.label)) errors.push(`${label}, option ${oi + 1}: add a label.`)
      if (blank(o.price) || !Number.isFinite(Number(o.price)) || Number(o.price) < 0 || Number(o.price) > 2000) errors.push(`${label}, option ${oi + 1}: price must be ₹0–₹2,000.`)
    })
    if (g.type === 'multiple' && !blank(g.max) && (!Number.isInteger(Number(g.max)) || Number(g.max) < 1 || Number(g.max) > Math.max(1, opts.length))) errors.push(`${label}: max choices must be between 1 and ${Math.max(1, opts.length)}.`)
  })
  return errors
}

export function validateMenuItem(v, { siblings = [], editingId = null } = {}) {
  const e = {}
  const name = text(v.name)
  if (!v.restaurantId) e.restaurantId = 'Choose a restaurant.'
  if (name.length < 2) e.name = 'Enter the dish name (2+ characters).'
  else if (name.length > 60) e.name = 'Keep the name under 60 characters.'
  else if (siblings.some((s) => s.id !== editingId && s.name.toLowerCase() === name.toLowerCase())) e.name = 'This restaurant already has a dish with that name.'
  if (text(v.category).length < 2) e.category = 'Choose or enter a category.'
  else if (text(v.category).length > 30) e.category = 'Keep the category under 30 characters.'
  if (!numIn(v.price, 1, 10000) || !Number.isInteger(Number(v.price))) e.price = 'Price must be a whole number between ₹1 and ₹10,000.'
  if (!blank(v.originalPrice) && (!numIn(v.originalPrice, 1, 10000) || Number(v.originalPrice) <= Number(v.price))) e.originalPrice = 'Original (strike-through) price must be higher than the price.'
  if (text(v.description).length > 200) e.description = 'Keep the description under 200 characters.'
  if (!blank(v.image) && !/^(https:\/\/|photo-)/i.test(text(v.image))) e.image = 'Use an https:// image link (or leave blank for the default photo).'
  const optErrors = validateOptionGroups(v.options)
  if (optErrors.length) e.options = optErrors[0]
  return e
}

export function validatePartner(v, { existing = [], editingId = null } = {}) {
  const e = {}
  if (text(v.name).length < 2) e.name = 'Enter the partner name.'
  if (!isValidPhone(v.phone)) e.phone = 'Enter a valid 10-digit Indian mobile number.'
  else if (existing.some((p) => p.id !== editingId && p.phone.replace(/\D/g, '').slice(-10) === String(v.phone).replace(/\D/g, '').slice(-10))) e.phone = 'A partner with this phone number is already registered.'
  if (!['Bike', 'Scooter', 'Bicycle'].includes(v.vehicle)) e.vehicle = 'Choose a vehicle type.'
  if (!/^[A-Z]{2}[\s-]?\d{1,2}[\s-]?[A-Z]{0,3}[\s-]?\d{1,4}$/i.test(text(v.plate))) e.plate = 'Enter a valid plate, e.g. TN 38 AB 1234 (use "DEMO" style plates for test data).'
  if (!blank(v.email) && !isValidEmail(v.email)) e.email = 'Enter a valid email address.'
  return e
}

export function validateZone(v, { existing = [], editingId = null } = {}) {
  const e = {}
  const name = text(v.name)
  if (name.length < 2) e.name = 'Enter a zone name.'
  else if (existing.some((z) => z.id !== editingId && z.name.toLowerCase() === name.toLowerCase())) e.name = 'A zone with this name already exists.'
  if (text(v.coverage).length < 5) e.coverage = 'Describe the coverage (areas / PIN codes), 5+ characters.'
  if (!numIn(v.deliveryFee, 0, 200)) e.deliveryFee = 'Delivery fee must be ₹0–₹200.'
  if (!numIn(v.minOrder, 0, 2000)) e.minOrder = 'Minimum order must be ₹0–₹2,000.'
  if (!numIn(v.etaExtra, 0, 60)) e.etaExtra = 'Extra delivery time must be 0–60 minutes.'
  return e
}

export const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED']
export const LOCALES = ['en-IN', 'en-US', 'en-GB', 'ta-IN']

export function validateSettings(v) {
  const e = {}
  const name = text(v.platformName)
  if (name.length < 2 || name.length > 40) e.platformName = 'Platform name must be 2–40 characters.'
  if (!CURRENCIES.includes(v.currency)) e.currency = 'Choose a supported currency.'
  if (!LOCALES.includes(v.locale)) e.locale = 'Choose a supported locale.'
  if (!numIn(v.defaultDeliveryFee, 0, 200)) e.defaultDeliveryFee = 'Default delivery fee must be ₹0–₹200.'
  if (!numIn(v.gstPercent, 0, 28)) e.gstPercent = 'GST must be 0%–28%.'
  if (!numIn(v.platformFee, 0, 100)) e.platformFee = 'Platform fee must be ₹0–₹100.'
  if (!numIn(v.freeDeliveryThreshold, 0, 5000)) e.freeDeliveryThreshold = 'Free-delivery threshold must be ₹0–₹5,000.'
  if (!numIn(v.etaBufferMinutes, 0, 60)) e.etaBufferMinutes = 'ETA buffer must be 0–60 minutes.'
  if (!numIn(v.refundWindowDays, 0, 90)) e.refundWindowDays = 'Refund window must be 0–90 days.'
  if (!numIn(v.defaultCommission, 0, 40)) e.defaultCommission = 'Default commission must be 0%–40%.'
  if (!numIn(v.partnerPayoutPerDelivery, 0, 200)) e.partnerPayoutPerDelivery = 'Partner payout must be ₹0–₹200.'
  if (!numIn(v.partnerMaxActive, 1, 10) || !Number.isInteger(Number(v.partnerMaxActive))) e.partnerMaxActive = 'Active deliveries per partner must be 1–10.'
  return e
}

export const TICKET_CATEGORIES = ['order', 'payment', 'delivery', 'refund', 'account', 'other']
export const TICKET_PRIORITIES = ['low', 'medium', 'high', 'urgent']
export const TICKET_STATUSES = ['open', 'in_progress', 'resolved', 'closed']

export function validateTicket(v) {
  const e = {}
  if (text(v.subject).length < 4) e.subject = 'Add a subject (4+ characters).'
  else if (text(v.subject).length > 80) e.subject = 'Keep the subject under 80 characters.'
  if (!TICKET_CATEGORIES.includes(v.category)) e.category = 'Choose a category.'
  if (!TICKET_PRIORITIES.includes(v.priority)) e.priority = 'Choose a priority.'
  if (text(v.customerName).length < 2) e.customerName = 'Enter the customer name.'
  if (!blank(v.customerEmail) && !isValidEmail(v.customerEmail)) e.customerEmail = 'Enter a valid email.'
  if (text(v.message).length < 5) e.message = 'Describe the issue (5+ characters).'
  return e
}
