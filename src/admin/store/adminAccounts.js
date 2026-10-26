// DEMO ADMIN ACCOUNTS — generated once. Only salted SHA-256 hashes are stored (never raw passwords).
// The demo passwords are listed in the README on purpose: this is a demo, not production auth.
// Hash = SHA-256(`${salt}:${password}`), identical to the customer demo auth scheme.
export const DEMO_ADMIN_ACCOUNTS = [
  { id: 'adm-1', name: 'Priya Raman', email: 'super@craveo.demo', role: 'super_admin', active: true, salt: 'a1f4c9e07b3d5582', hash: '73c664dd686945f2eb8a562b37e6025aa8ffdf624333e6359340a86308e60148' },
  { id: 'adm-2', name: 'Karan Mehta', email: 'ops@craveo.demo', role: 'operations', active: true, salt: 'b27d1e90c4a63f18', hash: '56579cf4b0e190598d47137f6d23b6c6a6b446a61220e525b3103e67e1cb7163' },
  { id: 'adm-3', name: 'Lakshmi Iyer', email: 'restaurants@craveo.demo', role: 'restaurant_manager', active: true, salt: 'c39e2fa1d5b74029', hash: '6f263ef0ccf8ee1fc8faf383990a7ca6cff72ea0d6555dbd0478536558d0f4af' },
  { id: 'adm-4', name: 'Vikram Nair', email: 'finance@craveo.demo', role: 'finance', active: true, salt: 'd4a03b12e6c85a3b', hash: '42390e12385375b583004ed2fac8bf536c803289a2b35a7f8fbcab0e27569971' },
  { id: 'adm-5', name: 'Sneha Pillai', email: 'support@craveo.demo', role: 'support', active: true, salt: 'e5b14c23f7d96b4c', hash: '8f65850d9a0f8a76f67ea31af289dd18658bf207de778cee1f82c19089067a1d' },
]
