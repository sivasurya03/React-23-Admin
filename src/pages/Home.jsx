import Hero from '../components/home/Hero.jsx'
import CategoryStrip from '../components/home/CategoryStrip.jsx'
import OfferBanners from '../components/home/OfferBanners.jsx'
import RestaurantRow from '../components/home/RestaurantRow.jsx'
import PopularDishes from '../components/home/PopularDishes.jsx'
import PlusPromo from '../components/home/PlusPromo.jsx'
import HowItWorks from '../components/home/HowItWorks.jsx'
import Testimonials from '../components/home/Testimonials.jsx'
import { featuredRestaurants, topRatedRestaurants, trendingRestaurants } from '../data/index.js'
import usePageTitle from '../hooks/usePageTitle.js'

export default function Home() {
  usePageTitle('Craveo — Food delivery, crafted')
  return (
    <>
      <Hero />
      <CategoryStrip />
      <OfferBanners />
      <RestaurantRow id="featured-title" eyebrow="Featured" title="Restaurants we’re obsessed with" subtitle="Hand-picked kitchens with great food and fast delivery." restaurants={featuredRestaurants.slice(0, 4)} to="/restaurants" linkLabel="See all restaurants" />
      <PopularDishes />
      <RestaurantRow id="trending-title" eyebrow="Trending" title="Trending this week" subtitle="What everyone in your city is ordering." restaurants={trendingRestaurants.slice(0, 4)} to="/restaurants?sort=rating" linkLabel="View trending" />
      <RestaurantRow id="top-title" eyebrow="Highly rated" title="Top-rated by customers" restaurants={topRatedRestaurants} to="/restaurants?sort=rating&rating=4.5" linkLabel="4.5+ rated" />
      <PlusPromo />
      <HowItWorks />
      <Testimonials />
    </>
  )
}
