export const isObj = (v) => Boolean(v) && typeof v === 'object' && !Array.isArray(v)
export const arr = (v) => (Array.isArray(v) ? v : [])
export const blank = (v) => v === '' || v === null || v === undefined
export const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n))
export const uid = (prefix) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase()
