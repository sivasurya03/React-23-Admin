// Thin client for the real-auth Netlify Function. Never stores credentials; the session lives in an
// HttpOnly cookie the browser JavaScript cannot read.
const BASE = '/api/admin-auth'

async function call(path, init = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 6000)
  try {
    const res = await fetch(`${BASE}/${path}`, { credentials: 'same-origin', signal: controller.signal, ...init })
    const data = /json/i.test(res.headers.get('content-type') ?? '') ? await res.json().catch(() => null) : null
    return { status: res.status, data }
  } catch {
    return { status: 0, data: null }
  } finally {
    clearTimeout(timer)
  }
}

export const NOT_CONFIGURED = 'Real-account login is not configured on this deployment. It needs the Netlify Function plus the ADMIN_ACCOUNTS and ADMIN_SESSION_SECRET environment variables (see README). Only the demo accounts work until then.'

export async function fetchSession() {
  const r = await call('session')
  return r.status === 200 && r.data?.user ? r.data.user : null
}

export async function serverLogin(email, password) {
  const r = await call('login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
  if (r.status === 200 && r.data?.user) return { ok: true, user: r.data.user }
  if (r.status === 401 || r.status === 429 || r.status === 400) return { ok: false, error: r.data?.error ?? 'Sign-in failed.' }
  return { ok: false, error: NOT_CONFIGURED, notConfigured: true }
}

export async function serverLogout() {
  await call('logout', { method: 'POST' })
}
