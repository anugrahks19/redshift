import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const lab = join(root, 'analog', 'analog')
const landing = join(root, 'frontend_two copy')
const packageTarget = join(landing, 'public', 'analog')
const dataTarget = join(landing, 'public', 'data')
const dev = process.argv.includes('--dev')

function run(args, cwd, env = process.env) {
  const result = spawnSync('npm', args, {
    cwd,
    env,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

function replaceGeneratedDirectory(source, destination) {
  const publicRoot = resolve(landing, 'public') + sep
  if (!resolve(destination).startsWith(publicRoot)) throw new Error(`Unsafe output path: ${destination}`)
  if (!existsSync(source)) throw new Error(`Missing build input: ${source}`)
  rmSync(destination, { recursive: true, force: true })
  mkdirSync(destination, { recursive: true })
  cpSync(source, destination, { recursive: true, force: true })
}

run(['run', 'build'], lab, { ...process.env, VITE_BASE: '/analog/' })
replaceGeneratedDirectory(join(lab, 'dist'), packageTarget)
replaceGeneratedDirectory(join(lab, 'public', 'data'), dataTarget)

if (dev) run(['run', 'dev'], landing)
else run(['run', 'build'], landing)
