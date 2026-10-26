// Tests the REAL server-side auth handler (netlify/functions/admin-auth.mjs) directly in Node.
// This verifies the server logic only — it is not a deployed-site or browser test.
import assert from 'node:assert/strict'
import { handle, hashPassword, verifyPasswordHash, readConfig, createToken, readToken, ROLE_IDS } from '../netlify/functions/admin-auth.mjs'
import { ROLES } from '../src/admin/lib/rbac.js'

const NOW = Date.parse('2026-10-25T10:00:00Z')
const queue = []
const test = (n, f) => queue.push([n, f])
const SECRET = 's'.repeat(48)
const hash = await hashPassword('correct horse battery')
const env = { ADMIN_SESSION_SECRET: SECRET, ADMIN_ACCOUNTS: JSON.stringify([{ name: 'Real Admin', email: 'Real@Example.com', role: 'finance', passwordHash: hash }, { name: 'Boss', email: 'boss@example.com', role: 'super_admin', passwordHash: hash }]) }
const ev = (path, method, body, extra = {}) => ({ path, httpMethod: method, body: body === undefined ? undefined : JSON.stringify(body), headers: { host: 'site.test', 'content-type': 'application/json', ...extra } })
const login = (email, password, e = env, extra = {}, at = NOW) => handle(ev('/api/admin-auth/login', 'POST', { email, password }, extra), e, at)
const cookieFrom = (res) => res.headers['Set-Cookie'].split(';')[0]

test('role list matches the front-end roles', () => assert.deepEqual([...ROLE_IDS].sort(), ROLES.map((r) => r.id).sort()))
test('correct credentials succeed, email is case-insensitive, cookie is HttpOnly/Secure/SameSite', async () => {
  const r = await login('real@example.com', 'correct horse battery')
  assert.equal(r.statusCode, 200); const body = JSON.parse(r.body)
  assert.equal(body.user.role, 'finance'); assert.ok(!r.body.includes('passwordHash')); assert.ok(!r.body.includes('scrypt'))
  const c = r.headers['Set-Cookie']; assert.match(c, /HttpOnly/); assert.match(c, /Secure/); assert.match(c, /SameSite=Strict/)
  assert.equal((await login('REAL@EXAMPLE.COM', 'correct horse battery', env, { 'x-forwarded-for': '9.9.9.9' })).statusCode, 200)
})
test('wrong password, unknown email and blank fields are rejected with the same generic message', async () => {
  const a = await login('real@example.com', 'wrong'), b = await login('nobody@example.com', 'anything', env, { 'x-forwarded-for': '1.1.1.1' })
  assert.equal(a.statusCode, 401); assert.equal(b.statusCode, 401); assert.equal(a.body, b.body)
  assert.equal((await login('', '', env, { 'x-forwarded-for': '2.2.2.2' })).statusCode, 400)
  assert.equal((await login('real@example.com', 'x'.repeat(500), env, { 'x-forwarded-for': '3.3.3.3' })).statusCode, 400)
})
test('arbitrary email/password combinations are never accepted', async () => {
  for (const [e, p] of [['admin@admin.com', 'admin'], ['real@example.com', ''], ["' OR 1=1 --", 'x'], ['super@craveo.demo', 'Super@12345']]) assert.notEqual((await login(e, p, env, { 'x-forwarded-for': `4.${e.length}.4.4` })).statusCode, 200)
})
test('demo credentials do NOT work on the real server', async () => assert.equal((await login('super@craveo.demo', 'Super@12345', env, { 'x-forwarded-for': '5.5.5.5' })).statusCode, 401))
test('unconfigured server refuses everything (503) instead of accepting', async () => {
  for (const bad of [{}, { ADMIN_SESSION_SECRET: SECRET }, { ADMIN_SESSION_SECRET: 'short', ADMIN_ACCOUNTS: env.ADMIN_ACCOUNTS }, { ADMIN_SESSION_SECRET: SECRET, ADMIN_ACCOUNTS: 'not json' }, { ADMIN_SESSION_SECRET: SECRET, ADMIN_ACCOUNTS: JSON.stringify([{ name: 'x', email: 'a@b.co', role: 'god', passwordHash: hash }]) }, { ADMIN_SESSION_SECRET: SECRET, ADMIN_ACCOUNTS: JSON.stringify([{ name: 'x', email: 'a@b.co', role: 'finance', passwordHash: 'plain-text-password' }]) }]) {
    assert.equal(readConfig(bad).ok, false); assert.equal((await login('real@example.com', 'correct horse battery', bad)).statusCode, 503)
  }
})
test('lock-out after 5 failures, even for the right password', async () => {
  const ip = { 'x-forwarded-for': '7.7.7.7' }
  for (let i = 0; i < 5; i += 1) assert.equal((await login('boss@example.com', 'bad', env, ip)).statusCode, 401)
  assert.equal((await login('boss@example.com', 'correct horse battery', env, ip)).statusCode, 429)
  assert.equal((await login('boss@example.com', 'correct horse battery', env, ip, NOW + 61_000)).statusCode, 200)
})
test('session: valid cookie works, tampered/expired/missing cookies do not, role comes from the server', async () => {
  const r = await login('boss@example.com', 'correct horse battery', env, { 'x-forwarded-for': '8.8.8.8' }); const ck = cookieFrom(r)
  const ok = await handle(ev('/api/admin-auth/session', 'GET', undefined, { cookie: ck }), env, NOW + 1000)
  assert.equal(ok.statusCode, 200); assert.equal(JSON.parse(ok.body).user.role, 'super_admin')
  assert.equal((await handle(ev('/api/admin-auth/session', 'GET'), env, NOW)).statusCode, 401)
  assert.equal((await handle(ev('/api/admin-auth/session', 'GET', undefined, { cookie: ck.slice(0, -3) + 'abc' }), env, NOW)).statusCode, 401)
  assert.equal((await handle(ev('/api/admin-auth/session', 'GET', undefined, { cookie: ck }), env, NOW + 9 * 3600 * 1000)).statusCode, 401)
  const forged = `craveo_admin=${createToken({ email: 'boss@example.com' }, 'z'.repeat(48), NOW)}`
  assert.equal((await handle(ev('/api/admin-auth/session', 'GET', undefined, { cookie: forged }), env, NOW)).statusCode, 401)
  const revoked = { ...env, ADMIN_ACCOUNTS: JSON.stringify([JSON.parse(env.ADMIN_ACCOUNTS)[0]]) } // boss removed from config
  assert.equal((await handle(ev('/api/admin-auth/session', 'GET', undefined, { cookie: ck }), revoked, NOW + 1000)).statusCode, 401)
  const demoted = { ...env, ADMIN_ACCOUNTS: JSON.stringify(JSON.parse(env.ADMIN_ACCOUNTS).map((a) => (a.email === 'boss@example.com' ? { ...a, role: 'support' } : a))) }
  assert.equal(JSON.parse((await handle(ev('/api/admin-auth/session', 'GET', undefined, { cookie: ck }), demoted, NOW + 1000)).body).user.role, 'support')
})
test('logout clears the cookie; cross-origin and non-JSON logins are refused', async () => {
  assert.match((await handle(ev('/api/admin-auth/logout', 'POST'), env, NOW)).headers['Set-Cookie'], /Max-Age=0/)
  assert.equal((await login('real@example.com', 'correct horse battery', env, { origin: 'https://evil.test' })).statusCode, 403)
  assert.equal((await login('real@example.com', 'correct horse battery', env, { origin: 'https://site.test', 'x-forwarded-for': '6.6.6.6' })).statusCode, 200)
  assert.equal((await handle({ ...ev('/api/admin-auth/login', 'POST', { email: 'a', password: 'b' }), headers: { host: 'site.test', 'content-type': 'text/plain' } }, env, NOW)).statusCode, 415)
  assert.equal((await handle(ev('/api/admin-auth/nope', 'GET'), env, NOW)).statusCode, 404)
})
test('hashes are salted scrypt; tokens verify only with the right secret', async () => {
  const a = await hashPassword('same-password-123'), b = await hashPassword('same-password-123')
  assert.notEqual(a, b); assert.ok(a.startsWith('scrypt$')); assert.ok(await verifyPasswordHash('same-password-123', a)); assert.equal(await verifyPasswordHash('other', a), false)
  assert.equal(await verifyPasswordHash('x', 'plain'), false)
  const t = createToken({ email: 'a@b.co' }, SECRET, NOW); assert.ok(readToken(t, SECRET, NOW)); assert.equal(readToken(t, 'q'.repeat(40), NOW), null)
})

let passed = 0
console.log('Real auth function')
for (const [n, f] of queue) { try { await f(); passed += 1; console.log(`  ok   ${n}`) } catch (e) { process.exitCode = 1; console.error(`  FAIL ${n}\n       ${e.message}`) } }
console.log(`\n${passed}/${queue.length} auth function tests passed`)
