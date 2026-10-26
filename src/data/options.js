// Reusable customization presets. A group is:
//   { id, title, required, type: 'single' | 'multiple', max?, options: [{ id, label, price }] }
const g = (id, title, type, required, options, max) => ({ id, title, type, required, options, ...(max ? { max } : {}) })
const o = (id, label, price = 0) => ({ id, label, price })

export const OPTIONS = {
  pizzaSize: () => g('size', 'Choose size', 'single', true, [o('reg', 'Regular · 7"'), o('med', 'Medium · 9"', 120), o('lrg', 'Large · 12"', 240)]),
  pizzaCrust: () => g('crust', 'Choose crust', 'single', true, [o('classic', 'Classic hand-tossed'), o('thin', 'Thin & crispy'), o('cheese', 'Cheese burst', 60)]),
  pizzaToppings: () => g('toppings', 'Extra toppings', 'multiple', false, [o('cheese', 'Extra cheese', 40), o('jalapeno', 'Jalapeños', 25), o('olives', 'Black olives', 30), o('mushroom', 'Mushrooms', 35), o('paneer', 'Paneer cubes', 50)], 4),
  burgerPatty: () => g('patty', 'Patty', 'single', true, [o('single', 'Single patty'), o('double', 'Double patty', 90)]),
  burgerExtras: () => g('extras', 'Add-ons', 'multiple', false, [o('cheese', 'Cheese slice', 25), o('onions', 'Crispy onions', 20), o('fries', 'Make it a fries combo', 79), o('sauce', 'Extra signature sauce', 15)], 4),
  biryaniPortion: (family = 320) => g('portion', 'Portion', 'single', true, [o('reg', 'Regular · serves 1'), o('family', 'Family pack · serves 3', family)]),
  biryaniExtras: () => g('extras', 'Sides', 'multiple', false, [o('raita', 'Onion raita', 30), o('egg', 'Boiled egg', 20), o('gravy', 'Extra gravy', 40), o('salan', 'Mirchi ka salan', 35)], 4),
  dosaExtras: () => g('extras', 'Make it special', 'multiple', false, [o('podi', 'Extra podi', 10), o('sambar', 'Extra sambar', 20), o('ghee', 'Ghee roast style', 30), o('cheese', 'Grated cheese', 40)], 4),
  spice: () => g('spice', 'Spice level', 'single', true, [o('mild', 'Mild'), o('medium', 'Medium'), o('hot', 'Hot'), o('xhot', 'Extra hot')]),
  chineseExtras: () => g('extras', 'Add-ons', 'multiple', false, [o('veg', 'Extra vegetables', 30), o('egg', 'Fried egg', 25), o('sauce', 'Chilli garlic dip', 15), o('noodles', 'Extra portion', 80)], 3),
  dessertExtras: () => g('extras', 'Toppings', 'multiple', false, [o('scoop', 'Vanilla scoop', 50), o('fudge', 'Hot fudge', 40), o('nuts', 'Roasted nuts', 30)], 3),
  dessertSize: () => g('size', 'Size', 'single', true, [o('single', 'Single serving'), o('share', 'Sharing size', 110)]),
  drinkSize: () => g('size', 'Size', 'single', true, [o('reg', 'Regular · 350 ml'), o('lrg', 'Large · 500 ml', 40)]),
  sugar: () => g('sugar', 'Sweetness', 'single', true, [o('regular', 'Regular'), o('less', 'Less sweet'), o('none', 'No sugar')]),
  drinkExtras: () => g('extras', 'Extras', 'multiple', false, [o('shot', 'Extra espresso shot', 40), o('cream', 'Whipped cream', 30), o('boba', 'Tapioca pearls', 45)], 3),
  healthyBase: () => g('base', 'Choose your base', 'single', true, [o('rice', 'Brown rice'), o('quinoa', 'Quinoa', 30), o('greens', 'Mixed greens')]),
  healthyProtein: () => g('protein', 'Add protein', 'multiple', false, [o('paneer', 'Grilled paneer', 60), o('tofu', 'Smoked tofu', 50), o('chickpea', 'Spiced chickpeas', 30), o('avocado', 'Avocado', 70)], 2),
  curryPortion: () => g('portion', 'Portion', 'single', true, [o('half', 'Half · serves 1'), o('full', 'Full · serves 2', 130)]),
  northBreads: () => g('breads', 'Add breads & rice', 'multiple', false, [o('butter-naan', 'Butter naan', 45), o('garlic-naan', 'Garlic naan', 55), o('roti', 'Tandoori roti', 25), o('jeera-rice', 'Jeera rice', 90)], 3),
  rollSize: () => g('size', 'Size', 'single', true, [o('single', 'Single roll'), o('double', 'Double roll', 90)]),
  rollExtras: (nonVeg = false) => g('extras', 'Extras', 'multiple', false, [o('cheese', 'Extra cheese', 30), o('mayo', 'Mint mayo', 15), o('onion', 'Pickled onions', 10), ...(nonVeg ? [o('egg', 'Add egg', 25)] : [o('paneer', 'Extra paneer', 45)])], 3),
}
