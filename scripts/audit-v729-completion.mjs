/**
 * v729 Option B completion audit — run: node scripts/audit-v729-completion.mjs
 * Set SKIP_BUILD=1 to skip long build steps.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const skipBuild = process.env.SKIP_BUILD === '1'

const checks = []

function check(name, ok, detail = '') {
  checks.push({ name, ok, detail })
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel))
}

function fileSize(rel) {
  return fs.statSync(path.join(root, rel)).size
}

check('0.2 platform.yml', exists('.github/workflows/platform.yml'))
check('0.3 simulator.yml', exists('.github/workflows/simulator.yml'))
check('0.4 shared.yml', exists('.github/workflows/shared.yml'))
check('0.5 tests.yml', exists('.github/workflows/tests.yml'))
check('0.1 hosting doc', exists('Documentation/CI_CD_Hosting_Setup.md'))
check('0.6 secrets documented', exists('Documentation/CI_CD_Hosting_Setup.md'))

check('1.2 platformRoutes.jsx', exists('src/routes/platformRoutes.jsx'))
check('1.3 simulatorRoutes.jsx', exists('src/routes/simulatorRoutes.jsx'))
check('1.4 authRoutes.jsx', exists('src/routes/authRoutes.jsx'))
check('1.5 publicRoutes.jsx', exists('src/routes/publicRoutes.jsx'))
const appSize = exists('src/App.jsx') ? fileSize('src/App.jsx') : Infinity
check('1.7 App.jsx under 150KB', appSize < 150 * 1024, `${appSize} bytes`)

check('2.1 platform/index.html', exists('platform/index.html'))
check('2.2 simulator/index.html', exists('simulator/index.html'))
check('2.3 platform-main.jsx', exists('src/platform-main.jsx'))
check('2.4 simulator-main.jsx', exists('src/simulator-main.jsx'))
check('2.5 PlatformApp.jsx', exists('src/PlatformApp.jsx'))
check('2.6 SimulatorApp.jsx', exists('src/SimulatorApp.jsx'))
check('2.7 vite.platform.config.js', exists('vite.platform.config.js'))
check('2.8 vite.simulator.config.js', exists('vite.simulator.config.js'))
check('2.9 platform manifest', exists('platform/manifest.json'))
check('2.9 simulator manifest', exists('simulator/manifest.json'))

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
check('2.10 build:platform script', !!pkg.scripts['build:platform'])
check('2.10 build:simulator script', !!pkg.scripts['build:simulator'])
check('2.10 build:all script', !!pkg.scripts['build:all'])

check('3.2 src/shared/', exists('src/shared/components/ui/index.js'))
check('3.10 Architecture_Boundaries.md', exists('Documentation/Architecture_Boundaries.md'))
check('3.7 eslint.boundaries.config.js', exists('eslint.boundaries.config.js'))

check('4.1 DOMAIN_MANIFEST.md', exists('supabase/functions/DOMAIN_MANIFEST.md'))
check('4.3 migrations/platform/', exists('supabase/migrations/platform/README.sql'))
check('4.4 migrations/simulator/', exists('supabase/migrations/simulator/README.sql'))
check('4.6 db-platform.yml', exists('.github/workflows/db-platform.yml'))
check('4.7 db-simulator.yml', exists('.github/workflows/db-simulator.yml'))
check('4.9 DB_Rollback_Guide.md', exists('Documentation/DB_Rollback_Guide.md'))

if (!skipBuild) {
  try {
    execSync('npm run build:platform', { cwd: root, stdio: 'pipe', timeout: 600000 })
    check('2.11 build:platform succeeds', true)
    check('2.13 dist/platform exists', exists('dist/platform/index.html'))
  } catch (e) {
    check('2.11 build:platform succeeds', false, e.stderr?.toString().slice(-500) || e.message)
  }

  try {
    execSync('npm run build:simulator', { cwd: root, stdio: 'pipe', timeout: 600000 })
    check('2.12 build:simulator succeeds', true)
    check('2.13 dist/simulator exists', exists('dist/simulator/index.html'))
  } catch (e) {
    check('2.12 build:simulator succeeds', false, e.stderr?.toString().slice(-500) || e.message)
  }
}

try {
  execSync('npm run lint:boundaries', { cwd: root, stdio: 'pipe', timeout: 120000 })
  check('3.9 lint:boundaries passes', true)
} catch (e) {
  check('3.9 lint:boundaries passes', false, e.stderr?.toString().slice(-300) || e.message)
}

try {
  execSync('npm run audit:cross-domain', { cwd: root, stdio: 'pipe', timeout: 60000 })
  check('3.1 cross-domain imports clean', true)
} catch {
  check('3.1 cross-domain imports clean', false)
}

try {
  execSync('npm run validate:menus', { cwd: root, stdio: 'pipe', timeout: 60000 })
  check('menu validation passes', true)
} catch (e) {
  check('menu validation passes', false, e.stderr?.toString().slice(-200) || e.message)
}

const failed = checks.filter((c) => !c.ok)
console.log('\nv729 Option B Audit\n' + '='.repeat(40))
for (const c of checks) {
  console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.name}${c.detail ? ' — ' + c.detail : ''}`)
}
console.log('='.repeat(40))
console.log(`${checks.length - failed.length}/${checks.length} passed`)
process.exit(failed.length ? 1 : 0)
