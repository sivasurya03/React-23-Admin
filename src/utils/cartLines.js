import { makeCartKey, unitPriceFor } from './pricing.js'

export const MAX_LINE_QUANTITY = 10

export function buildLine({ restaurant, item, selections = [], instructions = '', quantity = 1 }) {
  const note = String(instructions || '').trim().slice(0, 140)
  return {
    key: makeCartKey(item.id, selections, note),
    itemId: item.id,
    restaurantId: restaurant.id,
    name: item.name,
    image: item.image,
    veg: item.veg,
    basePrice: item.price,
    selections,
    instructions: note,
    unitPrice: unitPriceFor(item.price, selections),
    quantity: Math.max(1, Math.min(Math.floor(quantity) || 1, MAX_LINE_QUANTITY)),
  }
}
