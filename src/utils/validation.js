const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
// Indian mobile numbers: optional +91 / 0, then 10 digits starting 6-9
const PHONE_RE = /^(?:\+?91[\s-]?|0)?[6-9]\d{9}$/

export function isValidEmail(v) {
  return EMAIL_RE.test(String(v || '').trim())
}
export function isValidPhone(v) {
  return PHONE_RE.test(String(v || '').replace(/[\s()-]/g, ''))
}

export function validateCheckout(values) {
  const errors = {}
  const name = String(values.name || '').trim()
  if (!name) errors.name = 'Please enter your full name.'
  else if (name.length < 2) errors.name = 'Name looks too short.'
  if (!String(values.email || '').trim()) errors.email = 'Please enter your email.'
  else if (!isValidEmail(values.email)) errors.email = 'Enter a valid email, like name@example.com.'
  if (!String(values.phone || '').trim()) errors.phone = 'Please enter a phone number.'
  else if (!isValidPhone(values.phone)) errors.phone = 'Enter a valid 10-digit Indian mobile number.'
  if (!String(values.address || '').trim()) errors.address = 'Please enter your delivery address.'
  else if (String(values.address).trim().length < 10) errors.address = 'Add a little more detail (house/flat, street, area).'
  const pin = String(values.pincode || '').trim()
  if (!pin) errors.pincode = 'Enter a 6-digit PIN code.'
  else if (!/^[1-9]\d{5}$/.test(pin)) errors.pincode = 'PIN code must be 6 digits.'
  if (!values.deliveryTime) errors.deliveryTime = 'Choose when you want it delivered.'
  if (!values.payment) errors.payment = 'Select a payment method.'
  if (values.payment === 'upi') {
    const upi = String(values.upiId || '').trim()
    if (upi && !/^[\w.-]{2,}@[\w.-]{2,}$/.test(upi)) errors.upiId = 'UPI ID should look like name@bank (optional for this demo).'
  }
  return errors
}

export function validateLogin({ email, password }) {
  const errors = {}
  if (!String(email || '').trim()) errors.email = 'Please enter your email.'
  else if (!isValidEmail(email)) errors.email = 'Enter a valid email address.'
  if (!password) errors.password = 'Please enter your password.'
  return errors
}

export function passwordStrength(password) {
  const p = String(password || '')
  let score = 0
  if (p.length >= 8) score += 1
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score += 1
  if (/\d/.test(p)) score += 1
  if (/[^A-Za-z0-9]/.test(p)) score += 1
  return score
}

export function validateSignup({ name, email, password, confirm }) {
  const errors = {}
  if (!String(name || '').trim()) errors.name = 'Please enter your name.'
  if (!String(email || '').trim()) errors.email = 'Please enter your email.'
  else if (!isValidEmail(email)) errors.email = 'Enter a valid email address.'
  if (!password) errors.password = 'Create a password.'
  else if (password.length < 8) errors.password = 'Use at least 8 characters.'
  else if (!/\d/.test(password) || !/[A-Za-z]/.test(password)) errors.password = 'Include at least one letter and one number.'
  if (!confirm) errors.confirm = 'Please confirm your password.'
  else if (confirm !== password) errors.confirm = 'Passwords do not match.'
  return errors
}

export function validateForgotPassword({ email }) {
  const errors = {}
  if (!String(email || '').trim()) errors.email = 'Please enter the email you registered with.'
  else if (!isValidEmail(email)) errors.email = 'Enter a valid email, like name@example.com.'
  return errors
}
