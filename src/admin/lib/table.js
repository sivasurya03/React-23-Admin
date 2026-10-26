// Search + filter + sort + paginate helper used by every admin list.
const getPath = (row, path) => String(path).split('.').reduce((v, k) => (v == null ? v : v[k]), row)

function compare(a, b) {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), 'en', { numeric: true, sensitivity: 'base' })
}

export function queryRows(rows, { search = '', searchKeys = [], filters = {}, filterFns = {}, sortKey = null, sortDir = 'asc', sorters = {}, page = 1, pageSize = 10 } = {}) {
  let list = Array.isArray(rows) ? rows : []
  const q = String(search).trim().toLowerCase()
  if (q) {
    list = list.filter((row) => searchKeys.some((k) => String(typeof k === 'function' ? k(row) : getPath(row, k) ?? '').toLowerCase().includes(q)))
  }
  for (const [key, value] of Object.entries(filters)) {
    if (value === '' || value === 'all' || value == null) continue
    const fn = filterFns[key]
    list = list.filter((row) => (fn ? fn(row, value) : String(getPath(row, key)) === String(value)))
  }
  if (sortKey) {
    const pick = sorters[sortKey] ?? ((row) => getPath(row, sortKey))
    const dir = sortDir === 'desc' ? -1 : 1
    list = [...list].sort((a, b) => dir * compare(pick(a), pick(b)))
  }
  const total = list.length
  const size = Math.max(1, Number(pageSize) || 10)
  const pages = Math.max(1, Math.ceil(total / size))
  const current = Math.min(Math.max(1, Number(page) || 1), pages)
  const start = (current - 1) * size
  return { rows: list.slice(start, start + size), all: list, total, page: current, pages, pageSize: size, from: total ? start + 1 : 0, to: Math.min(total, start + size) }
}
