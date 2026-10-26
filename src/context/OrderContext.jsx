import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { readStorage, writeStorage, STORAGE_KEYS } from '../utils/storage.js'
import { generateOrderId } from '../utils/ids.js'
import { DELIVERY_PARTNERS } from '../data/index.js'
import { ORDER_STATUSES } from '../data/orderStatuses.js'
import { getRuntimeConfig } from '../utils/runtimeConfig.js'
import { createRefund } from '../admin/lib/orders.js'

const OrderContext = createContext(null)

const LAST = ORDER_STATUSES.length - 1

function sanitizeOrder(raw) {
  if (!raw || typeof raw !== 'object' || typeof raw.id !== 'string') return null
  if (!Array.isArray(raw.items) || !raw.items.length || !raw.totals || typeof raw.totals.total !== 'number') return null
  const statusIndex = Math.max(0, Math.min(LAST, Math.floor(Number(raw.statusIndex)) || 0))
  const history = Array.isArray(raw.statusHistory) ? raw.statusHistory.filter((h) => h && typeof h.at === 'string') : []
  return {
    ...raw,
    statusIndex,
    statusHistory: history.length ? history : [{ index: 0, at: raw.createdAt || new Date().toISOString() }],
  }
}

function loadOrders() {
  const raw = readStorage(STORAGE_KEYS.orders, [])
  if (!Array.isArray(raw)) return []
  const seen = new Set()
  return raw.map(sanitizeOrder).filter((o) => {
    if (!o || seen.has(o.id)) return false
    seen.add(o.id)
    return true
  })
}

export function OrderProvider({ children }) {
  const [orders, setOrders] = useState(loadOrders)

  useEffect(() => {
    writeStorage(STORAGE_KEYS.orders, orders)
  }, [orders])

  /**
   * Creates an order snapshot. `clientToken` makes it idempotent: a repeated call
   * with the same token returns the existing order instead of creating a duplicate.
   */
  const placeOrder = useCallback(
    ({ clientToken, restaurant, items, totals, customer, delivery, payment, couponCode }) => {
      const existing = orders.find((o) => o.clientToken && o.clientToken === clientToken)
      if (existing) return existing
      const createdAt = new Date().toISOString()
      const eta = (restaurant.deliveryTime || 30) + getRuntimeConfig().etaBufferMinutes
      const order = {
        id: generateOrderId(orders.map((o) => o.id)),
        clientToken: clientToken || null,
        createdAt,
        statusIndex: 0,
        statusHistory: [{ index: 0, at: createdAt }],
        restaurant: { id: restaurant.id, name: restaurant.name, address: restaurant.address, area: restaurant.area, deliveryTime: restaurant.deliveryTime },
        items: items.map((i) => ({
          key: i.key, itemId: i.itemId, restaurantId: i.restaurantId, name: i.name, image: i.image, veg: i.veg,
          basePrice: i.basePrice, selections: i.selections, instructions: i.instructions, unitPrice: i.unitPrice, quantity: i.quantity,
        })),
        totals: { ...totals, appliedCoupon: undefined },
        couponCode: couponCode || null,
        customer,
        delivery,
        payment,
        etaMinutes: eta,
        partner: DELIVERY_PARTNERS[Math.floor(Math.random() * DELIVERY_PARTNERS.length)],
      }
      setOrders((list) => [order, ...list])
      return order
    },
    [orders],
  )

  const advanceOrder = useCallback((id) => {
    setOrders((list) =>
      list.map((o) => {
        if (o.id !== id || o.cancelled || o.statusIndex >= LAST) return o
        const next = o.statusIndex + 1
        return { ...o, statusIndex: next, statusHistory: [...o.statusHistory, { index: next, at: new Date().toISOString() }] }
      }),
    )
  }, [])

  const resetOrderStatus = useCallback((id) => {
    setOrders((list) =>
      list.map((o) => (o.id === id && !o.cancelled ? { ...o, statusIndex: 0, statusHistory: [{ index: 0, at: o.createdAt }] } : o)),
    )
  }, [])

  /** Used by the Admin panel: replaces one order with the result of `updater(order)` (re-validated). */
  const updateOrder = useCallback((id, updater) => {
    setOrders((list) =>
      list.map((o) => {
        if (o.id !== id) return o
        const next = sanitizeOrder(updater(o))
        return next ?? o
      }),
    )
  }, [])

  /** Customer-side refund request (simulated — no real payment is touched). */
  const requestRefund = useCallback(
    (id, { reason }) => {
      const target = orders.find((o) => o.id === id)
      if (!target) return { ok: false, error: 'Order not found.' }
      const result = createRefund(target, { reason, requestedBy: 'customer', by: target.customer?.name ?? 'Customer', windowDays: getRuntimeConfig().refundWindowDays })
      if (result.ok) setOrders((list) => list.map((o) => (o.id === id ? result.order : o)))
      return result
    },
    [orders],
  )

  const getOrder = useCallback((id) => orders.find((o) => o.id === id) ?? null, [orders])

  const value = useMemo(
    () => ({ orders, placeOrder, advanceOrder, resetOrderStatus, getOrder, updateOrder, requestRefund }),
    [orders, placeOrder, advanceOrder, resetOrderStatus, getOrder, updateOrder, requestRefund],
  )
  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>
}

export function useOrders() {
  const ctx = useContext(OrderContext)
  if (!ctx) throw new Error('useOrders must be used inside <OrderProvider>')
  return ctx
}
