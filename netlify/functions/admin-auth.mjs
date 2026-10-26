// REAL admin authentication, run on the server (Netlify Function). Nothing here ships to the browser.
//
//   POST /api/admin-auth/login    { email, password }  -> sets an HttpOnly session cookie
//   GET  /api/admin-auth/session                        -> { user } or 401
//   POST /api/admin-auth/logout                         -> clears the cookie
//
// Configuration (Netlify → Site settings → Environment variables; NEVER prefix with VITE_):
//   ADMIN_SESSION_SECRET  random string, 32+ chars (signs session cookies)
//   ADMIN_ACCOUNTS        JSON array: [{"name","email","role","passwordHash"}]  (hash from scripts/hash-admin-password.mjs)
// If either is missing or invalid, login is refused (503). No fallback accounts exist.
import { scrypt, randomBytes, timingSafeEqual, createHmac } from 'node:crypto'
import { promisify } from 'node:util'

const scryptAsync = promisify(scrypt)
const KEYLEN = 64
const COOKIE = 'craveo_admin'
const SESSION_SECONDS = 8 * 60 * 60
export const ROLE_IDS = ['super_admin', 'operations', 'restaurant_manager', 'finance', 'support']

const attempts = new Map() // best-effort only: serverless instances do not share memory
const MAX_ATTEMPTS = 5
const LOCK_MS = 60_000

export async function hashPassword(password, { N = 16384 } = {}) {
  const salt = randomBytes(16)
  const key = await scryptAsync(password, salt, KEYLEN, { N, r: 8, p: 1 })
  return `scrypt$${N}$${salt.toString('hex')}$${key.toString('hex')}`
}

export async function verifyPasswordHash(password, stored) {
  const [scheme, n, saltHex, keyHex] = String(stored ?? '').split('$')
  if (scheme !== 'scrypt' || !saltHex || !keyHex) return false
  const N = Number(n)
  if (!Number.isInteger(N) || N < 1024 || N > 1 << 20) return false
  const expected = Buffer.from(keyHex, 'hex')
  const actual = await scryptAsync(String(password), Buffer.from(saltHex, 'hex'), expected.length, { N, r: 8, p: 1 })
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

export function readConfig(env) {
  const secret = String(env.ADMIN_SESSION_SECRET ?? '')
  if (secret.length < 32) return { ok: false, reason: 'ADMIN_SESSION_SECRET must be set to 32+ characters.' }
  let list
  try { list = JSON.parse(env.ADMIN_ACCOUNTS ?? '') } catch { return { ok: false, reason: 'ADMIN_ACCOUNTS is missing or is not valid JSON.' } }
  if (!Array.isArray(list) || !list.length) return { ok: false, reason: 'ADMIN_ACCOUNTS must be a non-empty array.' }
  const accounts = []
  for (const a of list) {
    const valid = a && typeof a.email === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(a.email) && typeof a.name === 'string' && ROLE_IDS.includes(a.role) && String(a.passwordHash).startsWith('scrypt$')
    if (!valid) return { ok: false, reason: 'Every ADMIN_ACCOUNTS entry needs name, email, a known role and an scrypt passwordHash.' }
    accounts.push({ name: a.name, email: a.email.trim().toLowerCase(), role: a.role, passwordHash: a.passwordHash })
  }
  return { ok: true, secret, accounts }
}

const b64 = (buf) => Buffer.from(buf).toString('base64url')
const sign = (payload, secret) => createHmac('sha256', secret).update(payload).digest()

export function createToken(user, secret, now) {
  const payload = b64(JSON.stringify({ email: user.email, exp: Math.floor(now / 1000) + SESSION_SECONDS }))
  return `${payload}.${b64(sign(payload, secret))}`
}

export function readToken(token, secret, now) {
  const [payload, mac] = String(token ?? '').split('.')
  if (!payload || !mac) return null
  const expected = sign(payload, secret)
  const given = Buffer.from(mac, 'base64url')
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    return data && typeof data.email === 'string' && data.exp > Math.floor(now / 1000) ? data : null
  } catch { return null }
}

const json = (status, body, extra = {}) => ({ statusCode: status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extra }, body: JSON.stringify(body) })
const publicUser = (a) => ({ id: `srv-${a.email}`, name: a.name, email: a.email, role: a.role })
const header = (event, name) => event.headers?.[name] ?? event.headers?.[name.toLowerCase()] ?? ''
const cookieOf = (event) => Object.fromEntries(String(header(event, 'cookie')).split(';').map((c) => c.trim().split('=')).filter((p) => p[0]).map(([k, ...v]) => [k, v.join('=')]))
const isLocal = (event) => /^(localhost|127\.0\.0\.1)(:|$)/.test(String(header(event, 'host')))
const cookieHeader = (event, value, maxAge) => `${COOKIE}=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${isLocal(event) ? '' : '; Secure'}`

let dummyHash
async function burnTime(password) {
  dummyHash ??= await hashPassword('timing-equaliser')
  await verifyPasswordHash(password, dummyHash)
}

export async function handle(event, env = process.env, now = Date.now()) {
  const action = String(event.path ?? '').split('/').filter(Boolean).pop()
  const method = String(event.httpMethod ?? '').toUpperCase()
  const origin = header(event, 'origin')
  if (origin) { try { if (new URL(origin).host !== header(event, 'host')) return json(403, { error: 'Cross-origin requests are not allowed.' }) } catch { return json(403, { error: 'Bad origin.' }) } }

  const config = readConfig(env)
  if (action === 'status' && method === 'GET') return json(200, { configured: config.ok })
  if (!config.ok) return json(503, { error: 'Real admin login is not configured on the server.', configured: false })

  if (action === 'login' && method === 'POST') {
    if (!/application\/json/i.test(header(event, 'content-type'))) return json(415, { error: 'Send JSON.' })
    let body
    try { body = JSON.parse(event.body ?? '') } catch { return json(400, { error: 'Invalid request.' }) }
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body?.password === 'string' ? body.password : ''
    if (!email || !password || email.length > 254 || password.length > 200) return json(400, { error: 'Enter your email and password.' })
    const key = `${email}|${header(event, 'x-nf-client-connection-ip') || header(event, 'x-forwarded-for')}`
    const rec = attempts.get(key) ?? { count: 0, until: 0 }
    if (rec.until > now) return json(429, { error: 'Too many attempts. Wait a minute and try again.' })
    const account = config.accounts.find((a) => a.email === email)
    let ok = false
    if (account) ok = await verifyPasswordHash(password, account.passwordHash)
    else await burnTime(password)
    if (!ok) {
      rec.count += 1
      if (rec.count >= MAX_ATTEMPTS) { rec.until = now + LOCK_MS; rec.count = 0 }
      attempts.set(key, rec)
      return json(401, { error: 'Incorrect email or password.' })
    }
    attempts.delete(key)
    return json(200, { user: publicUser(account) }, { 'Set-Cookie': cookieHeader(event, createToken(account, config.secret, now), SESSION_SECONDS) })
  }

  if (action === 'session' && method === 'GET') {
    const data = readToken(cookieOf(event)[COOKIE], config.secret, now)
    const account = data ? config.accounts.find((a) => a.email === data.email) : null
    return account ? json(200, { user: publicUser(account) }) : json(401, { error: 'Not signed in.' })
  }

  if (action === 'logout' && method === 'POST') return json(200, { ok: true }, { 'Set-Cookie': cookieHeader(event, '', 0) })
  return json(404, { error: 'Not found.' })
}

export const handler = (event) => handle(event)
