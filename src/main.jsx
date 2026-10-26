import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/plus-jakarta-sans'
import '@fontsource-variable/fraunces'
import './index.css'
import App from './App.jsx'
import { initAdminRuntime } from './admin/store/adminStore.js'

// Applies admin-managed catalog, coupons and pricing rules before the first render.
initAdminRuntime()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
