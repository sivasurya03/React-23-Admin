import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState } from 'react'
import { readStorage, writeStorage, STORAGE_KEYS } from '../utils/storage.js'
import { calculateTotals, makeCartKey, normalizeCode, validateCoupon } from '../utils/pricing.js'
import { buildLine, MAX_LINE_QUANTITY } from '../utils/cartLines.js'
import { getMenuItem, getRestaurant } from '../data/index.js'
import { useAuth } from './AuthContext.jsx'

const CartContext = createContext(null)

const EMPTY = { restaurantId: null, items: [], coupon: null }

function sanitizeLine(raw) {
  if (!raw || typeof raw !== 'object') return null
  const item = getMenuItem(raw.restaurantId, raw.itemId)
  if (!item || item.available === false) return null
  const quantity = Math.floor(Number(raw.quantity))
  const unitPrice = Number(raw.unitPrice)
  if (!Number.isFinite(quantity) || quantity < 1 || !Number.isFinite(unitPrice) || unitPrice < 0) return null
  const selections = Array.isArray(raw.selections)
    ? raw.selections
        .filter((s) => s && typeof s.groupId === 'string' && typeof s.optionId === 'string')
        .map((s) => ({ groupId: s.groupId, groupTitle: String(s.groupTitle || ''), optionId: s.optionId, label: String(s.label || ''), price: Number(s.price) || 0 }))
    : []
  const instructions = typeof raw.instructions === 'string' ? raw.instructions.slice(0, 140) : ''
  return {
    key: makeCartKey(raw.itemId, selections, instructions),
    itemId: raw.itemId,
    restaurantId: raw.restaurantId,
    name: item.name,
    image: item.image,
    veg: item.veg,
    basePrice: Number(raw.basePrice) || item.price,
    selections,
    instructions,
    unitPrice,
    quantity: Math.min(quantity, MAX_LINE_QUANTITY),
  }
}

function loadCart() {
  const raw = readStorage(STORAGE_KEYS.cart, null)
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.items)) return EMPTY
  const lines = []
  for (const candidate of raw.items) {
    const line = sanitizeLine(candidate)
    if (!line) continue
    const existing = lines.find((l) => l.key === line.key)
    if (existing) existing.quantity = Math.min(existing.quantity + line.quantity, MAX_LINE_QUANTITY)
    else lines.push(line)
  }
  if (!lines.length) return EMPTY
  // A cart holds a single restaurant — keep only lines from the first one
  const restaurantId = lines[0].restaurantId
  const items = lines.filter((l) => l.restaurantId === restaurantId)
  return { restaurantId, items, coupon: typeof raw.coupon === 'string' ? normalizeCode(raw.coupon) : null }
}

function reducer(state, action) {
  switch (action.type) {
    case 'ADD': {
      const { line } = action
      const items = state.items.some((l) => l.key === line.key)
        ? state.items.map((l) => (l.key === line.key ? { ...l, quantity: Math.min(l.quantity + line.quantity, MAX_LINE_QUANTITY) } : l))
        : [...state.items, line]
      return { ...state, restaurantId: line.restaurantId, items }
    }
    case 'REPLACE':
      return { restaurantId: action.line.restaurantId, items: [action.line], coupon: null }
    case 'ADD_MANY': {
      let items = state.restaurantId === action.restaurantId ? [...state.items] : []
      for (const line of action.lines) {
        const idx = items.findIndex((l) => l.key === line.key)
        if (idx >= 0) items[idx] = { ...items[idx], quantity: Math.min(items[idx].quantity + line.quantity, MAX_LINE_QUANTITY) }
        else items = [...items, line]
      }
      return { restaurantId: action.restaurantId, items, coupon: state.restaurantId === action.restaurantId ? state.coupon : null }
    }
    case 'SET_QTY': {
      const quantity = Math.max(0, Math.min(Math.floor(action.quantity), MAX_LINE_QUANTITY))
      const items = state.items
        .map((l) => (l.key === action.key ? { ...l, quantity } : l))
        .filter((l) => l.quantity > 0)
      return items.length ? { ...state, items } : EMPTY
    }
    case 'REMOVE': {
      const items = state.items.filter((l) => l.key !== action.key)
      return items.length ? { ...state, items } : EMPTY
    }
    case 'CLEAR':
      return EMPTY
    case 'COUPON':
      return { ...state, coupon: action.code }
    default:
      return state
  }
}

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadCart)
  const [conflict, setConflict] = useState(null)
  const { isPlus } = useAuth()

  useEffect(() => {
    writeStorage(STORAGE_KEYS.cart, state)
  }, [state])

  const restaurant = useMemo(() => getRestaurant(state.restaurantId), [state.restaurantId])

  const totals = useMemo(
    () => calculateTotals({ items: state.items, deliveryFee: restaurant?.deliveryFee ?? 0, couponCode: state.coupon, isPlus }),
    [state.items, state.coupon, restaurant, isPlus],
  )

  /** payload: { restaurant, item, selections, instructions, quantity }. Returns 'added' | 'conflict'. */
  const addItem = useCallback(
    (payload) => {
      const line = buildLine(payload)
      if (state.restaurantId && state.restaurantId !== line.restaurantId && state.items.length) {
        setConflict({ line, from: getRestaurant(state.restaurantId)?.name ?? 'another restaurant', to: payload.restaurant.name })
        return 'conflict'
      }
      dispatch({ type: 'ADD', line })
      return 'added'
    },
    [state.restaurantId, state.items.length],
  )

  const confirmConflict = useCallback(() => {
    if (conflict) dispatch({ type: 'REPLACE', line: conflict.line })
    setConflict(null)
  }, [conflict])
  const cancelConflict = useCallback(() => setConflict(null), [])

  const addMany = useCallback((restaurantId, lines) => dispatch({ type: 'ADD_MANY', restaurantId, lines }), [])
  const setQuantity = useCallback((key, quantity) => dispatch({ type: 'SET_QTY', key, quantity }), [])
  const removeItem = useCallback((key) => dispatch({ type: 'REMOVE', key }), [])
  const clearCart = useCallback(() => dispatch({ type: 'CLEAR' }), [])

  const applyCoupon = useCallback(
    (code) => {
      const normalized = normalizeCode(code)
      if (!state.items.length) return { ok: false, message: 'Add items to your cart before applying a coupon.' }
      if (state.coupon && state.coupon === normalized) return { ok: false, message: `${normalized} is already applied.` }
      if (state.coupon) return { ok: false, message: `${state.coupon} is already applied. Remove it first to use a different code.` }
      const result = validateCoupon(normalized, totals.subtotal)
      if (!result.ok) return { ok: false, message: result.reason }
      dispatch({ type: 'COUPON', code: result.coupon.code })
      return { ok: true, message: `${result.coupon.code} applied — ${result.coupon.title}.`, coupon: result.coupon }
    },
    [state.items.length, state.coupon, totals.subtotal],
  )
  const removeCoupon = useCallback(() => dispatch({ type: 'COUPON', code: null }), [])

  const getItemQuantity = useCallback(
    (itemId) => state.items.reduce((sum, l) => (l.itemId === itemId ? sum + l.quantity : sum), 0),
    [state.items],
  )

  const value = useMemo(
    () => ({
      items: state.items,
      restaurantId: state.restaurantId,
      restaurant,
      couponCode: state.coupon,
      totals,
      itemCount: totals.itemCount,
      conflict,
      addItem,
      addMany,
      confirmConflict,
      cancelConflict,
      setQuantity,
      removeItem,
      clearCart,
      applyCoupon,
      removeCoupon,
      getItemQuantity,
    }),
    [state, restaurant, totals, conflict, addItem, addMany, confirmConflict, cancelConflict, setQuantity, removeItem, clearCart, applyCoupon, removeCoupon, getItemQuantity],
  )
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>')
  return ctx
}

