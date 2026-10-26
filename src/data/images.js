// Remote photo candidates (Unsplash). Every <FoodImage> falls back to a locally
// generated illustrated tile if a URL fails, so a dead link never breaks the UI.
// NOTE: these photo IDs could not be network-verified in the build sandbox —
// see README "Images" section for how to swap in your own assets.
export const unsplashUrl = (id, width = 800) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=70`

export const POOLS = {
  pizza: ['photo-1513104890138-7c749659a591', 'photo-1565299624946-b28f40a0ae38', 'photo-1534422298391-e4f8c172dddb', 'photo-1604908176997-125f25cc6f3d'],
  burgers: ['photo-1568901346375-23c9450c58cd', 'photo-1571091718767-18b5b1457add', 'photo-1550547660-d9450f859349', 'photo-1529042410759-befb1204b468'],
  biryani: ['photo-1631515243349-e0cb75fb8d3a', 'photo-1630383249896-424e482df921', 'photo-1589302168068-964664d93dc0', 'photo-1574484284002-952d92456975'],
  'south-indian': ['photo-1589301760014-d929f3979dbc', 'photo-1606491956689-2ea866880c84', 'photo-1601050690597-df0568f70950', 'photo-1596797038530-2c107229654b'],
  'north-indian': ['photo-1565557623262-b51c2513a641', 'photo-1585937421612-70a008356fbe', 'photo-1631452180519-c014fe946bc7', 'photo-1604908176997-125f25cc6f3d'],
  'rolls-wraps': ['photo-1626700051175-6818013e1d4f', 'photo-1599974579688-8dbdd335c77f', 'photo-1608039829572-78524f79c4c7', 'photo-1561758033-d89a9ad46330'],
  chinese: ['photo-1585032226651-759b368d7246', 'photo-1552332386-f8dd00dc2f85', 'photo-1512058564366-18510be2db19', 'photo-1569718212165-3a8278d5f624'],
  desserts: ['photo-1551024601-bec78aea704b', 'photo-1578985545062-69928b1d9587', 'photo-1563805042-7684c019e1cb', 'photo-1488477181946-6428a0291777'],
  healthy: ['photo-1512621776951-a57141f2eefd', 'photo-1546069901-ba9599a7e63c', 'photo-1540189549336-e6e99c3679fe', 'photo-1490645935967-10de6ba17061'],
  beverages: ['photo-1544145945-f90425340c7e', 'photo-1621263764928-df1444c5e859', 'photo-1570197788417-0e82375c9371', 'photo-1556679343-c7306c1976bc'],
}

export function poolImage(pool, index = 0) {
  const list = POOLS[pool] || POOLS.pizza
  return list[Math.abs(index) % list.length]
}

/** Returns an ordered list of candidate URLs for <FoodImage srcs=...>. */
export function imageCandidates(photoId, width = 800) {
  if (!photoId) return []
  return /^https:\/\//i.test(photoId) ? [photoId] : [unsplashUrl(photoId, width)]
}
