import { Pizza, Sandwich, CookingPot, Utensils, Soup, IceCreamCone, Salad, CupSoda, Flame, Croissant } from 'lucide-react'

export const CATEGORY_ICONS = {
  pizza: Pizza,
  burgers: Sandwich,
  biryani: CookingPot,
  'north-indian': Flame,
  'south-indian': Utensils,
  'rolls-wraps': Croissant,
  chinese: Soup,
  desserts: IceCreamCone,
  healthy: Salad,
  beverages: CupSoda,
}

export const CATEGORY_TONES = {
  pizza: ['#f97352', '#fbb58a'],
  burgers: ['#f59e3b', '#fbd38d'],
  biryani: ['#d9822b', '#f3c58a'],
  'north-indian': ['#c2522d', '#f0b08f'],
  'south-indian': ['#3f9d6a', '#a7dcb8'],
  'rolls-wraps': ['#b8862b', '#ecd08e'],
  chinese: ['#d9473a', '#f3a69b'],
  desserts: ['#e0679a', '#f6bcd3'],
  healthy: ['#5aa65a', '#b9e0b0'],
  beverages: ['#3b8fc4', '#a9d4ee'],
}
