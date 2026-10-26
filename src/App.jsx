import { BrowserRouter } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import { ToastProvider } from './context/ToastContext.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { LocationProvider } from './context/LocationContext.jsx'
import { WishlistProvider } from './context/WishlistContext.jsx'
import { CartProvider } from './context/CartContext.jsx'
import { OrderProvider } from './context/OrderContext.jsx'
import { AdminProvider } from './admin/context/AdminContext.jsx'
import AppRoutes from './routes/AppRoutes.jsx'

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <LocationProvider>
              <WishlistProvider>
                <CartProvider>
                  <OrderProvider>
                    <AdminProvider>
                      <AppRoutes />
                    </AdminProvider>
                  </OrderProvider>
                </CartProvider>
              </WishlistProvider>
            </LocationProvider>
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </MotionConfig>
  )
}
