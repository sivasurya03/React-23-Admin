// Generates the passwordHash for ADMIN_ACCOUNTS. The password is typed (hidden) or piped — it is never
// written to disk by this script, never put on the command line, and never leaves your machine.
//   node scripts/hash-admin-password.mjs
//   echo "my-long-passphrase" | node scripts/hash-admin-password.mjs
import { hashPassword } from '../netlify/functions/admin-auth.mjs'

async function readPassword() {
  if (!process.stdin.isTTY) {
    let data = ''
    for await (const chunk of process.stdin) data += chunk
    return data.replace(/\r?\n$/, '')
  }
  process.stdout.write('Password (hidden): ')
  process.stdin.setRawMode(true)
  process.stdin.resume()
  process.stdin.setEncoding('utf8')
  return new Promise((resolve) => {
    let value = ''
    process.stdin.on('data', (c) => {
      for (const ch of c) {
        if (ch === '\r' || ch === '\n') { process.stdin.setRawMode(false); process.stdin.pause(); process.stdout.write('\n'); resolve(value); return }
        if (ch === '\u0003') process.exit(1)
        if (ch === '\u007f') value = value.slice(0, -1)
        else value += ch
      }
    })
  })
}

const password = await readPassword()
if (password.length < 12) { console.error('Use at least 12 characters.'); process.exit(1) }
console.log(await hashPassword(password))
