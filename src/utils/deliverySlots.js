/** Builds delivery time options relative to `now`. Labels are stored on the order. */
export function buildDeliverySlots(now = new Date(), etaMinutes = 30) {
  const slots = [{ id: 'asap', label: `As soon as possible (about ${etaMinutes}–${etaMinutes + 10} min)` }]
  const start = new Date(now)
  start.setMinutes(0, 0, 0)
  start.setHours(start.getHours() + 1)
  if (start.getTime() - now.getTime() < 45 * 60 * 1000) start.setHours(start.getHours() + 1)
  const fmt = (d) => d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
  for (let i = 0; i < 4; i += 1) {
    const from = new Date(start.getTime() + i * 60 * 60 * 1000)
    const to = new Date(from.getTime() + 60 * 60 * 1000)
    slots.push({ id: `slot-${from.getHours()}`, label: `Today, ${fmt(from)} – ${fmt(to)}` })
  }
  return slots
}
