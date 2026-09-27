// Runs a command with the backend's virtualenv Python, on Windows or macOS/Linux.
//   node scripts/backend.mjs -m uvicorn app.main:app --reload
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const backend = join(import.meta.dirname, '..', 'backend')
const python = join(backend, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python')

if (!existsSync(python)) {
  console.error('No backend virtualenv yet. Set it up once with:\n  npm run setup:api')
  process.exit(1)
}

const { status } = spawnSync(python, process.argv.slice(2), { cwd: backend, stdio: 'inherit' })
process.exit(status ?? 1)
