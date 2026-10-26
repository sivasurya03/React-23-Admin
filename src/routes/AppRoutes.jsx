import { Suspense, lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import Layout from '../components/layout/Layout.jsx'
import AuthLayout from '../components/layout/AuthLayout.jsx'
import Home from '../pages/Home.jsx'
const Restaurants = lazy(() => import('../pages/Restaurants.jsx'))
const RestaurantDetail = lazy(() => import('../pages/RestaurantDetail.jsx'))
const Cart = lazy(() => import('../pages/Cart.jsx'))
const Checkout = lazy(() => import('../pages/Checkout.jsx'))
const OrderSuccess = lazy(() => import('../pages/OrderSuccess.jsx'))
const TrackOrder = lazy(() => import('../pages/TrackOrder.jsx'))
const Orders = lazy(() => import('../pages/Orders.jsx'))
const Wishlist = lazy(() => import('../pages/Wishlist.jsx'))
const Login = lazy(() => import('../pages/Login.jsx'))
const Signup = lazy(() => import('../pages/Signup.jsx'))
const ForgotPassword = lazy(() => import('../pages/ForgotPassword.jsx'))
const Help = lazy(() => import('../pages/Help.jsx'))
const InfoPage = lazy(() => import('../pages/InfoPage.jsx'))
const NotFound = lazy(() => import('../pages/NotFound.jsx'))

const AdminLayout = lazy(() => import('../admin/components/AdminLayout.jsx'))
const AdminLogin = lazy(() => import('../admin/pages/AdminLogin.jsx'))
const AdminDashboard = lazy(() => import('../admin/pages/Dashboard.jsx'))
const AdminOrders = lazy(() => import('../admin/pages/Orders.jsx'))
const AdminRestaurants = lazy(() => import('../admin/pages/Restaurants.jsx'))
const AdminMenu = lazy(() => import('../admin/pages/Menu.jsx'))
const AdminPartners = lazy(() => import('../admin/pages/Partners.jsx'))
const AdminCustomers = lazy(() => import('../admin/pages/Customers.jsx'))
const AdminFinance = lazy(() => import('../admin/pages/Finance.jsx'))
const AdminPromotions = lazy(() => import('../admin/pages/Promotions.jsx'))
const AdminSupport = lazy(() => import('../admin/pages/Support.jsx'))
const AdminReports = lazy(() => import('../admin/pages/Reports.jsx'))
const AdminSettings = lazy(() => import('../admin/pages/Settings.jsx'))
const AdminRoles = lazy(() => import('../admin/pages/Roles.jsx'))
const AdminAuditLogs = lazy(() => import('../admin/pages/AuditLogs.jsx'))
const AdminNotifications = lazy(() => import('../admin/pages/Notifications.jsx'))

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="admin/login" element={<Suspense fallback={null}><AdminLogin /></Suspense>} />
      <Route path="admin" element={<Suspense fallback={null}><AdminLayout /></Suspense>}>
        <Route index element={<AdminDashboard />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="restaurants" element={<AdminRestaurants />} />
        <Route path="menu" element={<AdminMenu />} />
        <Route path="delivery-partners" element={<AdminPartners />} />
        <Route path="customers" element={<AdminCustomers />} />
        <Route path="finance" element={<AdminFinance />} />
        <Route path="promotions" element={<AdminPromotions />} />
        <Route path="support" element={<AdminSupport />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="roles" element={<AdminRoles />} />
        <Route path="audit-logs" element={<AdminAuditLogs />} />
        <Route path="notifications" element={<AdminNotifications />} />
        <Route path="*" element={<AdminDashboard />} />
      </Route>
      <Route element={<AuthLayout />}>
        <Route path="login" element={<Login />} />
        <Route path="signup" element={<Signup />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
      </Route>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="restaurants" element={<Restaurants />} />
        <Route path="restaurant/:id" element={<RestaurantDetail />} />
        <Route path="cart" element={<Cart />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="order-success/:orderId" element={<OrderSuccess />} />
        <Route path="track-order/:orderId" element={<TrackOrder />} />
        <Route path="orders" element={<Orders />} />
        <Route path="wishlist" element={<Wishlist />} />
        <Route path="help" element={<Help />} />
        <Route path="about" element={<InfoPage kind="about" />} />
        <Route path="terms" element={<InfoPage kind="terms" />} />
        <Route path="privacy" element={<InfoPage kind="privacy" />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
