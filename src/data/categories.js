import { poolImage } from './images.js'

export const CATEGORIES = [
  { id: 'pizza', name: 'Pizza', blurb: 'Wood-fired & loaded', tone: '#f97352', photo: poolImage('pizza', 0) },
  { id: 'burgers', name: 'Burgers', blurb: 'Stacked & juicy', tone: '#f59e3b', photo: poolImage('burgers', 0) },
  { id: 'biryani', name: 'Biryani', blurb: 'Slow-cooked dum', tone: '#d9822b', photo: poolImage('biryani', 0) },
  { id: 'north-indian', name: 'North Indian', blurb: 'Curries, naan & tandoor', tone: '#c2522d', photo: poolImage('north-indian', 0) },
  { id: 'south-indian', name: 'South Indian', blurb: 'Dosa, idli & more', tone: '#3f9d6a', photo: poolImage('south-indian', 0) },
  { id: 'chinese', name: 'Chinese', blurb: 'Wok-tossed favourites', tone: '#d9473a', photo: poolImage('chinese', 0) },
  { id: 'rolls-wraps', name: 'Rolls & Wraps', blurb: 'Hand-held & hearty', tone: '#b8862b', photo: poolImage('rolls-wraps', 0) },
  { id: 'desserts', name: 'Desserts', blurb: 'Sweet endings', tone: '#e0679a', photo: poolImage('desserts', 0) },
  { id: 'healthy', name: 'Healthy', blurb: 'Fresh & light', tone: '#5aa65a', photo: poolImage('healthy', 0) },
  { id: 'beverages', name: 'Beverages', blurb: 'Coffee, juices, shakes', tone: '#3b8fc4', photo: poolImage('beverages', 0) },
]

export const getCategory = (id) => CATEGORIES.find((c) => c.id === id)
