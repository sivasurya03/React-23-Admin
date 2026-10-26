// Every admin mutation lives here. Each action: (1) checks the current admin's permission,
// (2) validates with the pure libs, (3) applies the change, (4) writes an audit entry.
// Returns { ok, error?, ... } — never throws into the UI. Client-side checks only (see README).
import { can } from '../lib/rbac.js'
import * as orderLib from '../lib/orders.js'
import * as finance from '../lib/finance.js'
import * as supportLib from '../lib/support.js'
import { uniqueId, slugify } from '../lib/catalog.js'
import { validateRestaurant, validateCommission, validateMenuItem, validatePartner, validateZone, validateSettings, validateTicket } from '../lib/validators.js'
import { validateCouponDraft, normalizeCouponDraft, validateCampaign, validateReferral, normalizeCode } from '../lib/coupons.js'
import { validateStatusChange } from '../lib/customers.js'
import { ROLES, MODULES, ACTIONS, DEFAULT_MATRIX, normalizeMatrix } from '../lib/rbac.js'
import { DEFAULT_SETTINGS } from './seed.js'
import { hashPassword, randomSalt } from '../../utils/passwordHash.js'
import { isValidEmail } from '../../utils/validation.js'
import { uid, blank } from '../lib/util.js'

const fail = (error) => ({ ok: false, error })
const MAX_AUDIT = 400
const REQUIRED_RESTAURANT_DOCS = ['FSSAI licence', 'GST certificate', 'PAN card', 'Bank proof']
const REQUIRED_PARTNER_DOCS = ['ID proof', 'Driving licence', 'Vehicle RC']
const DOC_STATUSES = ['missing', 'submitted', 'verified', 'rejected']
const text = (v) => String(v ?? '').trim()

const OPEN = (o) => !o.cancelled && o.statusIndex < 4

export function createActions(env) {
  const { commit, getState, getOrders, getCatalog, getActor, updateLiveOrder } = env

  const act = (module, action, fn) => {
    const actor = getActor()
    if (!actor) return fail('Your admin session has expired. Sign in again.')
    if (!can(getState().matrix, actor.role, module, action)) return fail('Your role does not have permission to do this.')
    try {
      return fn(actor)
    } catch {
      return fail('Something went wrong and nothing was saved. Please try again.')
    }
  }

  const audit = (actor, entry) =>
    commit((s) => ({
      ...s,
      audit: [{ id: uid('AU'), at: new Date().toISOString(), actor: { id: actor.id, name: actor.name, role: actor.role }, before: null, after: null, note: '', ...entry }, ...s.audit].slice(0, MAX_AUDIT),
    }))

  const notify = (type, title, body, link) =>
    commit((s) => (s.settings.notifications?.[type] === false ? s : {
      ...s, notifications: [{ id: uid('NT'), type, title, body, at: new Date().toISOString(), read: false, link }, ...s.notifications].slice(0, 120),
    }))

  const overlay = (fn) => commit((s) => ({ ...s, overlay: fn(s.overlay) }))
  const restaurantOf = (id) => getCatalog().all.find((r) => r.id === id)
  const entity = (type, id, label) => ({ entity: { type, id, label } })

  // ---------- orders ----------
  function mutateOrder(id, producer) {
    const target = getOrders().find((o) => o.id === id)
    if (!target) return fail('Order not found.')
    const { source, ...plain } = target
    const result = producer(plain)
    if (!result.ok) return result
    if (source === 'demo') commit((s) => ({ ...s, demoOrders: s.demoOrders.map((o) => (o.id === id ? result.order : o)) }))
    else updateLiveOrder(id, () => result.order)
    return { ...result, previous: plain, source }
  }

  const orderActions = {
    advanceOrder: (id) => act('orders', 'edit', (actor) => {
      const r = mutateOrder(id, (o) => orderLib.advance(o, { by: actor.name }))
      if (r.ok) audit(actor, { action: 'order.advance', ...entity('order', id, id), before: { status: orderLib.statusLabel(r.previous) }, after: { status: orderLib.statusLabel(r.order) } })
      return r
    }),
    cancelOrder: (id, reason) => act('orders', 'edit', (actor) => {
      const r = mutateOrder(id, (o) => orderLib.cancel(o, { reason, by: actor.name }))
      if (r.ok) {
        audit(actor, { action: 'order.cancel', ...entity('order', id, id), before: { status: orderLib.statusLabel(r.previous) }, after: { status: 'Cancelled', refundRequestCreated: r.refundCreated }, note: text(reason) })
        if (r.refundCreated) notify('refunds', 'Refund request created', `${id} was cancelled — a refund request is waiting for review.`, '/admin/orders?tab=refunds')
      }
      return r
    }),
    assignPartner: (orderId, partnerId) => act('orders', 'edit', (actor) => {
      const st = getState()
      const partner = st.partners.find((p) => p.id === partnerId)
      const r = mutateOrder(orderId, (o) => orderLib.assignPartner(o, partner, { orders: getOrders(), maxActive: st.settings.partnerMaxActive, by: actor.name }))
      if (r.ok) audit(actor, { action: r.previous.partnerId ? 'order.reassign' : 'order.assign', ...entity('order', orderId, orderId), before: { partner: r.previous.partnerId ? r.previous.partner?.name : null }, after: { partner: partner.name } })
      return r
    }),
    requestRefund: (orderId, { reason, amount }) => act('orders', 'refund', (actor) => {
      const r = mutateOrder(orderId, (o) => orderLib.createRefund(o, { reason, amount, requestedBy: 'admin', by: actor.name, windowDays: 3650 }))
      if (r.ok) audit(actor, { action: 'refund.create', ...entity('order', orderId, orderId), after: { amount: r.order.refund.amount, status: 'requested' }, note: text(reason) })
      return r
    }),
    reviewRefund: (orderId, { decision, note }) => act('orders', 'refund', (actor) => {
      const r = mutateOrder(orderId, (o) => orderLib.reviewRefund(o, { decision, note, by: actor.name }))
      if (r.ok) audit(actor, { action: `refund.${decision}`, ...entity('order', orderId, orderId), before: { status: 'requested' }, after: { status: r.order.refund.status, amount: r.order.refund.amount, simulated: true }, note: text(note) })
      return r
    }),
  }

  // ---------- restaurants ----------
  const newDocs = () => REQUIRED_RESTAURANT_DOCS.map((type) => ({ type, status: 'missing', fileName: '' }))
  const toList = (v) => (Array.isArray(v) ? v : String(v ?? '').split(',')).map((x) => text(x)).filter(Boolean)

  const restaurantActions = {
    saveRestaurant: (values, id = null, { approveNow = false } = {}) => act('restaurants', id ? 'edit' : 'create', (actor) => {
      const cat = getCatalog()
      const current = id ? restaurantOf(id) : null
      if (id && !current) return fail('Restaurant not found.')
      const errors = validateRestaurant(values, { existingNames: cat.all.map((r) => r.name), editingName: current?.name })
      if (Object.keys(errors).length) return { ok: false, errors, error: 'Please fix the highlighted fields.' }
      const commission = validateCommission(values.commissionRate)
      if (!commission.ok) return { ok: false, errors: { commissionRate: commission.error }, error: commission.error }
      const cuisines = toList(values.cuisines).length ? toList(values.cuisines) : [text(values.name) && values.primaryCuisine]
      const fields = {
        name: text(values.name), primaryCuisine: values.primaryCuisine, categories: [values.primaryCuisine], cuisines,
        ownerName: text(values.ownerName), phone: text(values.phone), email: text(values.email), area: text(values.area), address: text(values.address),
        about: text(values.about), deliveryTime: Number(values.deliveryTime), deliveryFee: Number(values.deliveryFee), costForTwo: Number(values.costForTwo),
        priceLevel: Number(values.priceLevel), offer: text(values.offer), hours: values.hours.map((h) => ({ day: text(h.day), hours: text(h.hours) })),
      }
      if (id) {
        const before = { name: current.name, deliveryFee: current.deliveryFee, deliveryTime: current.deliveryTime, commissionRate: current.admin.commissionRate, hours: current.hours.map((h) => `${h.day} ${h.hours}`).join('; ') }
        overlay((o) => ({ ...o, restaurants: { ...o.restaurants, [id]: { ...o.restaurants[id], ...fields, commissionRate: commission.value, updatedAt: new Date().toISOString() } } }))
        audit(actor, { action: 'restaurant.update', ...entity('restaurant', id, fields.name), before, after: { name: fields.name, deliveryFee: fields.deliveryFee, deliveryTime: fields.deliveryTime, commissionRate: commission.value, hours: fields.hours.map((h) => `${h.day} ${h.hours}`).join('; ') } })
        return { ok: true, id }
      }
      const newId = uniqueId(fields.name, cat.all.map((r) => r.id))
      const canApprove = approveNow && can(getState().matrix, actor.role, 'restaurants', 'approve')
      const raw = { id: newId, ...fields, demo: false, submittedAt: new Date().toISOString(), application: { status: canApprove ? 'approved' : 'pending' }, commissionRate: commission.value, documents: newDocs().map((d) => (canApprove ? { ...d, status: 'verified', fileName: 'verified by admin' } : d)) }
      overlay((o) => ({ ...o, customRestaurants: [...o.customRestaurants, raw] }))
      audit(actor, { action: 'restaurant.register', ...entity('restaurant', newId, fields.name), after: { status: raw.application.status } })
      if (!canApprove) notify('restaurants', 'New restaurant application', `${fields.name} is waiting for document review.`, '/admin/restaurants?tab=applications')
      return { ok: true, id: newId }
    }),
    setDocumentStatus: (id, type, status, fileName = '') => act('restaurants', 'approve', (actor) => {
      const r = restaurantOf(id)
      if (!r) return fail('Restaurant not found.')
      if (!DOC_STATUSES.includes(status)) return fail('Unknown document status.')
      const docs = (r.admin.documents.length ? r.admin.documents : newDocs()).map((d) => (d.type === type ? { ...d, status, fileName: fileName || d.fileName } : d))
      overlay((o) => ({ ...o, restaurants: { ...o.restaurants, [id]: { ...o.restaurants[id], documents: docs } } }))
      audit(actor, { action: 'restaurant.document', ...entity('restaurant', id, r.name), before: { [type]: r.admin.documents.find((d) => d.type === type)?.status ?? 'missing' }, after: { [type]: status } })
      return { ok: true }
    }),
    submitDocument: (id, type, fileName) => act('restaurants', 'edit', (actor) => {
      const r = restaurantOf(id)
      if (!r) return fail('Restaurant not found.')
      if (text(fileName).length < 3) return fail('Enter the document file name (only the name is recorded — no file is uploaded).')
      const docs = (r.admin.documents.length ? r.admin.documents : newDocs()).map((d) => (d.type === type ? { ...d, status: 'submitted', fileName: text(fileName) } : d))
      overlay((o) => ({ ...o, restaurants: { ...o.restaurants, [id]: { ...o.restaurants[id], documents: docs } } }))
      audit(actor, { action: 'restaurant.document_submit', ...entity('restaurant', id, r.name), after: { [type]: 'submitted' } })
      return { ok: true }
    }),
    approveRestaurant: (id) => act('restaurants', 'approve', (actor) => {
      const r = restaurantOf(id)
      if (!r) return fail('Restaurant not found.')
      if (r.admin.status === 'approved') return fail('Already approved.')
      const docs = r.admin.documents.length ? r.admin.documents : newDocs()
      const outstanding = REQUIRED_RESTAURANT_DOCS.filter((t) => docs.find((d) => d.type === t)?.status !== 'verified')
      if (outstanding.length) return fail(`Verify these documents first: ${outstanding.join(', ')}.`)
      overlay((o) => ({ ...o, restaurants: { ...o.restaurants, [id]: { ...o.restaurants[id], status: 'approved', rejectionReason: '', updatedAt: new Date().toISOString() } } }))
      audit(actor, { action: 'restaurant.approve', ...entity('restaurant', id, r.name), before: { status: r.admin.status }, after: { status: 'approved' } })
      return { ok: true }
    }),
    rejectRestaurant: (id, reason) => act('restaurants', 'approve', (actor) => {
      const r = restaurantOf(id)
      if (!r) return fail('Restaurant not found.')
      if (text(reason).length < 5) return fail('Enter a rejection reason (5+ characters).')
      overlay((o) => ({ ...o, restaurants: { ...o.restaurants, [id]: { ...o.restaurants[id], status: 'rejected', rejectionReason: text(reason), updatedAt: new Date().toISOString() } } }))
      audit(actor, { action: 'restaurant.reject', ...entity('restaurant', id, r.name), before: { status: r.admin.status }, after: { status: 'rejected' }, note: text(reason) })
      return { ok: true }
    }),
    setRestaurantActive: (id, active) => act('restaurants', 'edit', (actor) => {
      const r = restaurantOf(id)
      if (!r) return fail('Restaurant not found.')
      if (r.admin.status !== 'approved') return fail('Only approved restaurants can be switched on or off.')
      if (!active) {
        const open = getOrders().filter((o) => o.restaurant?.id === id && OPEN(o)).length
        if (open) return fail(`${open} open order${open === 1 ? '' : 's'} must finish before deactivating this restaurant.`)
      }
      overlay((o) => ({ ...o, restaurants: { ...o.restaurants, [id]: { ...o.restaurants[id], active: Boolean(active), updatedAt: new Date().toISOString() } } }))
      audit(actor, { action: active ? 'restaurant.activate' : 'restaurant.deactivate', ...entity('restaurant', id, r.name), before: { active: r.admin.active }, after: { active: Boolean(active) } })
      return { ok: true }
    }),
    setCommission: (id, value) => act('restaurants', 'edit', (actor) => {
      const r = restaurantOf(id)
      if (!r) return fail('Restaurant not found.')
      const v = validateCommission(value)
      if (!v.ok) return fail(v.error)
      overlay((o) => ({ ...o, restaurants: { ...o.restaurants, [id]: { ...o.restaurants[id], commissionRate: v.value, updatedAt: new Date().toISOString() } } }))
      audit(actor, { action: 'restaurant.commission', ...entity('restaurant', id, r.name), before: { commissionRate: r.admin.commissionRate ?? 'platform default' }, after: { commissionRate: v.value ?? 'platform default' }, note: 'Applies to new orders only; past orders keep their snapshot.' })
      return { ok: true }
    }),
    deleteRestaurant: (id) => act('restaurants', 'delete', (actor) => {
      const r = restaurantOf(id)
      if (!r) return fail('Restaurant not found.')
      const open = getOrders().filter((o) => o.restaurant?.id === id && OPEN(o)).length
      if (open) return fail(`Cannot delete: ${open} open order${open === 1 ? '' : 's'} still in progress.`)
      overlay((o) => {
        const { [id]: _gone, ...rest } = o.restaurants
        const { [id]: _cats, ...cats } = o.extraCategories
        if (r.admin.isCustom) return { ...o, restaurants: rest, extraCategories: cats, customRestaurants: o.customRestaurants.filter((x) => x.id !== id), customItems: o.customItems.filter((i) => i.restaurantId !== id) }
        return { ...o, restaurants: rest, extraCategories: cats, deletedRestaurants: [...o.deletedRestaurants, id] }
      })
      audit(actor, { action: 'restaurant.delete', ...entity('restaurant', id, r.name), before: { status: r.admin.status } , note: 'Historical orders keep the restaurant name snapshot.' })
      return { ok: true }
    }),
  }

  // ---------- menu ----------
  const normalizeOptions = (groups) => (Array.isArray(groups) ? groups : []).map((g, gi) => {
    const options = g.options.map((o, oi) => ({ id: slugify(o.label) || `opt-${oi + 1}`, label: text(o.label), price: Number(o.price) || 0 }))
    const seen = new Set()
    options.forEach((o) => { let id = o.id; let n = 2; while (seen.has(id)) { id = `${o.id}-${n}`; n += 1 } o.id = id; seen.add(id) })
    return { id: slugify(g.title) || `group-${gi + 1}`, title: text(g.title), type: g.type === 'multiple' ? 'multiple' : 'single', required: Boolean(g.required), options, ...(g.type === 'multiple' && !blank(g.max) ? { max: Number(g.max) } : {}) }
  })

  const findItem = (id) => { for (const r of getCatalog().all) { const item = r.items.find((i) => i.id === id); if (item) return { r, item } } return null }

  const menuActions = {
    saveItem: (values, id = null) => act('menu', id ? 'edit' : 'create', (actor) => {
      const cat = getCatalog()
      const found = id ? findItem(id) : null
      if (id && !found) return fail('Dish not found.')
      const restaurantId = found ? found.r.id : values.restaurantId
      const r = cat.all.find((x) => x.id === restaurantId)
      if (!r) return { ok: false, errors: { restaurantId: 'Choose a restaurant.' }, error: 'Choose a restaurant.' }
      const errors = validateMenuItem({ ...values, restaurantId }, { siblings: r.items, editingId: id })
      if (Object.keys(errors).length) return { ok: false, errors, error: 'Please fix the highlighted fields.' }
      const fields = {
        name: text(values.name), price: Number(values.price), description: text(values.description), category: text(values.category), veg: values.veg !== false,
        spicy: Boolean(values.spicy), popular: Boolean(values.popular), recommended: Boolean(values.recommended),
        originalPrice: blank(values.originalPrice) ? null : Number(values.originalPrice), image: text(values.image) || null, options: normalizeOptions(values.options), available: values.available !== false,
      }
      if (id) {
        const b = found.item
        overlay((o) => ({ ...o, items: { ...o.items, [id]: { ...o.items[id], ...fields } } }))
        audit(actor, { action: 'menu.update', ...entity('menu_item', id, fields.name), before: { name: b.name, price: b.price, available: b.available, category: b.category }, after: { name: fields.name, price: fields.price, available: fields.available, category: fields.category } })
        return { ok: true, id }
      }
      const taken = cat.all.flatMap((x) => x.items.map((i) => i.id)).concat(getState().overlay.deletedItems)
      const newId = uniqueId(`${restaurantId}-${fields.name}`, taken)
      overlay((o) => ({ ...o, customItems: [...o.customItems, { id: newId, restaurantId, rating: null, ...fields }] }))
      audit(actor, { action: 'menu.create', ...entity('menu_item', newId, fields.name), after: { restaurant: r.name, price: fields.price, category: fields.category } })
      return { ok: true, id: newId }
    }),
    setItemAvailable: (id, available) => act('menu', 'edit', (actor) => {
      const f = findItem(id)
      if (!f) return fail('Dish not found.')
      overlay((o) => ({ ...o, items: { ...o.items, [id]: { ...o.items[id], available: Boolean(available) } } }))
      audit(actor, { action: 'menu.availability', ...entity('menu_item', id, f.item.name), before: { available: f.item.available }, after: { available: Boolean(available) } })
      return { ok: true }
    }),
    deleteItem: (id) => act('menu', 'delete', (actor) => {
      const f = findItem(id)
      if (!f) return fail('Dish not found.')
      const custom = getState().overlay.customItems.some((i) => i.id === id)
      overlay((o) => {
        const { [id]: _gone, ...items } = o.items
        return custom ? { ...o, items, customItems: o.customItems.filter((i) => i.id !== id) } : { ...o, items, deletedItems: [...o.deletedItems, id] }
      })
      audit(actor, { action: 'menu.delete', ...entity('menu_item', id, f.item.name), before: { restaurant: f.r.name, price: f.item.price }, note: 'Past orders keep the dish name and price they were placed with.' })
      return { ok: true }
    }),
    addCategory: (restaurantId, name) => act('menu', 'edit', (actor) => {
      const r = restaurantOf(restaurantId)
      const n = text(name)
      if (!r) return fail('Restaurant not found.')
      if (n.length < 2 || n.length > 30) return fail('Category names must be 2–30 characters.')
      if (r.adminMenu.some((s) => s.name.toLowerCase() === n.toLowerCase())) return fail('This restaurant already has that category.')
      overlay((o) => ({ ...o, extraCategories: { ...o.extraCategories, [restaurantId]: [...(o.extraCategories[restaurantId] ?? []), n] } }))
      audit(actor, { action: 'menu.category_add', ...entity('restaurant', restaurantId, r.name), after: { category: n } })
      return { ok: true }
    }),
    renameCategory: (restaurantId, from, to) => act('menu', 'edit', (actor) => {
      const r = restaurantOf(restaurantId)
      const n = text(to)
      if (!r) return fail('Restaurant not found.')
      if (n.length < 2 || n.length > 30) return fail('Category names must be 2–30 characters.')
      if (r.adminMenu.some((s) => s.name.toLowerCase() === n.toLowerCase() && s.name !== from)) return fail('This restaurant already has that category.')
      overlay((o) => {
        const items = { ...o.items }
        r.items.filter((i) => i.category === from).forEach((i) => { items[i.id] = { ...items[i.id], category: n } })
        const extra = (o.extraCategories[restaurantId] ?? []).map((c) => (c === from ? n : c))
        return { ...o, items, extraCategories: { ...o.extraCategories, [restaurantId]: extra } }
      })
      audit(actor, { action: 'menu.category_rename', ...entity('restaurant', restaurantId, r.name), before: { category: from }, after: { category: n } })
      return { ok: true }
    }),
    deleteCategory: (restaurantId, name) => act('menu', 'delete', (actor) => {
      const r = restaurantOf(restaurantId)
      if (!r) return fail('Restaurant not found.')
      if (r.items.some((i) => i.category === name)) return fail('Move or delete the dishes in this category first.')
      overlay((o) => ({ ...o, extraCategories: { ...o.extraCategories, [restaurantId]: (o.extraCategories[restaurantId] ?? []).filter((c) => c !== name) } }))
      audit(actor, { action: 'menu.category_delete', ...entity('restaurant', restaurantId, r.name), before: { category: name } })
      return { ok: true }
    }),
  }

  // ---------- delivery partners ----------
  const partnerOf = (id) => getState().partners.find((p) => p.id === id)
  const patchPartner = (id, patch) => commit((s) => ({ ...s, partners: s.partners.map((p) => (p.id === id ? { ...p, ...patch } : p)) }))
  const activeLoad = (id) => getOrders().filter((o) => o.partnerId === id && OPEN(o)).length

  const partnerActions = {
    savePartner: (values, id = null) => act('partners', id ? 'edit' : 'create', (actor) => {
      const st = getState()
      const errors = validatePartner(values, { existing: st.partners, editingId: id })
      if (Object.keys(errors).length) return { ok: false, errors, error: 'Please fix the highlighted fields.' }
      const fields = { name: text(values.name), phone: text(values.phone), email: text(values.email), vehicle: values.vehicle, plate: text(values.plate).toUpperCase() }
      if (id) {
        const b = partnerOf(id)
        if (!b) return fail('Partner not found.')
        patchPartner(id, fields)
        audit(actor, { action: 'partner.update', ...entity('partner', id, fields.name), before: { name: b.name, phone: b.phone, vehicle: b.vehicle, plate: b.plate }, after: fields })
        return { ok: true, id }
      }
      const newId = uniqueId(`dp-${fields.name}`, st.partners.map((p) => p.id))
      const partner = { id: newId, ...fields, rating: null, verification: 'pending', rejectionReason: '', online: false, active: true, demo: false, joinedAt: new Date().toISOString(), documents: REQUIRED_PARTNER_DOCS.map((type) => ({ type, status: 'missing', fileName: '' })) }
      commit((s) => ({ ...s, partners: [partner, ...s.partners] }))
      audit(actor, { action: 'partner.register', ...entity('partner', newId, fields.name), after: { verification: 'pending' } })
      notify('partners', 'New delivery partner', `${fields.name} registered and needs document review.`, '/admin/delivery-partners?tab=verification')
      return { ok: true, id: newId }
    }),
    setPartnerDocument: (id, type, status, fileName = '') => act('partners', status === 'submitted' ? 'edit' : 'approve', (actor) => {
      const p = partnerOf(id)
      if (!p) return fail('Partner not found.')
      if (!DOC_STATUSES.includes(status)) return fail('Unknown document status.')
      if (status === 'submitted' && text(fileName).length < 3) return fail('Enter the document file name (only the name is recorded — no file is uploaded).')
      patchPartner(id, { documents: p.documents.map((d) => (d.type === type ? { ...d, status, fileName: text(fileName) || d.fileName } : d)) })
      audit(actor, { action: 'partner.document', ...entity('partner', id, p.name), before: { [type]: p.documents.find((d) => d.type === type)?.status }, after: { [type]: status } })
      return { ok: true }
    }),
    setVerification: (id, decision, reason = '') => act('partners', 'approve', (actor) => {
      const p = partnerOf(id)
      if (!p) return fail('Partner not found.')
      if (decision === 'approve') {
        const outstanding = REQUIRED_PARTNER_DOCS.filter((t) => p.documents.find((d) => d.type === t)?.status !== 'verified')
        if (outstanding.length) return fail(`Verify these documents first: ${outstanding.join(', ')}.`)
        patchPartner(id, { verification: 'approved', rejectionReason: '', active: true })
      } else if (decision === 'reject') {
        if (text(reason).length < 5) return fail('Enter a rejection reason (5+ characters).')
        if (activeLoad(id)) return fail('Reassign this partner’s active deliveries before rejecting.')
        patchPartner(id, { verification: 'rejected', rejectionReason: text(reason), online: false })
      } else return fail('Choose approve or reject.')
      audit(actor, { action: `partner.${decision}`, ...entity('partner', id, p.name), before: { verification: p.verification }, after: { verification: decision === 'approve' ? 'approved' : 'rejected' }, note: text(reason) })
      return { ok: true }
    }),
    setOnline: (id, online) => act('partners', 'edit', (actor) => {
      const p = partnerOf(id)
      if (!p) return fail('Partner not found.')
      if (online && p.verification !== 'approved') return fail('Only verified partners can go online.')
      if (online && p.active === false) return fail('This partner account is inactive.')
      if (!online && activeLoad(id)) return fail('Reassign the partner’s active deliveries before setting them offline.')
      patchPartner(id, { online: Boolean(online) })
      audit(actor, { action: online ? 'partner.online' : 'partner.offline', ...entity('partner', id, p.name), before: { online: p.online }, after: { online: Boolean(online) }, note: 'Availability is set manually — there is no live device tracking.' })
      return { ok: true }
    }),
    setPartnerActive: (id, active) => act('partners', 'edit', (actor) => {
      const p = partnerOf(id)
      if (!p) return fail('Partner not found.')
      if (!active && activeLoad(id)) return fail('Reassign the partner’s active deliveries before deactivating.')
      patchPartner(id, { active: Boolean(active), ...(active ? {} : { online: false }) })
      audit(actor, { action: active ? 'partner.activate' : 'partner.deactivate', ...entity('partner', id, p.name), before: { active: p.active }, after: { active: Boolean(active) } })
      return { ok: true }
    }),
    deletePartner: (id) => act('partners', 'delete', (actor) => {
      const p = partnerOf(id)
      if (!p) return fail('Partner not found.')
      if (activeLoad(id)) return fail('Reassign the partner’s active deliveries before deleting.')
      commit((s) => ({ ...s, partners: s.partners.filter((x) => x.id !== id) }))
      audit(actor, { action: 'partner.delete', ...entity('partner', id, p.name), note: 'Past orders keep the partner name snapshot.' })
      return { ok: true }
    }),
  }

  // ---------- customers ----------
  const customerActions = {
    setCustomerStatus: (id, status, reason = '') => act('customers', 'edit', (actor) => {
      const error = validateStatusChange(status, reason)
      if (error) return fail(error)
      const before = getState().customerMeta[id]?.status ?? 'active'
      if (before === status) return fail('The account already has this status.')
      commit((s) => ({ ...s, customerMeta: { ...s.customerMeta, [id]: { status, reason: text(reason), at: new Date().toISOString(), by: actor.name } } }))
      audit(actor, { action: 'customer.status', ...entity('customer', id, id), before: { status: before }, after: { status }, note: text(reason) })
      return { ok: true }
    }),
  }

  // ---------- finance ----------
  const financeCtxNow = () => {
    const st = getState()
    const rates = {}
    getCatalog().all.forEach((r) => { if (Number.isFinite(r.admin.commissionRate)) rates[r.id] = r.admin.commissionRate })
    return { snapshots: st.commissionSnapshots, restaurantRates: rates, defaultRate: st.settings.defaultCommission, payoutPerDelivery: st.settings.partnerPayoutPerDelivery }
  }
  const financeActions = {
    createSettlement: (restaurantId) => act('finance', 'create', (actor) => {
      const st = getState()
      const r = restaurantOf(restaurantId)
      const name = r?.name ?? getOrders().find((o) => o.restaurant?.id === restaurantId)?.restaurant?.name ?? restaurantId
      const res = finance.buildSettlement({ orders: getOrders(), restaurantId, restaurantName: name, settlements: st.settlements, ctx: financeCtxNow(), by: actor.name })
      if (!res.ok) return res
      commit((s) => ({ ...s, settlements: [res.record, ...s.settlements] }))
      audit(actor, { action: 'settlement.create', ...entity('settlement', res.record.id, name), after: { orders: res.record.orderCount, net: res.record.net, status: 'pending', simulated: true } })
      return res
    }),
    markSettlementPaid: (id) => act('finance', 'approve', (actor) => {
      const rec = getState().settlements.find((s) => s.id === id)
      if (!rec) return fail('Settlement not found.')
      const res = finance.markPaid(rec)
      if (!res.ok) return res
      commit((s) => ({ ...s, settlements: s.settlements.map((x) => (x.id === id ? res.record : x)) }))
      audit(actor, { action: 'settlement.paid', ...entity('settlement', id, rec.restaurantName), before: { status: 'pending' }, after: { status: 'paid', simulated: true }, note: 'Simulation only — no money was transferred.' })
      return res
    }),
    createPayout: (partnerId) => act('finance', 'create', (actor) => {
      const st = getState()
      const p = partnerOf(partnerId)
      const name = p?.name ?? getOrders().find((o) => o.partnerId === partnerId)?.partner?.name ?? partnerId
      const res = finance.buildPayout({ orders: getOrders(), partnerId, partnerName: name, payouts: st.payouts, ctx: financeCtxNow(), by: actor.name })
      if (!res.ok) return res
      commit((s) => ({ ...s, payouts: [res.record, ...s.payouts] }))
      audit(actor, { action: 'payout.create', ...entity('payout', res.record.id, name), after: { orders: res.record.orderCount, amount: res.record.amount, status: 'pending', simulated: true } })
      return res
    }),
    markPayoutPaid: (id) => act('finance', 'approve', (actor) => {
      const rec = getState().payouts.find((s) => s.id === id)
      if (!rec) return fail('Payout not found.')
      const res = finance.markPaid(rec)
      if (!res.ok) return res
      commit((s) => ({ ...s, payouts: s.payouts.map((x) => (x.id === id ? res.record : x)) }))
      audit(actor, { action: 'payout.paid', ...entity('payout', id, rec.partnerName), before: { status: 'pending' }, after: { status: 'paid', simulated: true }, note: 'Simulation only — no money was transferred.' })
      return res
    }),
  }

  // ---------- promotions ----------
  const syncCampaignLinks = (coupons, campaigns) =>
    coupons.map((c) => { const owner = campaigns.find((g) => g.couponCodes.includes(c.code)); return { ...c, campaignId: owner ? owner.id : null } })

  const promoActions = {
    saveCoupon: (draft, editingCode = null) => act('promotions', editingCode ? 'edit' : 'create', (actor) => {
      const st = getState()
      const errors = validateCouponDraft(draft, { existing: st.coupons, editingCode })
      if (Object.keys(errors).length) return { ok: false, errors, error: 'Please fix the highlighted fields.' }
      const coupon = normalizeCouponDraft(editingCode ? { ...draft, code: editingCode } : draft)
      const prev = st.coupons.find((c) => c.code === editingCode)
      const next = { ...coupon, builtin: prev?.builtin ?? false, campaignId: prev?.campaignId ?? null }
      commit((s) => ({ ...s, coupons: editingCode ? s.coupons.map((c) => (c.code === editingCode ? next : c)) : [next, ...s.coupons] }))
      audit(actor, { action: editingCode ? 'coupon.update' : 'coupon.create', ...entity('coupon', next.code, next.code), before: prev ? { type: prev.type, value: prev.value, minSubtotal: prev.minSubtotal, active: prev.active } : null, after: { type: next.type, value: next.value ?? null, minSubtotal: next.minSubtotal, active: next.active } })
      return { ok: true, code: next.code }
    }),
    toggleCoupon: (code, active) => act('promotions', 'edit', (actor) => {
      const c = getState().coupons.find((x) => x.code === code)
      if (!c) return fail('Coupon not found.')
      commit((s) => ({ ...s, coupons: s.coupons.map((x) => (x.code === code ? { ...x, active: Boolean(active) } : x)) }))
      audit(actor, { action: active ? 'coupon.activate' : 'coupon.deactivate', ...entity('coupon', code, code), before: { active: c.active }, after: { active: Boolean(active) } })
      return { ok: true }
    }),
    deleteCoupon: (code) => act('promotions', 'delete', (actor) => {
      const st = getState()
      const c = st.coupons.find((x) => x.code === code)
      if (!c) return fail('Coupon not found.')
      const camp = st.campaigns.find((g) => g.active && g.couponCodes.includes(code))
      if (camp) return fail(`Remove ${code} from the active campaign “${camp.name}” before deleting it.`)
      commit((s) => ({ ...s, coupons: s.coupons.filter((x) => x.code !== code), campaigns: s.campaigns.map((g) => ({ ...g, couponCodes: g.couponCodes.filter((k) => k !== code) })) }))
      audit(actor, { action: 'coupon.delete', ...entity('coupon', code, code), before: { type: c.type, value: c.value ?? null }, note: 'Existing orders keep the discount they were placed with.' })
      return { ok: true }
    }),
    saveCampaign: (draft, id = null) => act('promotions', id ? 'edit' : 'create', (actor) => {
      const st = getState()
      const errors = validateCampaign(draft, { existing: st.campaigns, editingId: id, couponCodes: st.coupons.map((c) => c.code) })
      if (Object.keys(errors).length) return { ok: false, errors, error: 'Please fix the highlighted fields.' }
      const campaign = { id: id ?? uniqueId(`cmp-${draft.name}`, st.campaigns.map((c) => c.id)), name: text(draft.name), description: text(draft.description), couponCodes: draft.couponCodes, startsAt: new Date(draft.startsAt).toISOString(), endsAt: new Date(draft.endsAt).toISOString(), active: draft.active !== false }
      commit((s) => {
        const campaigns = id ? s.campaigns.map((c) => (c.id === id ? campaign : c)) : [campaign, ...s.campaigns]
        return { ...s, campaigns, coupons: syncCampaignLinks(s.coupons, campaigns) }
      })
      audit(actor, { action: id ? 'campaign.update' : 'campaign.create', ...entity('campaign', campaign.id, campaign.name), after: { coupons: campaign.couponCodes.join(', '), active: campaign.active } })
      return { ok: true, id: campaign.id }
    }),
    toggleCampaign: (id, active) => act('promotions', 'edit', (actor) => {
      const c = getState().campaigns.find((x) => x.id === id)
      if (!c) return fail('Campaign not found.')
      commit((s) => ({ ...s, campaigns: s.campaigns.map((x) => (x.id === id ? { ...x, active: Boolean(active) } : x)) }))
      audit(actor, { action: active ? 'campaign.activate' : 'campaign.deactivate', ...entity('campaign', id, c.name), before: { active: c.active }, after: { active: Boolean(active) } })
      return { ok: true }
    }),
    deleteCampaign: (id) => act('promotions', 'delete', (actor) => {
      const c = getState().campaigns.find((x) => x.id === id)
      if (!c) return fail('Campaign not found.')
      commit((s) => ({ ...s, campaigns: s.campaigns.filter((x) => x.id !== id), coupons: s.coupons.map((k) => (k.campaignId === id ? { ...k, campaignId: null } : k)) }))
      audit(actor, { action: 'campaign.delete', ...entity('campaign', id, c.name), note: 'Attached coupons stay available.' })
      return { ok: true }
    }),
    saveReferral: (draft) => act('promotions', 'edit', (actor) => {
      const errors = validateReferral(draft)
      if (Object.keys(errors).length) return { ok: false, errors, error: 'Please fix the highlighted fields.' }
      const before = getState().referral
      const next = { ...before, enabled: Boolean(draft.enabled), referrerReward: Number(draft.referrerReward), refereeReward: Number(draft.refereeReward), minOrderValue: Number(draft.minOrderValue), maxReferralsPerUser: Number(draft.maxReferralsPerUser), rewardExpiryDays: Number(draft.rewardExpiryDays) }
      commit((s) => ({ ...s, referral: next }))
      audit(actor, { action: 'referral.update', ...entity('referral', 'program', 'Referral program'), before: { enabled: before.enabled, referrerReward: before.referrerReward, refereeReward: before.refereeReward }, after: { enabled: next.enabled, referrerReward: next.referrerReward, refereeReward: next.refereeReward } })
      return { ok: true }
    }),
  }

  // ---------- support ----------
  const ticketOf = (id) => getState().tickets.find((t) => t.id === id)
  const saveTicket = (t) => commit((s) => ({ ...s, tickets: s.tickets.map((x) => (x.id === t.id ? t : x)) }))
  const supportActions = {
    createTicket: (values) => act('support', 'create', (actor) => {
      const errors = validateTicket(values)
      if (Object.keys(errors).length) return { ok: false, errors, error: 'Please fix the highlighted fields.' }
      const id = supportLib.nextTicketId(getState().tickets)
      const ticket = supportLib.buildTicket(values, { id, author: actor.name, actorId: actor.id })
      commit((s) => ({ ...s, tickets: [ticket, ...s.tickets] }))
      audit(actor, { action: 'ticket.create', ...entity('ticket', id, ticket.subject), after: { priority: ticket.priority, category: ticket.category } })
      notify('support', 'New support ticket', `${id}: ${ticket.subject}`, '/admin/support')
      return { ok: true, id }
    }),
    replyTicket: (id, body) => act('support', 'edit', (actor) => {
      const t = ticketOf(id)
      if (!t) return fail('Ticket not found.')
      const r = supportLib.appendMessage(t, { author: actor.name, body })
      if (!r.ok) return r
      saveTicket(r.ticket)
      audit(actor, { action: 'ticket.reply', ...entity('ticket', id, t.subject), before: { status: t.status }, after: { status: r.ticket.status }, note: 'Demo: the reply is stored in this panel only — no email or SMS is sent.' })
      return r
    }),
    setTicketStatus: (id, status) => act('support', 'edit', (actor) => {
      const t = ticketOf(id)
      if (!t) return fail('Ticket not found.')
      const r = supportLib.changeStatus(t, status)
      if (!r.ok) return r
      saveTicket(r.ticket)
      audit(actor, { action: 'ticket.status', ...entity('ticket', id, t.subject), before: { status: t.status }, after: { status } })
      return r
    }),
    assignTicket: (id, adminId) => act('support', 'edit', (actor) => {
      const t = ticketOf(id)
      const target = adminId ? getState().adminUsers.find((u) => u.id === adminId && u.active !== false) : null
      if (!t) return fail('Ticket not found.')
      if (adminId && !target) return fail('That admin account is not available.')
      saveTicket({ ...t, assigneeId: adminId || null, updatedAt: new Date().toISOString() })
      audit(actor, { action: 'ticket.assign', ...entity('ticket', id, t.subject), before: { assignee: t.assigneeId }, after: { assignee: adminId || null } })
      return { ok: true }
    }),
    openDispute: (id) => act('support', 'edit', (actor) => {
      const t = ticketOf(id)
      if (!t) return fail('Ticket not found.')
      const r = supportLib.openDispute(t)
      if (!r.ok) return r
      saveTicket(r.ticket)
      audit(actor, { action: 'dispute.open', ...entity('ticket', id, t.subject) })
      return r
    }),
    resolveDispute: (id, note) => act('support', 'approve', (actor) => {
      const t = ticketOf(id)
      if (!t) return fail('Ticket not found.')
      const r = supportLib.resolveDispute(t, note)
      if (!r.ok) return r
      saveTicket(r.ticket)
      audit(actor, { action: 'dispute.resolve', ...entity('ticket', id, t.subject), before: { dispute: 'open' }, after: { dispute: 'resolved' }, note: text(note) })
      return r
    }),
  }

  // ---------- settings & zones ----------
  const settingsActions = {
    saveSettings: (values) => act('settings', 'edit', (actor) => {
      const errors = validateSettings(values)
      if (Object.keys(errors).length) return { ok: false, errors, error: 'Please fix the highlighted fields.' }
      const before = getState().settings
      const num = (k) => Number(values[k])
      const next = {
        ...before, platformName: text(values.platformName), tagline: text(values.tagline), currency: values.currency, locale: values.locale,
        defaultDeliveryFee: num('defaultDeliveryFee'), gstPercent: num('gstPercent'), platformFee: num('platformFee'), freeDeliveryThreshold: num('freeDeliveryThreshold'),
        etaBufferMinutes: num('etaBufferMinutes'), refundWindowDays: num('refundWindowDays'), defaultCommission: num('defaultCommission'),
        partnerPayoutPerDelivery: num('partnerPayoutPerDelivery'), partnerMaxActive: num('partnerMaxActive'),
      }
      commit((s) => ({ ...s, settings: next }))
      const diff = (obj) => Object.fromEntries(Object.keys(next).filter((k) => k !== 'notifications' && before[k] !== next[k]).map((k) => [k, obj[k]]))
      audit(actor, { action: 'settings.update', ...entity('settings', 'platform', 'Platform settings'), before: diff(before), after: diff(next), note: 'New values apply to NEW orders only.' })
      return { ok: true }
    }),
    resetSettings: () => act('settings', 'edit', (actor) => {
      const before = getState().settings
      commit((s) => ({ ...s, settings: { ...DEFAULT_SETTINGS, notifications: { ...DEFAULT_SETTINGS.notifications } } }))
      audit(actor, { action: 'settings.reset', ...entity('settings', 'platform', 'Platform settings'), before: { platformName: before.platformName, gstPercent: before.gstPercent, platformFee: before.platformFee }, after: { platformName: DEFAULT_SETTINGS.platformName, gstPercent: DEFAULT_SETTINGS.gstPercent, platformFee: DEFAULT_SETTINGS.platformFee } })
      return { ok: true }
    }),
    saveNotificationPrefs: (prefs) => act('settings', 'edit', (actor) => {
      const before = getState().settings.notifications
      const next = Object.fromEntries(Object.keys(DEFAULT_SETTINGS.notifications).map((k) => [k, prefs[k] !== false]))
      commit((s) => ({ ...s, settings: { ...s.settings, notifications: next } }))
      audit(actor, { action: 'settings.notifications', ...entity('settings', 'notifications', 'Notification preferences'), before, after: next })
      return { ok: true }
    }),
    saveZone: (values, id = null) => act('settings', id ? 'edit' : 'create', (actor) => {
      const st = getState()
      const errors = validateZone(values, { existing: st.zones, editingId: id })
      if (Object.keys(errors).length) return { ok: false, errors, error: 'Please fix the highlighted fields.' }
      const zone = { id: id ?? uniqueId(`zone-${values.name}`, st.zones.map((z) => z.id)), name: text(values.name), coverage: text(values.coverage), deliveryFee: Number(values.deliveryFee), minOrder: Number(values.minOrder), etaExtra: Number(values.etaExtra), active: values.active !== false }
      const prev = st.zones.find((z) => z.id === id)
      commit((s) => ({ ...s, zones: id ? s.zones.map((z) => (z.id === id ? zone : z)) : [...s.zones, zone] }))
      audit(actor, { action: id ? 'zone.update' : 'zone.create', ...entity('zone', zone.id, zone.name), before: prev ? { deliveryFee: prev.deliveryFee, minOrder: prev.minOrder, active: prev.active } : null, after: { deliveryFee: zone.deliveryFee, minOrder: zone.minOrder, active: zone.active } })
      return { ok: true, id: zone.id }
    }),
    deleteZone: (id) => act('settings', 'delete', (actor) => {
      const z = getState().zones.find((x) => x.id === id)
      if (!z) return fail('Zone not found.')
      commit((s) => ({ ...s, zones: s.zones.filter((x) => x.id !== id) }))
      audit(actor, { action: 'zone.delete', ...entity('zone', id, z.name) })
      return { ok: true }
    }),
  }

  // ---------- roles & admin users ----------
  const superOnly = (actor) => (actor.role === 'super_admin' ? null : fail('Only a Super Admin can change roles and permissions.'))
  const activeSupers = (users) => users.filter((u) => u.role === 'super_admin' && u.active !== false)

  const roleActions = {
    setPermission: (role, moduleId, action, allowed) => act('roles', 'edit', (actor) => {
      const denied = superOnly(actor)
      if (denied) return denied
      if (role === 'super_admin') return fail('Super Admin permissions are fixed so the panel can never be locked out.')
      if (!ROLES.some((r) => r.id === role) || !MODULES.some((m) => m.id === moduleId) || !ACTIONS.some((a) => a.id === action)) return fail('Unknown role, module or action.')
      const current = getState().matrix[role]?.[moduleId] ?? []
      let next = allowed ? [...new Set([...current, action, 'view'])] : current.filter((a) => a !== action)
      if (action === 'view' && !allowed) next = []
      commit((s) => ({ ...s, matrix: { ...s.matrix, [role]: { ...(s.matrix[role] ?? {}), [moduleId]: ACTIONS.map((a) => a.id).filter((a) => next.includes(a)) } } }))
      audit(actor, { action: 'role.permission', ...entity('role', role, ROLES.find((r) => r.id === role).label), before: { [moduleId]: current.join(', ') || 'none' }, after: { [moduleId]: next.join(', ') || 'none' } })
      return { ok: true }
    }),
    resetMatrix: () => act('roles', 'edit', (actor) => {
      const denied = superOnly(actor)
      if (denied) return denied
      commit((s) => ({ ...s, matrix: normalizeMatrix(DEFAULT_MATRIX) }))
      audit(actor, { action: 'role.reset', ...entity('role', 'all', 'Permission matrix'), note: 'Restored least-privilege defaults.' })
      return { ok: true }
    }),
    setAdminRole: (id, role) => act('roles', 'edit', (actor) => {
      const denied = superOnly(actor)
      if (denied) return denied
      const st = getState()
      const u = st.adminUsers.find((x) => x.id === id)
      if (!u) return fail('Admin user not found.')
      if (!ROLES.some((r) => r.id === role)) return fail('Unknown role.')
      if (u.role === role) return fail('The user already has this role.')
      if (u.role === 'super_admin' && activeSupers(st.adminUsers).length <= 1) return fail('There must always be at least one active Super Admin.')
      commit((s) => ({ ...s, adminUsers: s.adminUsers.map((x) => (x.id === id ? { ...x, role } : x)) }))
      audit(actor, { action: 'admin.role', ...entity('admin_user', id, u.name), before: { role: u.role }, after: { role } })
      return { ok: true }
    }),
    setAdminActive: (id, active) => act('roles', 'edit', (actor) => {
      const denied = superOnly(actor)
      if (denied) return denied
      const st = getState()
      const u = st.adminUsers.find((x) => x.id === id)
      if (!u) return fail('Admin user not found.')
      if (!active && u.id === actor.id) return fail('You cannot deactivate your own account.')
      if (!active && u.role === 'super_admin' && activeSupers(st.adminUsers).length <= 1) return fail('There must always be at least one active Super Admin.')
      commit((s) => ({ ...s, adminUsers: s.adminUsers.map((x) => (x.id === id ? { ...x, active: Boolean(active) } : x)) }))
      audit(actor, { action: active ? 'admin.activate' : 'admin.deactivate', ...entity('admin_user', id, u.name), before: { active: u.active }, after: { active: Boolean(active) } })
      return { ok: true }
    }),
    createAdminUser: async ({ name, email, role, password }) => {
      const gate = act('roles', 'create', (actor) => superOnly(actor) ?? { ok: true, actor })
      if (!gate.ok) return gate
      const errors = {}
      if (text(name).length < 2) errors.name = 'Enter the admin’s name.'
      if (!isValidEmail(email)) errors.email = 'Enter a valid email.'
      else if (getState().adminUsers.some((u) => u.email.toLowerCase() === text(email).toLowerCase())) errors.email = 'An admin with this email already exists.'
      if (!ROLES.some((r) => r.id === role)) errors.role = 'Choose a role.'
      if (String(password ?? '').length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) errors.password = 'Use at least 8 characters with letters and numbers.'
      if (Object.keys(errors).length) return { ok: false, errors, error: 'Please fix the highlighted fields.' }
      const salt = randomSalt()
      const hash = await hashPassword(password, salt)
      const user = { id: uid('adm').toLowerCase(), name: text(name), email: text(email).toLowerCase(), role, active: true, salt, hash }
      commit((s) => ({ ...s, adminUsers: [...s.adminUsers, user] }))
      audit(gate.actor, { action: 'admin.create', ...entity('admin_user', user.id, user.name), after: { email: user.email, role } })
      return { ok: true, id: user.id }
    },
  }

  // ---------- notifications ----------
  const notificationActions = {
    markNotificationRead: (id) => commit((s) => ({ ...s, notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) })),
    markAllNotificationsRead: () => commit((s) => ({ ...s, notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
  }

  return { ...orderActions, ...restaurantActions, ...menuActions, ...partnerActions, ...customerActions, ...financeActions, ...promoActions, ...supportActions, ...settingsActions, ...roleActions, ...notificationActions, audit, notify, financeCtxNow }
}

export { normalizeCode }
