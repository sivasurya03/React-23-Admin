// Public (non-secret) build flag. Set VITE_DEMO_ADMIN=false for a real deployment to switch off the
// built-in demo accounts and their one-click autofill. Real login never depends on this file.
export const DEMO_ENABLED = import.meta.env?.VITE_DEMO_ADMIN !== 'false'
