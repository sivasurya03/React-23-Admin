export function generateOrderId(existingIds = []) {
  const taken = new Set(existingIds)
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const time = Date.now().toString(36).toUpperCase().slice(-5)
    const rand = Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, '').padEnd(4, '0').slice(0, 4)
    const id = `CRV-${time}${rand}`
    if (!taken.has(id)) return id
  }
  return `CRV-${Date.now().toString(36).toUpperCase()}`
}
