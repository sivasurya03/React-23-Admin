export function buildSelections(item, chosen) {
  const list = []
  for (const group of item.options) {
    for (const optionId of chosen[group.id] ?? []) {
      const opt = group.options.find((o) => o.id === optionId)
      if (opt) list.push({ groupId: group.id, groupTitle: group.title, optionId: opt.id, label: opt.label, price: opt.price })
    }
  }
  return list
}
