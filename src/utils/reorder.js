import { getMenuItem, getRestaurant } from '../data/index.js'
import { buildLine } from './cartLines.js'

/**
 * Rebuilds cart lines from a past order using CURRENT menu prices.
 * Items that no longer exist, or whose chosen options are no longer offered, are skipped.
 */
export function reorderLines(order) {
  const restaurant = getRestaurant(order.restaurant.id)
  if (!restaurant) return { restaurant: null, lines: [], skipped: order.items.map((i) => i.name) }
  const lines = []
  const skipped = []
  for (const past of order.items) {
    const item = getMenuItem(restaurant.id, past.itemId)
    if (!item) { skipped.push(past.name); continue }
    const selections = []
    let valid = true
    for (const s of past.selections ?? []) {
      const group = item.options.find((g) => g.id === s.groupId)
      const opt = group?.options.find((o) => o.id === s.optionId)
      if (!opt) { valid = false; break }
      selections.push({ groupId: group.id, groupTitle: group.title, optionId: opt.id, label: opt.label, price: opt.price })
    }
    if (!valid) { skipped.push(past.name); continue }
    lines.push(buildLine({ restaurant, item, selections, instructions: past.instructions, quantity: past.quantity }))
  }
  return { restaurant, lines, skipped }
}
