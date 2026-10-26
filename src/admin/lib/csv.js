// CSV export. Cells starting with = + - @ (formula triggers) are prefixed with an apostrophe so
// spreadsheet software never executes data that came from user input (CSV-injection guard).
const TRIGGERS = /^[=+\-@\t\r]/

export function escapeCell(value) {
  if (value === null || value === undefined) return ''
  let text = typeof value === 'number' ? String(value) : String(value)
  if (typeof value === 'string' && TRIGGERS.test(text)) text = `'${text}`
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** columns: [{ label, value: (row) => any }] */
export function toCsv(rows, columns) {
  const head = columns.map((c) => escapeCell(c.label)).join(',')
  const body = rows.map((row) => columns.map((c) => escapeCell(c.value(row))).join(','))
  return [head, ...body].join('\r\n')
}

export function downloadCsv(filename, text) {
  if (typeof document === 'undefined') return false
  const blob = new Blob(['\ufeff', text], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 500)
  return true
}
