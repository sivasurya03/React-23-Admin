// Runtime-tunable business rules. Defaults match the original customer app exactly; the Admin
// panel (Settings) can override them and they are re-applied from LocalStorage on startup.
// Only NEW orders use updated values — saved orders keep the totals they were placed with.
export const RUNTIME_DEFAULTS = Object.freeze({
  freeDeliveryThreshold: 399,
  platformFee: 5,
  gstRate: 0.05,
  etaBufferMinutes: 10,
  refundWindowDays: 7,
})

let current = { ...RUNTIME_DEFAULTS }

export function getRuntimeConfig() {
  return current
}

const RANGES = {
  freeDeliveryThreshold: [0, 5000],
  platformFee: [0, 100],
  gstRate: [0, 0.28],
  etaBufferMinutes: [0, 60],
  refundWindowDays: [0, 90],
}

/** Applies only finite, in-range numbers; everything else silently keeps its current value. */
export function applyRuntimeConfig(patch = {}) {
  const next = { ...current }
  for (const [key, [min, max]] of Object.entries(RANGES)) {
    const n = Number(patch?.[key])
    if (patch?.[key] !== undefined && patch?.[key] !== '' && Number.isFinite(n) && n >= min && n <= max) next[key] = n
  }
  current = next
  return current
}

export function resetRuntimeConfig() {
  current = { ...RUNTIME_DEFAULTS }
  return current
}
