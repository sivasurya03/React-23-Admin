import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { readStorage, writeStorage, removeStorage, STORAGE_KEYS } from '../utils/storage.js'
import { hashPassword, randomSalt, verifyPassword } from '../utils/passwordHash.js'
import { isAccountBlocked } from '../utils/accountStatus.js'

// DEMO AUTHENTICATION — there is no server. Accounts live in this browser's
// LocalStorage only. Passwords are never stored in plain text: each account keeps
// a random salt and a salted SHA-256 hash. This is NOT production-grade security
// (no server, no rate-limiting, hashes are readable by anyone with device access).

const AuthContext = createContext(null)

const normalizeEmail = (e) => String(e || '').trim().toLowerCase()

function loadUsers() {
  const raw = readStorage(STORAGE_KEYS.users, [])
  return Array.isArray(raw)
    ? raw.filter((u) => u && typeof u.email === 'string' && typeof u.hash === 'string' && typeof u.salt === 'string')
    : []
}

function loadSession() {
  const s = readStorage(STORAGE_KEYS.session, null)
  if (s && typeof s === 'object' && typeof s.email === 'string' && typeof s.name === 'string' && !(s.demo !== true && isAccountBlocked(s.email))) {
    return { id: String(s.id || s.email), name: s.name, email: s.email, plus: Boolean(s.plus), demo: Boolean(s.demo) }
  }
  return null
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(loadSession)

  useEffect(() => {
    if (user) writeStorage(STORAGE_KEYS.session, user)
    else removeStorage(STORAGE_KEYS.session)
  }, [user])

  const signup = useCallback(async ({ name, email, password }) => {
    const users = loadUsers()
    const mail = normalizeEmail(email)
    if (users.some((u) => u.email === mail)) {
      return { ok: false, field: 'email', message: 'An account with this email already exists on this device. Try logging in.' }
    }
    const salt = randomSalt()
    const hash = await hashPassword(password, salt)
    const account = { id: `u-${Date.now().toString(36)}`, name: String(name).trim(), email: mail, salt, hash, plus: false }
    writeStorage(STORAGE_KEYS.users, [...users, account])
    setUser({ id: account.id, name: account.name, email: account.email, plus: false, demo: false })
    return { ok: true }
  }, [])

  const login = useCallback(async ({ email, password }) => {
    const mail = normalizeEmail(email)
    const account = loadUsers().find((u) => u.email === mail)
    if (!account) {
      return { ok: false, field: 'email', message: 'No demo account found for this email on this device. Sign up first, or use the demo account.' }
    }
    if (!(await verifyPassword(password, account.salt, account.hash))) return { ok: false, field: 'password', message: 'Incorrect password.' }
    if (isAccountBlocked(account.email)) {
      return { ok: false, field: 'email', message: 'This account has been suspended by Craveo support (demo). Contact support to restore access.' }
    }
    setUser({ id: account.id, name: account.name, email: account.email, plus: Boolean(account.plus), demo: false })
    return { ok: true }
  }, [])

  const loginDemo = useCallback(() => {
    setUser({ id: 'demo-user', name: 'Demo Guest', email: 'guest@craveo.demo', plus: false, demo: true })
    return { ok: true }
  }, [])

  const logout = useCallback(() => setUser(null), [])

  const togglePlus = useCallback(() => {
    setUser((current) => {
      if (!current) return current
      const next = { ...current, plus: !current.plus }
      const users = loadUsers().map((u) => (u.id === current.id ? { ...u, plus: next.plus } : u))
      writeStorage(STORAGE_KEYS.users, users)
      return next
    })
  }, [])

  const value = useMemo(
    () => ({ user, isAuthenticated: Boolean(user), isPlus: Boolean(user?.plus), signup, login, loginDemo, logout, togglePlus }),
    [user, signup, login, loginDemo, logout, togglePlus],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
