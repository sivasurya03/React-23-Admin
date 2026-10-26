import { OPTIONS as O } from './options.js'
import { poolImage } from './images.js'

// Compact item builder: dish(id, name, price, description, flags)
// flags: veg (default true), spicy, popular, rating, pool+idx (image), options (customization groups)
const dish = (id, name, price, description, flags = {}) => ({
  id,
  name,
  price,
  description,
  veg: flags.veg !== false,
  spicy: Boolean(flags.spicy),
  popular: Boolean(flags.popular),
  recommended: Boolean(flags.recommended),
  // originalPrice is display-only (struck-through MRP); `price` is always what the cart charges.
  originalPrice: flags.was && flags.was > price ? flags.was : null,
  rating: flags.rating ?? null,
  image: flags.image ?? null,
  options: flags.options ?? [],
})

const WEEK_HOURS = [
  { day: 'Mon – Thu', hours: '11:00 AM – 11:00 PM' },
  { day: 'Fri – Sat', hours: '11:00 AM – 12:30 AM' },
  { day: 'Sunday', hours: '10:00 AM – 11:30 PM' },
]

const build = (r, sections) => {
  const menu = sections.map((s) => ({
    name: s.name,
    items: s.items.map((item) => ({
      ...item,
      category: s.name,
      restaurantId: r.id,
      image: item.image ?? poolImage(r.primaryCuisine, 0),
    })),
  }))
  return {
    hours: WEEK_HOURS,
    reviews: 800,
    featured: false,
    trending: false,
    pureVeg: menu.every((s) => s.items.every((i) => i.veg)),
    ...r,
    cover: poolImage(r.primaryCuisine, r.coverIndex ?? 0),
    menu,
    items: menu.flatMap((s) => s.items),
  }
}

const P = (pool, idx) => poolImage(pool, idx)

export const restaurants = [
  build(
    {
      id: 'fire-and-crust',
      name: 'Fire & Crust Pizzeria',
      primaryCuisine: 'pizza',
      categories: ['pizza'],
      cuisines: ['Pizza', 'Italian'],
      rating: 4.6, reviews: 2140, deliveryTime: 28, deliveryFee: 29, priceLevel: 2, costForTwo: 600,
      offer: '20% OFF up to ₹100', featured: true, trending: true, coverIndex: 0,
      area: 'RS Puram', address: '14, Cross Cut Road, RS Puram',
      about: 'Neapolitan-style pizzas fired at 450°C in a hand-built brick oven. Slow-fermented dough, San Marzano tomatoes and fresh mozzarella, made to order.',
    },
    [
      { name: 'Signature Pizzas', items: [
        dish('fc-margherita', 'Classic Margherita', 249, 'San Marzano tomato, fior di latte mozzarella, fresh basil and olive oil.', { popular: true, rating: 4.7, image: P('pizza', 0), options: [O.pizzaSize(), O.pizzaCrust(), O.pizzaToppings()] }),
        dish('fc-pepperoni', 'Smoked Pepperoni', 359, 'Cured pepperoni, mozzarella, chilli oil and a hint of oregano.', { veg: false, spicy: true, popular: true, rating: 4.6, image: P('pizza', 1), options: [O.pizzaSize(), O.pizzaCrust(), O.pizzaToppings()] }),
        dish('fc-farmhouse', 'Farmhouse Garden', 319, 'Capsicum, mushrooms, sweet corn, onions and olives on a tomato base.', { rating: 4.4, image: P('pizza', 2), options: [O.pizzaSize(), O.pizzaCrust(), O.pizzaToppings()] }),
        dish('fc-paneer-tikka', 'Paneer Tikka Pizza', 339, 'Tandoori paneer, bell peppers and mint mayo drizzle.', { spicy: true, rating: 4.5, image: P('pizza', 3), options: [O.pizzaSize(), O.pizzaCrust(), O.pizzaToppings()] }),
      ] },
      { name: 'Sides & Breads', items: [
        dish('fc-garlic-bread', 'Garlic Bread with Cheese', 149, 'Toasted loaf, garlic butter and bubbling mozzarella.', { image: P('pizza', 2) }),
        dish('fc-pasta-arrabbiata', 'Penne Arrabbiata', 229, 'Penne in a fiery tomato and garlic sauce, finished with parmesan.', { spicy: true, image: P('pizza', 1), options: [O.spice()] }),
        dish('fc-caesar', 'Crunchy Caesar Salad', 199, 'Romaine, parmesan shavings, herbed croutons, house dressing.', { image: P('healthy', 1) }),
      ] },
      { name: 'Drinks & Dessert', items: [
        dish('fc-lemonade', 'Mint Lemonade', 99, 'Fresh lime, mint and a pinch of black salt.', { image: P('beverages', 2), options: [O.drinkSize()] }),
        dish('fc-tiramisu', 'Classic Tiramisu', 189, 'Espresso-soaked sponge, mascarpone cream and cocoa.', { image: P('desserts', 1) }),
      ] },
    ],
  ),
  build(
    {
      id: 'slice-society',
      name: 'Slice Society',
      primaryCuisine: 'pizza',
      categories: ['pizza'],
      cuisines: ['Pizza', 'Fast Food'],
      rating: 4.3, reviews: 1310, deliveryTime: 32, deliveryFee: 0, priceLevel: 1, costForTwo: 400,
      offer: 'Free delivery', featured: false, trending: false, coverIndex: 1,
      area: 'Avinashi Road', address: '88, Avinashi Road',
      about: 'Big, foldable New York-style slices and shareable party boxes. Budget-friendly, fast and always hot.',
    },
    [
      { name: 'Pizzas', items: [
        dish('ss-cheese', 'Double Cheese Pizza', 199, 'Loaded with a three-cheese blend on a thick golden crust.', { popular: true, rating: 4.4, image: P('pizza', 1), options: [O.pizzaSize(), O.pizzaToppings()] }),
        dish('ss-chicken', 'BBQ Chicken Pizza', 289, 'Smoky BBQ chicken, red onion and coriander.', { veg: false, rating: 4.3, image: P('pizza', 2), options: [O.pizzaSize(), O.pizzaToppings()] }),
        dish('ss-veggie', 'Veggie Supreme', 239, 'Corn, olives, jalapeños, capsicum and onions.', { spicy: true, rating: 4.2, image: P('pizza', 3), options: [O.pizzaSize(), O.pizzaToppings()] }),
        dish('ss-mexican', 'Mexican Wave', 259, 'Beans, jalapeños, peri-peri sauce and cheese.', { spicy: true, image: P('pizza', 0), options: [O.pizzaSize(), O.pizzaToppings()] }),
      ] },
      { name: 'Sides', items: [
        dish('ss-fries', 'Peri-peri Fries', 119, 'Crisp fries tossed in peri-peri seasoning.', { spicy: true, image: P('burgers', 2) }),
        dish('ss-wings', 'Crispy Chicken Wings', 219, 'Six wings with smoky dip.', { veg: false, image: P('burgers', 3) }),
        dish('ss-brownie', 'Walnut Brownie', 99, 'Warm fudgy brownie with roasted walnuts.', { image: P('desserts', 1) }),
      ] },
    ],
  ),
  build(
    {
      id: 'smokestack-burger-co',
      name: 'Smokestack Burger Co.',
      primaryCuisine: 'burgers',
      categories: ['burgers'],
      cuisines: ['Burgers', 'American'],
      rating: 4.5, reviews: 1895, deliveryTime: 24, deliveryFee: 25, priceLevel: 2, costForTwo: 500,
      offer: 'Flat ₹50 OFF above ₹299', featured: true, trending: true, coverIndex: 0,
      area: 'Peelamedu', address: '22, Nehru Street, Peelamedu',
      about: 'Smash burgers on brioche buns with house-ground patties, caramelised onions and our signature smoke sauce.',
    },
    [
      { name: 'Signature Burgers', items: [
        dish('sb-smoke', 'The Smokestack', 279, 'Smashed beef patty, cheddar, caramelised onions, smoke sauce.', { veg: false, popular: true, rating: 4.7, image: P('burgers', 0), options: [O.burgerPatty(), O.burgerExtras()] }),
        dish('sb-crispy', 'Crispy Chicken Stack', 249, 'Buttermilk fried chicken, slaw, pickles and honey mustard.', { veg: false, popular: true, rating: 4.5, image: P('burgers', 1), options: [O.burgerPatty(), O.burgerExtras()] }),
        dish('sb-paneer', 'Paneer Crunch Burger', 219, 'Crumb-fried paneer slab, mint mayo and pickled onions.', { rating: 4.4, image: P('burgers', 2), options: [O.burgerExtras()] }),
        dish('sb-aloo', 'Aloo Tikki Classic', 149, 'Spiced potato patty, tomato, onion and tangy sauce.', { rating: 4.1, image: P('burgers', 3), options: [O.burgerExtras()] }),
      ] },
      { name: 'Sides', items: [
        dish('sb-fries', 'Loaded Cheese Fries', 169, 'Crinkle fries, cheese sauce, jalapeños and herbs.', { spicy: true, image: P('burgers', 2) }),
        dish('sb-rings', 'Onion Rings', 129, 'Beer-batter style rings with ranch.', { image: P('burgers', 1) }),
      ] },
      { name: 'Shakes', items: [
        dish('sb-shake-choc', 'Belgian Chocolate Shake', 189, 'Thick shake with dark chocolate and cream.', { popular: true, image: P('beverages', 1), options: [O.drinkSize(), O.drinkExtras()] }),
        dish('sb-shake-oreo', 'Cookies & Cream Shake', 179, 'Crushed cookies blended into vanilla ice cream.', { image: P('beverages', 3), options: [O.drinkSize(), O.drinkExtras()] }),
      ] },
    ],
  ),
  build(
    {
      id: 'the-patty-lab',
      name: 'The Patty Lab',
      primaryCuisine: 'burgers',
      categories: ['burgers', 'beverages'],
      cuisines: ['Burgers', 'Fast Food'],
      rating: 4.2, reviews: 940, deliveryTime: 30, deliveryFee: 20, priceLevel: 1, costForTwo: 350,
      offer: null, featured: false, trending: false, coverIndex: 2,
      area: 'Gandhipuram', address: '5, DB Road, Gandhipuram',
      about: 'An experimental burger kitchen — small-batch sauces, quick service and honest prices.',
    },
    [
      { name: 'Burgers', items: [
        dish('pl-lab', 'The Lab Burger', 199, 'Chicken patty, cheese, lettuce and lab-secret sauce.', { veg: false, popular: true, rating: 4.3, image: P('burgers', 1), options: [O.burgerPatty(), O.burgerExtras()] }),
        dish('pl-veggie', 'Garden Veggie Burger', 139, 'Mixed-veg patty, tomato, onion and mint chutney.', { rating: 4.0, image: P('burgers', 3), options: [O.burgerExtras()] }),
        dish('pl-spicy', 'Fire Zinger', 229, 'Fiery fried chicken, jalapeños and chilli mayo.', { veg: false, spicy: true, rating: 4.4, image: P('burgers', 0), options: [O.burgerPatty(), O.burgerExtras()] }),
      ] },
      { name: 'Sides & Drinks', items: [
        dish('pl-fries', 'Masala Fries', 99, 'Fries dusted with house masala.', { spicy: true, image: P('burgers', 2) }),
        dish('pl-cola', 'Iced Cola Float', 109, 'Cold cola with a scoop of vanilla ice cream.', { image: P('beverages', 0), options: [O.drinkSize()] }),
        dish('pl-lemon', 'Fresh Lime Soda', 79, 'Sweet, salted or mixed.', { image: P('beverages', 2), options: [O.drinkSize()] }),
      ] },
    ],
  ),
  build(
    {
      id: 'dum-biryani-house',
      name: 'Dum Biryani House',
      primaryCuisine: 'biryani',
      categories: ['biryani'],
      cuisines: ['Biryani', 'Hyderabadi'],
      rating: 4.7, reviews: 3320, deliveryTime: 35, deliveryFee: 30, priceLevel: 2, costForTwo: 550,
      offer: '10% OFF with WELCOME10', featured: true, trending: true, coverIndex: 0,
      area: 'Saibaba Colony', address: '41, Saibaba Colony Main Road',
      about: 'Seal-cooked dum biryani layered with aged basmati, whole spices and saffron milk. Every pot is slow-cooked for 90 minutes.',
    },
    [
      { name: 'Biryanis', items: [
        dish('db-chicken', 'Hyderabadi Chicken Dum Biryani', 289, 'Bone-in chicken, aged basmati, saffron and fried onions.', { veg: false, spicy: true, popular: true, rating: 4.8, image: P('biryani', 0), options: [O.biryaniPortion(340), O.spice(), O.biryaniExtras()] }),
        dish('db-mutton', 'Mutton Dum Biryani', 369, 'Tender mutton, slow-cooked under seal until fragrant.', { veg: false, spicy: true, popular: true, rating: 4.7, image: P('biryani', 1), options: [O.biryaniPortion(400), O.spice(), O.biryaniExtras()] }),
        dish('db-veg', 'Subz Dum Biryani', 239, 'Garden vegetables, paneer and mint layered with basmati.', { rating: 4.4, image: P('biryani', 2), options: [O.biryaniPortion(280), O.biryaniExtras()] }),
        dish('db-egg', 'Egg Biryani', 229, 'Spiced eggs layered in aromatic rice.', { veg: false, rating: 4.3, image: P('biryani', 3), options: [O.biryaniPortion(260), O.biryaniExtras()] }),
      ] },
      { name: 'Starters', items: [
        dish('db-65', 'Chicken 65', 229, 'Crisp, curry-leaf tossed chicken bites.', { veg: false, spicy: true, image: P('biryani', 1) }),
        dish('db-paneer65', 'Paneer 65', 209, 'Spiced fried paneer cubes.', { spicy: true, image: P('biryani', 2) }),
      ] },
      { name: 'Desserts', items: [
        dish('db-double', 'Double Ka Meetha', 119, 'Warm bread pudding with saffron and nuts.', { image: P('desserts', 0) }),
        dish('db-gulab', 'Gulab Jamun (2 pcs)', 89, 'Soft khoya dumplings in rose syrup.', { image: P('desserts', 3) }),
      ] },
    ],
  ),
  build(
    {
      id: 'nawabi-kitchen',
      name: 'Nawabi Kitchen',
      primaryCuisine: 'biryani',
      categories: ['biryani'],
      cuisines: ['Biryani', 'Mughlai', 'North Indian'],
      rating: 4.4, reviews: 1560, deliveryTime: 38, deliveryFee: 35, priceLevel: 3, costForTwo: 750,
      offer: 'Flat ₹50 OFF', featured: false, trending: false, coverIndex: 1,
      area: 'Race Course', address: '9, Race Course Road',
      about: 'Royal Mughlai kitchen — kebabs, kormas and biryanis finished with ghee and saffron.',
    },
    [
      { name: 'Biryani & Rice', items: [
        dish('nk-lucknowi', 'Lucknowi Chicken Biryani', 319, 'Fragrant awadhi-style biryani with kewra.', { veg: false, rating: 4.5, popular: true, image: P('biryani', 1), options: [O.biryaniPortion(360), O.biryaniExtras()] }),
        dish('nk-paneer', 'Paneer Zafrani Biryani', 269, 'Saffron-kissed paneer and basmati.', { rating: 4.3, image: P('biryani', 2), options: [O.biryaniPortion(300), O.biryaniExtras()] }),
        dish('nk-jeera', 'Jeera Rice', 129, 'Cumin-tempered basmati.', { image: P('biryani', 3) }),
      ] },
      { name: 'Curries & Kebabs', items: [
        dish('nk-butter', 'Butter Chicken', 299, 'Smoky tandoori chicken in a velvety tomato-butter gravy.', { veg: false, popular: true, rating: 4.6, image: P('biryani', 0), options: [O.spice()] }),
        dish('nk-dal', 'Dal Makhani', 219, 'Black lentils slow-simmered overnight.', { rating: 4.5, image: P('biryani', 3) }),
        dish('nk-seekh', 'Mutton Seekh Kebab', 289, 'Minced mutton skewers grilled over charcoal.', { veg: false, spicy: true, image: P('biryani', 1) }),
        dish('nk-naan', 'Garlic Butter Naan', 69, 'Soft tandoor naan brushed with garlic butter.', { image: P('biryani', 2) }),
      ] },
    ],
  ),
  build(
    {
      id: 'tiffin-tales',
      name: 'Tiffin Tales',
      primaryCuisine: 'south-indian',
      categories: ['south-indian'],
      cuisines: ['South Indian', 'Breakfast'],
      rating: 4.6, reviews: 2780, deliveryTime: 22, deliveryFee: 15, priceLevel: 1, costForTwo: 300,
      offer: '₹50 OFF above ₹299', featured: true, trending: true, coverIndex: 0,
      area: 'Town Hall', address: '3, Oppanakara Street, Town Hall',
      about: 'Home-style tiffin classics: crisp dosas, fluffy idlis and coconut chutneys ground fresh every morning. Pure vegetarian kitchen.',
    },
    [
      { name: 'Dosa Corner', items: [
        dish('tt-masala', 'Ghee Masala Dosa', 129, 'Crisp dosa with spiced potato masala, sambar and chutneys.', { popular: true, rating: 4.8, image: P('south-indian', 0), options: [O.dosaExtras()] }),
        dish('tt-podi', 'Podi Idli Dosa', 109, 'Soft dosa rolled with gunpowder podi and ghee.', { spicy: true, rating: 4.5, image: P('south-indian', 1), options: [O.dosaExtras()] }),
        dish('tt-paneer', 'Paneer Cheese Dosa', 169, 'Stuffed with spiced paneer and melted cheese.', { rating: 4.3, image: P('south-indian', 2), options: [O.dosaExtras()] }),
        dish('tt-rava', 'Onion Rava Dosa', 119, 'Lacy rava dosa with onions and green chillies.', { image: P('south-indian', 3), options: [O.dosaExtras()] }),
      ] },
      { name: 'Idli & Vada', items: [
        dish('tt-idli', 'Steamed Idli (3 pcs)', 79, 'Soft idlis with sambar and two chutneys.', { popular: true, rating: 4.6, image: P('south-indian', 1) }),
        dish('tt-vada', 'Medu Vada (2 pcs)', 89, 'Crisp outside, fluffy inside.', { image: P('south-indian', 2) }),
        dish('tt-pongal', 'Ven Pongal', 99, 'Peppery rice and moong dal tempered in ghee.', { image: P('south-indian', 3) }),
      ] },
      { name: 'Meals & Drinks', items: [
        dish('tt-meals', 'Mini Meals Thali', 189, 'Rice, sambar, rasam, poriyal, kootu and curd.', { rating: 4.5, image: P('south-indian', 0) }),
        dish('tt-coffee', 'Filter Coffee', 49, 'Decoction coffee served the traditional way.', { popular: true, image: P('beverages', 1), options: [O.drinkSize()] }),
      ] },
    ],
  ),
  build(
    {
      id: 'madras-filter-and-dosa',
      name: 'Madras Filter & Dosa',
      primaryCuisine: 'south-indian',
      categories: ['south-indian', 'beverages'],
      cuisines: ['South Indian', 'Chettinad'],
      rating: 4.5, reviews: 1620, deliveryTime: 26, deliveryFee: 20, priceLevel: 2, costForTwo: 450,
      offer: null, featured: false, trending: true, coverIndex: 2,
      area: 'Singanallur', address: '17, Trichy Road, Singanallur',
      about: 'A modern take on Madras café classics with Chettinad specials after sundown.',
    },
    [
      { name: 'Tiffin', items: [
        dish('mf-benne', 'Benne Dosa', 139, 'Butter-roasted golden dosa with coconut chutney.', { popular: true, rating: 4.6, image: P('south-indian', 2), options: [O.dosaExtras()] }),
        dish('mf-mini-idli', 'Mini Idli Sambar', 119, 'Tiny idlis drowned in hot sambar and ghee.', { rating: 4.4, image: P('south-indian', 1) }),
        dish('mf-uttapam', 'Veg Uttapam', 129, 'Thick pancake with tomato, onion and coriander.', { image: P('south-indian', 3), options: [O.dosaExtras()] }),
      ] },
      { name: 'Chettinad Specials', items: [
        dish('mf-chicken', 'Chettinad Chicken Curry', 269, 'Peppery, stone-ground masala with curry leaves.', { veg: false, spicy: true, rating: 4.6, image: P('biryani', 1), options: [O.spice()] }),
        dish('mf-parotta', 'Malabar Parotta (2 pcs)', 79, 'Flaky layered parotta.', { image: P('south-indian', 0) }),
        dish('mf-kothu', 'Veg Kothu Parotta', 189, 'Shredded parotta tossed with salna and vegetables.', { spicy: true, image: P('south-indian', 3), options: [O.spice()] }),
      ] },
      { name: 'Beverages', items: [
        dish('mf-coffee', 'Kumbakonam Degree Coffee', 59, 'Strong filter coffee with creamy milk.', { image: P('beverages', 1), options: [O.drinkSize(), O.sugar()] }),
        dish('mf-buttermilk', 'Spiced Buttermilk', 49, 'Curry-leaf and ginger chaas.', { image: P('beverages', 2) }),
      ] },
    ],
  ),
  build(
    {
      id: 'wok-and-roll',
      name: 'Wok & Roll',
      primaryCuisine: 'chinese',
      categories: ['chinese'],
      cuisines: ['Chinese', 'Asian'],
      rating: 4.3, reviews: 1730, deliveryTime: 30, deliveryFee: 25, priceLevel: 2, costForTwo: 500,
      offer: '15% OFF', featured: true, trending: false, coverIndex: 0,
      area: 'Ganapathy', address: '63, Sathy Road, Ganapathy',
      about: 'High-flame wok cooking: hakka noodles, spicy Szechuan, momos and bao, plated in minutes.',
    },
    [
      { name: 'Noodles & Rice', items: [
        dish('wr-hakka', 'Veg Hakka Noodles', 179, 'Wok-tossed noodles with crunchy vegetables.', { popular: true, rating: 4.4, image: P('chinese', 0), options: [O.spice(), O.chineseExtras()] }),
        dish('wr-chicken-fried', 'Chicken Fried Rice', 219, 'Smoky wok rice with egg, chicken and spring onion.', { veg: false, rating: 4.3, image: P('chinese', 2), options: [O.spice(), O.chineseExtras()] }),
        dish('wr-schezwan', 'Schezwan Noodles', 199, 'Fiery Szechuan sauce, garlic and chilli.', { spicy: true, rating: 4.5, image: P('chinese', 1), options: [O.spice(), O.chineseExtras()] }),
      ] },
      { name: 'Starters', items: [
        dish('wr-momos', 'Steamed Veg Momos (6 pcs)', 149, 'Juicy dumplings with spicy red chutney.', { popular: true, rating: 4.4, image: P('chinese', 3) }),
        dish('wr-chilli-paneer', 'Chilli Paneer Dry', 229, 'Crisp paneer tossed with peppers and soy-chilli glaze.', { spicy: true, rating: 4.4, image: P('chinese', 1) }),
        dish('wr-manchurian', 'Chicken Manchurian', 239, 'Crispy chicken in tangy garlic-soy sauce.', { veg: false, spicy: true, image: P('chinese', 0) }),
      ] },
      { name: 'Soups', items: [
        dish('wr-hotsour', 'Hot & Sour Soup', 119, 'Peppery, tangy and comforting.', { spicy: true, image: P('chinese', 3) }),
      ] },
    ],
  ),
  build(
    {
      id: 'dragon-bowl',
      name: 'Dragon Bowl',
      primaryCuisine: 'chinese',
      categories: ['chinese', 'healthy'],
      cuisines: ['Chinese', 'Thai', 'Asian'],
      rating: 4.1, reviews: 760, deliveryTime: 34, deliveryFee: 30, priceLevel: 3, costForTwo: 700,
      offer: null, featured: false, trending: false, coverIndex: 3,
      area: 'Race Course', address: '28, Racecourse Road',
      about: 'Noodle bowls, ramen and Thai curries — comfort food with a pan-Asian twist.',
    },
    [
      { name: 'Bowls', items: [
        dish('dg-ramen', 'Tonkotsu-style Ramen', 349, 'Rich broth, noodles, soft egg, bamboo and spring onion.', { veg: false, rating: 4.3, popular: true, image: P('chinese', 3), options: [O.spice(), O.chineseExtras()] }),
        dish('dg-thai-curry', 'Thai Green Curry Bowl', 299, 'Coconut green curry with vegetables and jasmine rice.', { spicy: true, rating: 4.2, image: P('chinese', 2), options: [O.spice()] }),
        dish('dg-pad-thai', 'Pad Thai Noodles', 279, 'Rice noodles, tamarind, peanuts and lime.', { rating: 4.1, image: P('chinese', 0), options: [O.chineseExtras()] }),
      ] },
      { name: 'Small Plates', items: [
        dish('dg-bao', 'Crispy Mushroom Bao (2 pcs)', 229, 'Fluffy steamed buns, crisp mushrooms and hoisin.', { image: P('chinese', 1) }),
        dish('dg-spring', 'Spring Rolls (6 pcs)', 169, 'Golden rolls with sweet chilli dip.', { image: P('chinese', 3) }),
      ] },
    ],
  ),
  build(
    {
      id: 'sugar-sprout-patisserie',
      name: 'Sugar Sprout Patisserie',
      primaryCuisine: 'desserts',
      categories: ['desserts', 'beverages'],
      cuisines: ['Desserts', 'Bakery', 'Cafe'],
      rating: 4.8, reviews: 2210, deliveryTime: 27, deliveryFee: 35, priceLevel: 2, costForTwo: 450,
      offer: 'Free brownie above ₹499', featured: true, trending: true, coverIndex: 0,
      area: 'RS Puram', address: '7, DB Road, RS Puram',
      about: 'An artisan patisserie: small-batch cakes, tarts and cookies baked every morning with real butter and Belgian chocolate.',
    },
    [
      { name: 'Cakes & Pastries', items: [
        dish('sp-choc-truffle', 'Chocolate Truffle Slice', 169, 'Dense dark chocolate sponge with ganache.', { popular: true, rating: 4.9, image: P('desserts', 1), options: [O.dessertSize(), O.dessertExtras()] }),
        dish('sp-red-velvet', 'Red Velvet Cake Jar', 149, 'Layers of red velvet and cream-cheese frosting.', { rating: 4.7, image: P('desserts', 3), options: [O.dessertExtras()] }),
        dish('sp-lemon-tart', 'Lemon Meringue Tart', 159, 'Buttery tart shell, tangy lemon curd and torched meringue.', { rating: 4.6, image: P('desserts', 0) }),
        dish('sp-donut', 'Glazed Donut Box (4)', 249, 'Four fluffy donuts in assorted glazes.', { popular: true, image: P('desserts', 0) }),
      ] },
      { name: 'Cookies & Brownies', items: [
        dish('sp-brownie', 'Walnut Fudge Brownie', 119, 'Gooey centre with roasted walnuts.', { rating: 4.8, image: P('desserts', 1), options: [O.dessertExtras()] }),
        dish('sp-cookie', 'Choco-chip Cookie Box (6)', 229, 'Crisp edges, soft centres.', { image: P('desserts', 3) }),
      ] },
      { name: 'Coffee', items: [
        dish('sp-latte', 'Vanilla Bean Latte', 149, 'Espresso, steamed milk and vanilla.', { image: P('beverages', 1), options: [O.drinkSize(), O.sugar(), O.drinkExtras()] }),
        dish('sp-cold-brew', 'Cold Brew', 139, 'Steeped for 18 hours, served over ice.', { image: P('beverages', 1), options: [O.drinkSize(), O.sugar()] }),
      ] },
    ],
  ),
  build(
    {
      id: 'churn-and-co',
      name: 'Churn & Co. Ice Creams',
      primaryCuisine: 'desserts',
      categories: ['desserts'],
      cuisines: ['Desserts', 'Ice Cream'],
      rating: 4.4, reviews: 1180, deliveryTime: 25, deliveryFee: 0, priceLevel: 1, costForTwo: 300,
      offer: 'Free delivery', featured: false, trending: false, coverIndex: 2,
      area: 'Avinashi Road', address: '120, Avinashi Road',
      about: 'Slow-churned ice creams, sundaes and waffles, delivered cold in insulated packs.',
    },
    [
      { name: 'Scoops & Sundaes', items: [
        dish('cc-vanilla', 'Madagascar Vanilla Tub', 199, 'Real vanilla bean ice cream, 500 ml.', { rating: 4.5, image: P('desserts', 2) }),
        dish('cc-sundae', 'Hot Fudge Sundae', 169, 'Vanilla scoops, hot fudge, nuts and a cherry.', { popular: true, rating: 4.6, image: P('desserts', 2), options: [O.dessertExtras()] }),
        dish('cc-mango', 'Alphonso Mango Scoops', 149, 'Seasonal mango ice cream.', { image: P('desserts', 2) }),
      ] },
      { name: 'Waffles & Shakes', items: [
        dish('cc-waffle', 'Nutella Waffle', 179, 'Crisp waffle, hazelnut spread and strawberries.', { popular: true, image: P('desserts', 1), options: [O.dessertExtras()] }),
        dish('cc-shake', 'Strawberry Milkshake', 159, 'Fresh strawberries blended with ice cream.', { image: P('beverages', 3), options: [O.drinkSize(), O.drinkExtras()] }),
      ] },
    ],
  ),
  build(
    {
      id: 'green-fork-kitchen',
      name: 'Green Fork Kitchen',
      primaryCuisine: 'healthy',
      categories: ['healthy'],
      cuisines: ['Healthy', 'Salads', 'Bowls'],
      rating: 4.5, reviews: 1430, deliveryTime: 24, deliveryFee: 30, priceLevel: 2, costForTwo: 500,
      offer: '10% OFF', featured: true, trending: true, coverIndex: 0,
      area: 'Peelamedu', address: '51, Avinashi Road, Peelamedu',
      about: 'Macro-balanced bowls and cold-pressed greens. Fully labelled, freshly assembled and low on oil.',
    },
    [
      { name: 'Power Bowls', items: [
        dish('gf-buddha', 'Buddha Bowl', 289, 'Roasted veggies, hummus, chickpeas, greens and tahini.', { popular: true, rating: 4.6, image: P('healthy', 0), options: [O.healthyBase(), O.healthyProtein()] }),
        dish('gf-chicken', 'Grilled Chicken Bowl', 329, 'Herb-grilled chicken, grains, avocado and lemon dressing.', { veg: false, popular: true, rating: 4.5, image: P('healthy', 1), options: [O.healthyBase(), O.healthyProtein()] }),
        dish('gf-mexican', 'Mexican Burrito Bowl', 299, 'Beans, corn, salsa, guacamole and grains.', { spicy: true, rating: 4.3, image: P('healthy', 3), options: [O.healthyBase(), O.healthyProtein()] }),
      ] },
      { name: 'Salads', items: [
        dish('gf-greek', 'Greek Garden Salad', 219, 'Cucumber, tomato, feta, olives and oregano.', { rating: 4.4, image: P('healthy', 2) }),
        dish('gf-quinoa', 'Quinoa Crunch Salad', 239, 'Quinoa, pomegranate, nuts and citrus dressing.', { image: P('healthy', 0), options: [O.healthyProtein()] }),
      ] },
      { name: 'Smoothies', items: [
        dish('gf-green-smoothie', 'Green Detox Smoothie', 179, 'Spinach, apple, cucumber and ginger.', { image: P('beverages', 2), options: [O.drinkSize()] }),
      ] },
    ],
  ),
  build(
    {
      id: 'bowl-theory',
      name: 'Bowl Theory',
      primaryCuisine: 'healthy',
      categories: ['healthy'],
      cuisines: ['Healthy', 'Continental'],
      rating: 4.2, reviews: 690, deliveryTime: 29, deliveryFee: 25, priceLevel: 2, costForTwo: 450,
      offer: null, featured: false, trending: false, coverIndex: 2,
      area: 'Saravanampatti', address: '4, Thudiyalur Road, Saravanampatti',
      about: 'Fresh wraps, smoothie bowls and grain salads for a lighter lunch.',
    },
    [
      { name: 'Bowls & Wraps', items: [
        dish('bt-acai', 'Berry Smoothie Bowl', 249, 'Blended berries topped with granola, seeds and banana.', { popular: true, rating: 4.4, image: P('healthy', 3), options: [O.dessertExtras()] }),
        dish('bt-wrap', 'Falafel Hummus Wrap', 199, 'Crispy falafel, hummus, pickles and greens.', { rating: 4.2, image: P('healthy', 2) }),
        dish('bt-paneer-wrap', 'Grilled Paneer Wrap', 209, 'Whole-wheat wrap, tandoori paneer and mint dip.', { spicy: true, image: P('healthy', 0), options: [O.healthyProtein()] }),
      ] },
      { name: 'Drinks', items: [
        dish('bt-coconut', 'Tender Coconut Cooler', 99, 'Coconut water, lime and mint.', { image: P('beverages', 2) }),
        dish('bt-protein', 'Peanut Butter Protein Shake', 169, 'Banana, oats and peanut butter.', { image: P('beverages', 3), options: [O.drinkSize()] }),
      ] },
    ],
  ),
  build(
    {
      id: 'brew-and-bloom',
      name: 'Brew & Bloom',
      primaryCuisine: 'beverages',
      categories: ['beverages', 'desserts'],
      cuisines: ['Beverages', 'Cafe', 'Coffee'],
      rating: 4.4, reviews: 1090, deliveryTime: 20, deliveryFee: 20, priceLevel: 2, costForTwo: 400,
      offer: 'Buy 1 Get 1 on cold brew', featured: true, trending: false, coverIndex: 0,
      area: 'Gandhipuram', address: '19, Cross Cut Road, Gandhipuram',
      about: 'Specialty coffee, matcha and fruit teas — roasted in small batches and brewed to order.',
    },
    [
      { name: 'Coffee', items: [
        dish('bb-flat-white', 'Flat White', 159, 'Double ristretto with silky microfoam.', { popular: true, rating: 4.6, image: P('beverages', 1), options: [O.drinkSize(), O.sugar(), O.drinkExtras()] }),
        dish('bb-iced-latte', 'Iced Caramel Latte', 179, 'Espresso, cold milk and salted caramel over ice.', { popular: true, rating: 4.5, image: P('beverages', 1), options: [O.drinkSize(), O.sugar(), O.drinkExtras()] }),
        dish('bb-cold-brew', 'Nitro Cold Brew', 169, 'Smooth, low-acid and naturally sweet.', { image: P('beverages', 1), options: [O.drinkSize()] }),
      ] },
      { name: 'Tea & Cool Drinks', items: [
        dish('bb-matcha', 'Iced Matcha Latte', 199, 'Ceremonial matcha with oat or dairy milk.', { rating: 4.4, image: P('beverages', 2), options: [O.drinkSize(), O.sugar()] }),
        dish('bb-peach', 'Peach Iced Tea', 139, 'Black tea shaken with peach and lemon.', { image: P('beverages', 3), options: [O.drinkSize(), O.sugar()] }),
      ] },
      { name: 'Bakes', items: [
        dish('bb-croissant', 'Butter Croissant', 119, 'Flaky laminated pastry.', { image: P('desserts', 0) }),
        dish('bb-banana-loaf', 'Banana Walnut Loaf', 109, 'Moist loaf with toasted walnuts.', { image: P('desserts', 3) }),
      ] },
    ],
  ),
  build(
    {
      id: 'fresh-press-juicery',
      name: 'Fresh Press Juicery',
      primaryCuisine: 'beverages',
      categories: ['beverages', 'healthy'],
      cuisines: ['Beverages', 'Juices', 'Healthy'],
      rating: 4.3, reviews: 870, deliveryTime: 18, deliveryFee: 0, priceLevel: 1, costForTwo: 250,
      offer: 'Free delivery', featured: false, trending: true, coverIndex: 2,
      area: 'Town Hall', address: '2, Big Bazaar Street, Town Hall',
      about: 'Cold-pressed juices, shakes and fruit bowls — squeezed fresh with no added sugar.',
    },
    [
      { name: 'Cold-pressed Juices', items: [
        dish('fp-orange', 'Fresh Orange Juice', 109, 'Squeezed to order, no sugar added.', { popular: true, rating: 4.5, image: P('beverages', 2), options: [O.drinkSize()] }),
        dish('fp-watermelon', 'Watermelon Mint Cooler', 99, 'Chilled watermelon with fresh mint.', { rating: 4.4, image: P('beverages', 2), options: [O.drinkSize()] }),
        dish('fp-beet', 'Beet-Carrot-Ginger Shot', 129, 'Earthy, zesty and energising.', { image: P('beverages', 3) }),
      ] },
      { name: 'Shakes & Bowls', items: [
        dish('fp-mango-shake', 'Mango Milkshake', 139, 'Alphonso mango blended with chilled milk.', { popular: true, image: P('beverages', 3), options: [O.drinkSize(), O.drinkExtras()] }),
        dish('fp-fruit-bowl', 'Seasonal Fruit Bowl', 149, 'Cut seasonal fruit with chaat masala on request.', { image: P('healthy', 2) }),
      ] },
    ],
  ),
  build(
    {
      id: 'punjab-tadka',
      name: 'Punjab Tadka',
      primaryCuisine: 'north-indian',
      categories: ['north-indian'],
      cuisines: ['North Indian', 'Punjabi', 'Pure Veg'],
      rating: 4.4, reviews: 1620, deliveryTime: 30, deliveryFee: 25, priceLevel: 2, costForTwo: 550,
      offer: '15% OFF up to ₹75', featured: false, trending: true, coverIndex: 0,
      area: 'Race Course', address: '31, Race Course Road',
      about: 'A pure-vegetarian dhaba kitchen: slow-simmered dals, rich paneer gravies and tandoor-fresh breads, finished with white butter.',
    },
    [
      { name: 'Paneer Specials', items: [
        dish('pt-paneer-butter', 'Paneer Butter Masala', 289, 'Soft paneer cubes in a velvety tomato-cashew gravy finished with butter and kasuri methi.', { popular: true, recommended: true, rating: 4.6, image: P('north-indian', 0), options: [O.curryPortion(), O.spice(), O.northBreads()] }),
        dish('pt-kadai-paneer', 'Kadai Paneer', 279, 'Paneer tossed with onions, capsicum and freshly ground kadai masala.', { spicy: true, rating: 4.4, image: P('north-indian', 1), options: [O.curryPortion(), O.spice(), O.northBreads()] }),
        dish('pt-palak-paneer', 'Palak Paneer', 259, 'Silky spinach purée with garlic tadka and paneer.', { rating: 4.3, image: P('north-indian', 2), options: [O.curryPortion(), O.northBreads()] }),
      ] },
      { name: 'Dals & Breads', items: [
        dish('pt-dal-tadka', 'Dal Tadka', 199, 'Yellow lentils tempered with ghee, garlic, cumin and dried red chilli.', { popular: true, rating: 4.5, was: 229, image: P('north-indian', 3), options: [O.curryPortion(), O.northBreads()] }),
        dish('pt-chole-bhature', 'Chole Bhature', 199, 'Punjabi spiced chickpeas with two puffed bhature, pickled onions and chutney.', { rating: 4.4, image: P('north-indian', 1) }),
        dish('pt-butter-naan', 'Butter Naan (2 pcs)', 89, 'Tandoor-baked, brushed with white butter.', { image: P('north-indian', 3) }),
        dish('pt-lassi', 'Sweet Punjabi Lassi', 99, 'Thick churned curd lassi topped with malai.', { image: P('beverages', 0), options: [O.drinkSize()] }),
      ] },
    ],
  ),
  build(
    {
      id: 'tandoor-nights',
      name: 'Tandoor Nights',
      primaryCuisine: 'north-indian',
      categories: ['north-indian'],
      cuisines: ['North Indian', 'Mughlai', 'Tandoor'],
      rating: 4.5, reviews: 1980, deliveryTime: 34, deliveryFee: 35, priceLevel: 3, costForTwo: 800,
      offer: 'Flat ₹75 OFF above ₹499', featured: true, trending: false, coverIndex: 2,
      area: 'Gandhipuram', address: '9, Cross Cut Road, Gandhipuram',
      about: 'Charcoal-fired tandoor kebabs and Mughlai curries for a proper late-night feast, with generous portions meant for sharing.',
    },
    [
      { name: 'Curries', items: [
        dish('tn-lababdar', 'Chicken Lababdar', 339, 'Tandoori chicken in a rich, mildly sweet tomato-onion gravy with cream.', { veg: false, popular: true, recommended: true, rating: 4.7, image: P('north-indian', 0), options: [O.curryPortion(), O.spice(), O.northBreads()] }),
        dish('tn-rogan-josh', 'Mutton Rogan Josh', 429, 'Kashmiri-style mutton slow-cooked with whole spices and fennel.', { veg: false, spicy: true, rating: 4.5, image: P('north-indian', 1), options: [O.curryPortion(), O.spice(), O.northBreads()] }),
        dish('tn-kadai-chicken', 'Kadai Chicken', 329, 'Chicken in a rustic onion-tomato masala with crushed coriander.', { veg: false, spicy: true, rating: 4.3, image: P('north-indian', 2), options: [O.curryPortion(), O.spice(), O.northBreads()] }),
      ] },
      { name: 'Tandoor & Grills', items: [
        dish('tn-chicken-tikka', 'Chicken Tikka (8 pcs)', 319, 'Yoghurt-marinated chicken chargrilled in the tandoor.', { veg: false, popular: true, rating: 4.6, was: 349, image: P('north-indian', 3) }),
        dish('tn-malai-tikka', 'Afghani Chicken Malai Tikka', 339, 'Cream, cheese and cardamom-marinated chicken, grilled until just charred.', { veg: false, rating: 4.4, image: P('north-indian', 3) }),
        dish('tn-achari-paneer', 'Achari Paneer Tikka', 269, 'Paneer in a pickle-spiced marinade, charred in the tandoor.', { spicy: true, rating: 4.4, image: P('north-indian', 2) }),
        dish('tn-garlic-naan', 'Garlic Naan (2 pcs)', 109, 'Soft naan with roasted garlic and coriander.', { image: P('north-indian', 3) }),
      ] },
    ],
  ),
  build(
    {
      id: 'roll-republic',
      name: 'Roll Republic',
      primaryCuisine: 'rolls-wraps',
      categories: ['rolls-wraps'],
      cuisines: ['Rolls', 'Wraps', 'Street Food'],
      rating: 4.2, reviews: 1150, deliveryTime: 22, deliveryFee: 0, priceLevel: 1, costForTwo: 350,
      offer: 'Free delivery', featured: false, trending: true, coverIndex: 0,
      area: 'Town Hall', address: '5, Oppanakara Street, Town Hall',
      about: 'Kolkata-style kathi rolls and loaded wraps, griddled to order with flaky parathas and crunchy fillings.',
    },
    [
      { name: 'Kathi Rolls', items: [
        dish('rr-chicken-kathi', 'Chicken Kathi Roll', 169, 'Spiced chicken tikka, onions and green chutney in a flaky egg-paratha.', { veg: false, popular: true, recommended: true, rating: 4.5, image: P('rolls-wraps', 0), options: [O.rollSize(), O.spice(), O.rollExtras(true)] }),
        dish('rr-egg-roll', 'Double Egg Roll', 119, 'Two-egg omelette roll with onions, chilli and lime.', { veg: false, rating: 4.2, image: P('rolls-wraps', 1), options: [O.rollSize(), O.rollExtras(true)] }),
        dish('rr-paneer-roll', 'Paneer Tikka Roll', 159, 'Tandoori paneer, capsicum and mint mayo in a laccha paratha.', { rating: 4.3, image: P('rolls-wraps', 2), options: [O.rollSize(), O.spice(), O.rollExtras()] }),
        dish('rr-mutton-roll', 'Mutton Seekh Roll', 219, 'Juicy mutton seekh, pickled onions and mint chutney.', { veg: false, spicy: true, rating: 4.4, image: P('rolls-wraps', 3), options: [O.rollSize(), O.rollExtras(true)] }),
      ] },
      { name: 'Wraps & Bowls', items: [
        dish('rr-paneer-wrap', 'Crispy Paneer Wrap', 169, 'Crumb-fried paneer, shredded cabbage and peri-peri mayo in a toasted wrap.', { rating: 4.3, was: 189, image: P('rolls-wraps', 1), options: [O.rollExtras()] }),
        dish('rr-veg-frankie', 'Masala Veg Frankie', 109, 'Spiced potato-and-pea filling rolled with tangy chutneys.', { spicy: true, image: P('rolls-wraps', 2), options: [O.rollSize(), O.rollExtras()] }),
        dish('rr-cold-coffee', 'Iced Cold Coffee', 119, 'Chilled coffee blended with milk and ice.', { image: P('beverages', 0), options: [O.drinkSize(), O.sugar()] }),
      ] },
    ],
  ),
]
