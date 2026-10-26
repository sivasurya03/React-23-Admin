import { useMemo, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useAdmin } from '../context/adminContextValue.js'
import { Alert, Badge, Card, CheckField, ConfirmAction, DataTable, Dialog, Fade, FilterBar, FilterSelect, PageHeader, SearchInput, SelectField, Tabs, TextAreaField, TextField, Toggle } from '../components/ui.jsx'
import { useListState, useRun } from '../components/uiHooks.js'
import FoodImage from '../../components/common/FoodImage.jsx'
import { queryRows } from '../lib/table.js'
import { formatCurrency } from '../../utils/format.js'
import usePageTitle from '../../hooks/usePageTitle.js'

const blankItem = (restaurantId = '') => ({ restaurantId, name: '', price: '', description: '', category: '', veg: true, spicy: false, popular: false, recommended: false, originalPrice: '', image: '', available: true, options: [] })
const fromItem = (i) => ({ restaurantId: i.restaurantId, name: i.name, price: String(i.price), description: i.description, category: i.category, veg: i.veg, spicy: i.spicy, popular: i.popular, recommended: i.recommended, originalPrice: i.originalPrice ? String(i.originalPrice) : '', image: i.image ?? '', available: i.available, options: i.options.map((g) => ({ title: g.title, type: g.type, required: g.required, max: g.max ?? '', options: g.options.map((o) => ({ label: o.label, price: String(o.price) })) })) })

function OptionEditor({ groups, onChange, error }) {
  const setGroup = (i, patch) => onChange(groups.map((g, n) => (n === i ? { ...g, ...patch } : g)))
  const setOpt = (gi, oi, patch) => setGroup(gi, { options: groups[gi].options.map((o, n) => (n === oi ? { ...o, ...patch } : o)) })
  return (
    <fieldset className="sm:col-span-2">
      <legend className="mb-1.5 text-sm font-bold text-ink-700">Customisation options</legend>
      <p className="mb-2 text-xs text-ink-400">Groups such as size or add-ons. Customers see them in the “Customise” step; prices are added to the dish price.</p>
      <div className="space-y-3">
        {groups.map((g, gi) => (
          <div key={gi} className="rounded-2xl border border-ink-200 bg-white p-3">
            <div className="grid gap-2 sm:grid-cols-[1fr_9rem_auto]">
              <input className="input" aria-label={`Group ${gi + 1} title`} placeholder="Group title (e.g. Choose size)" value={g.title} onChange={(e) => setGroup(gi, { title: e.target.value })} />
              <select className="input" aria-label={`Group ${gi + 1} type`} value={g.type} onChange={(e) => setGroup(gi, { type: e.target.value })}><option value="single">Pick one</option><option value="multiple">Pick many</option></select>
              <button type="button" className="btn btn-ghost btn-sm" aria-label={`Remove group ${gi + 1}`} onClick={() => onChange(groups.filter((_, n) => n !== gi))}><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-4"><CheckField label="Required" checked={g.required} onChange={(v) => setGroup(gi, { required: v })} />{g.type === 'multiple' ? <label className="flex items-center gap-2 text-sm font-semibold">Max choices<input type="number" min="1" className="input !min-h-9 !w-20" value={g.max} onChange={(e) => setGroup(gi, { max: e.target.value })} /></label> : null}</div>
            <div className="mt-2 space-y-2">{g.options.map((o, oi) => (
              <div key={oi} className="grid grid-cols-[1fr_6rem_auto] gap-2">
                <input className="input" aria-label={`Group ${gi + 1} option ${oi + 1} label`} placeholder="Option label" value={o.label} onChange={(e) => setOpt(gi, oi, { label: e.target.value })} />
                <input className="input" type="number" min="0" aria-label={`Group ${gi + 1} option ${oi + 1} extra price`} placeholder="+₹" value={o.price} onChange={(e) => setOpt(gi, oi, { price: e.target.value })} />
                <button type="button" className="btn btn-ghost btn-sm !px-2" aria-label="Remove option" onClick={() => setGroup(gi, { options: g.options.filter((_, n) => n !== oi) })}><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
              </div>))}</div>
            <button type="button" className="btn btn-ghost btn-sm mt-2" onClick={() => setGroup(gi, { options: [...g.options, { label: '', price: '0' }] })}><Plus className="h-4 w-4" aria-hidden="true" />Add option</button>
          </div>))}
      </div>
      <button type="button" className="btn btn-ghost btn-sm mt-2" onClick={() => onChange([...groups, { title: '', type: 'single', required: false, max: '', options: [{ label: '', price: '0' }] }])}><Plus className="h-4 w-4" aria-hidden="true" />Add option group</button>
      {error ? <p className="field-error" role="alert">{error}</p> : null}
    </fieldset>
  )
}

function ItemForm({ initial, editingId, onClose }) {
  const { actions, catalog } = useAdmin()
  const run = useRun()
  const [v, setV] = useState(initial)
  const [errors, setErrors] = useState({})
  const set = (k) => (e) => { setV({ ...v, [k]: e.target.value }); setErrors({ ...errors, [k]: undefined }) }
  const restaurant = catalog.all.find((r) => r.id === v.restaurantId)
  const submit = () => {
    const r = actions.saveItem(v, editingId)
    if (r.ok) { run(r, editingId ? 'Dish updated' : 'Dish added'); onClose() } else { setErrors(r.errors ?? {}); if (!r.errors) run(r) }
  }
  return (
    <Dialog open title={editingId ? 'Edit dish' : 'Add dish'} onClose={onClose} size="lg"
      footer={<div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button><button type="button" className="btn btn-primary" onClick={submit}>{editingId ? 'Save changes' : 'Add dish'}</button></div>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="Restaurant" value={v.restaurantId} onChange={set('restaurantId')} error={errors.restaurantId} disabled={Boolean(editingId)} placeholder="Choose a restaurant" options={catalog.all.map((r) => ({ value: r.id, label: r.name }))} className="sm:col-span-2" />
        <TextField label="Dish name" value={v.name} onChange={set('name')} error={errors.name} maxLength={60} />
        <div>
          <TextField label="Category" list="menu-categories" value={v.category} onChange={set('category')} error={errors.category} hint="Pick an existing section or type a new one." />
          <datalist id="menu-categories">{(restaurant?.adminMenu ?? []).map((s) => <option key={s.name} value={s.name} />)}</datalist>
        </div>
        <TextField label="Price (₹)" type="number" min="1" value={v.price} onChange={set('price')} error={errors.price} />
        <TextField label="Original price (₹, optional)" type="number" value={v.originalPrice} onChange={set('originalPrice')} error={errors.originalPrice} hint="Shown struck-through to show a discount." />
        <TextAreaField label="Description" value={v.description} onChange={set('description')} error={errors.description} className="sm:col-span-2" maxLength={200} />
        <TextField label="Image URL (optional)" value={v.image} onChange={set('image')} error={errors.image} className="sm:col-span-2" hint="Leave blank for the restaurant's default photo. No upload is performed in this demo." />
        <div className="flex flex-wrap gap-x-6 gap-y-3 sm:col-span-2"><CheckField label="Vegetarian" checked={v.veg} onChange={(x) => setV({ ...v, veg: x })} /><CheckField label="Spicy" checked={v.spicy} onChange={(x) => setV({ ...v, spicy: x })} /><CheckField label="Bestseller" checked={v.popular} onChange={(x) => setV({ ...v, popular: x })} /><CheckField label="Chef’s pick" checked={v.recommended} onChange={(x) => setV({ ...v, recommended: x })} /><CheckField label="Available now" checked={v.available} onChange={(x) => setV({ ...v, available: x })} /></div>
        <OptionEditor groups={v.options} onChange={(options) => { setV({ ...v, options }); setErrors({ ...errors, options: undefined }) }} error={errors.options} />
      </div>
    </Dialog>
  )
}

function Categories() {
  const { catalog, actions, can } = useAdmin()
  const run = useRun()
  const [rid, setRid] = useState(catalog.all[0]?.id ?? '')
  const [name, setName] = useState('')
  const [err, setErr] = useState('')
  const [rename, setRename] = useState(null)
  const [del, setDel] = useState(null)
  const r = catalog.all.find((x) => x.id === rid)
  const canEdit = can('menu', 'edit')
  return (
    <div className="space-y-4">
      <Card title="Restaurant menu sections" subtitle="Sections group dishes on the customer's restaurant page. Empty sections stay hidden from customers.">
        <SelectField label="Restaurant" value={rid} onChange={(e) => setRid(e.target.value)} options={catalog.all.map((x) => ({ value: x.id, label: x.name }))} className="max-w-sm" />
        {canEdit ? <form className="mt-4 flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); const res = actions.addCategory(rid, name); if (res.ok) { run(res, 'Category added'); setName(''); setErr('') } else setErr(res.error) }}><TextField label="New category" value={name} onChange={(e) => { setName(e.target.value); setErr('') }} error={err} className="w-64" /><button type="submit" className="btn btn-dark btn-sm mb-0.5">Add category</button></form> : null}
        <ul className="mt-5 divide-y divide-ink-200/60">
          {(r?.adminMenu ?? []).map((s) => (
            <li key={s.name} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
              <span><span className="font-bold">{s.name}</span> <Badge>{s.items.length} dish{s.items.length === 1 ? '' : 'es'}</Badge></span>
              {canEdit ? <span className="flex gap-2"><button type="button" className="btn btn-ghost btn-sm" onClick={() => setRename({ from: s.name, to: s.name, err: '' })}>Rename</button>{can('menu', 'delete') ? <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDel(s.name)}>Delete</button> : null}</span> : null}
            </li>))}
          {r && r.adminMenu.length === 0 ? <li className="py-6 text-center text-sm text-ink-500">No categories yet.</li> : null}
        </ul>
      </Card>
      <Dialog open={Boolean(rename)} title="Rename category" onClose={() => setRename(null)} size="sm" footer={<div className="flex justify-end gap-3"><button type="button" className="btn btn-ghost" onClick={() => setRename(null)}>Cancel</button><button type="button" className="btn btn-primary" onClick={() => { const res = actions.renameCategory(rid, rename.from, rename.to); if (res.ok) { run(res, 'Category renamed'); setRename(null) } else setRename({ ...rename, err: res.error }) }}>Rename</button></div>}>
        {rename ? <TextField label="Category name" value={rename.to} onChange={(e) => setRename({ ...rename, to: e.target.value, err: '' })} error={rename.err} /> : null}
      </Dialog>
      <ConfirmAction open={Boolean(del)} title="Delete category?" message={`Delete “${del}”? Only empty categories can be deleted.`} confirmLabel="Delete" danger onCancel={() => setDel(null)} onConfirm={() => { const res = actions.deleteCategory(rid, del); if (res.ok) { setDel(null); run(res, 'Category deleted') } return res }} />
    </div>
  )
}

export default function Menu() {
  usePageTitle('Menu — Craveo Admin')
  const { catalog, actions, can } = useAdmin()
  const run = useRun()
  const [tab, setTab] = useState('items')
  const list = useListState({ filters: { restaurant: 'all', category: 'all', availability: 'all', veg: 'all' }, sortKey: 'name' })
  const [form, setForm] = useState(null)
  const [del, setDel] = useState(null)
  const rows = useMemo(() => catalog.all.flatMap((r) => r.items.map((i) => ({ ...i, restaurantName: r.name, restaurantHidden: !(r.admin.status === 'approved' && r.admin.active) }))), [catalog])
  const categories = useMemo(() => [...new Set(rows.map((i) => i.category))].sort().map((c) => ({ value: c, label: c })), [rows])
  const result = queryRows(rows, {
    search: list.search, searchKeys: ['name', 'restaurantName', 'category', 'description'], filters: list.filters,
    filterFns: { restaurant: (i, v) => i.restaurantId === v, category: (i, v) => i.category === v, availability: (i, v) => (v === 'available') === i.available, veg: (i, v) => (v === 'veg') === i.veg },
    sortKey: list.sortKey, sortDir: list.sortDir, sorters: { name: (i) => i.name.toLowerCase(), price: (i) => i.price, restaurant: (i) => i.restaurantName.toLowerCase() }, page: list.page, pageSize: list.pageSize,
  })
  const canEdit = can('menu', 'edit')
  const columns = [
    { key: 'name', header: 'Dish', sortable: true, render: (i) => <div className="flex items-center gap-3"><FoodImage photo={i.image} category="pizza" alt="" width={96} className="h-10 w-10 shrink-0 rounded-lg" /><span className="min-w-0"><span className="block truncate font-bold">{i.name}</span><span className="text-xs text-ink-500">{i.veg ? 'Veg' : 'Non-veg'}{i.options.length ? ` · ${i.options.length} option group${i.options.length > 1 ? 's' : ''}` : ''}</span></span></div> },
    { key: 'restaurant', header: 'Restaurant', sortable: true, render: (i) => <span>{i.restaurantName}{i.restaurantHidden ? <Badge tone="warn" className="ml-1">Hidden</Badge> : null}</span> },
    { key: 'category', header: 'Category', render: (i) => i.category },
    { key: 'price', header: 'Price', sortable: true, render: (i) => <span className="font-bold tabular-nums">{formatCurrency(i.price)}</span> },
    { key: 'available', header: 'Available', render: (i) => <span onClick={(e) => e.stopPropagation()}><Toggle checked={i.available} disabled={!canEdit} label={`${i.name} available`} onChange={(v) => run(actions.setItemAvailable(i.id, v), v ? 'Marked available' : 'Marked sold out')} /></span> },
    { key: 'actions', header: '', render: (i) => <span className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>{canEdit ? <button type="button" className="btn btn-ghost btn-sm !px-2" aria-label={`Edit ${i.name}`} onClick={() => { const full = catalog.all.find((r) => r.id === i.restaurantId)?.items.find((x) => x.id === i.id); setForm({ initial: fromItem(full), id: i.id }) }}><Pencil className="h-4 w-4" aria-hidden="true" /></button> : null}{can('menu', 'delete') ? <button type="button" className="btn btn-ghost btn-sm !px-2" aria-label={`Delete ${i.name}`} onClick={() => setDel(i)}><Trash2 className="h-4 w-4" aria-hidden="true" /></button> : null}</span> },
  ]
  return (
    <Fade>
      <PageHeader title="Menu" description="Dishes, availability and categories. Changes show in the customer app the next time a menu page loads." actions={can('menu', 'create') ? <button type="button" className="btn btn-primary" onClick={() => setForm({ initial: blankItem(list.filters.restaurant !== 'all' ? list.filters.restaurant : ''), id: null })}><Plus className="h-4 w-4" aria-hidden="true" />Add dish</button> : null} />
      <Tabs tabs={[{ id: 'items', label: 'Food items', count: rows.length }, { id: 'categories', label: 'Categories' }]} value={tab} onChange={setTab} label="Menu views" />
      {tab === 'categories' ? <Categories /> : (
        <>
          <Alert tone="info" className="mb-4">Sold-out dishes stay visible to customers but cannot be added to the cart. Restaurants that are inactive or not approved are hidden entirely.</Alert>
          <FilterBar>
            <SearchInput value={list.search} onChange={list.setSearch} placeholder="Dish, restaurant, category…" label="Search dishes" />
            <FilterSelect label="Restaurant" value={list.filters.restaurant} onChange={(v) => list.setFilter('restaurant', v)} options={catalog.all.map((r) => ({ value: r.id, label: r.name }))} allLabel="All restaurants" />
            <FilterSelect label="Category" value={list.filters.category} onChange={(v) => list.setFilter('category', v)} options={categories} allLabel="All categories" />
            <FilterSelect label="Availability" value={list.filters.availability} onChange={(v) => list.setFilter('availability', v)} options={[{ value: 'available', label: 'Available' }, { value: 'soldout', label: 'Sold out' }]} allLabel="Any availability" />
            <FilterSelect label="Diet" value={list.filters.veg} onChange={(v) => list.setFilter('veg', v)} options={[{ value: 'veg', label: 'Vegetarian' }, { value: 'nonveg', label: 'Non-veg' }]} allLabel="Veg + non-veg" />
          </FilterBar>
          <DataTable caption="Menu items" columns={columns} result={result} rowKey={(i) => i.id} sort={{ key: list.sortKey, dir: list.sortDir }} onSort={list.toggleSort} onPage={list.setPage} onPageSize={list.setPageSize} empty={<div className="px-4 py-12 text-center"><p className="font-bold">No dishes found</p><p className="text-sm text-ink-500">Adjust the filters or add a dish.</p></div>} />
        </>
      )}
      {form ? <ItemForm initial={form.initial} editingId={form.id} onClose={() => setForm(null)} /> : null}
      <ConfirmAction open={Boolean(del)} title="Delete dish?" message={del ? `Delete “${del.name}” from ${del.restaurantName}? It disappears from the customer menu. Past orders keep their own copy.` : ''} confirmLabel="Delete dish" danger onCancel={() => setDel(null)} onConfirm={() => { const r = actions.deleteItem(del.id); if (r.ok) { setDel(null); run(r, 'Dish deleted') } return r }} />
    </Fade>
  )
}
