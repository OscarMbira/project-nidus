/**
 * v730 Turborepo migration — copies source trees and rewrites @nidus/* imports.
 * Run once: node scripts/v730-migrate.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function copyDir(src, dest, { exclude = [] } = {}) {
  if (!fs.existsSync(src)) {
    console.warn(`Skip missing: ${src}`)
    return
  }
  ensureDir(dest)
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (exclude.some((ex) => srcPath.replace(/\\/g, '/').includes(ex))) continue
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath, { exclude })
    } else {
      ensureDir(path.dirname(destPath))
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

function walkFiles(dir, cb) {
  if (!fs.existsSync(dir)) return
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walkFiles(full, cb)
    else if (/\.(jsx?|tsx?)$/.test(entry.name)) cb(full)
  }
}

/** Rewrite relative imports to @nidus/* package paths */
function rewriteImports(filePath) {
  let content = fs.readFileSync(filePath, 'utf8')
  let changed = false

  const rules = [
    // supabase
    [/from ['"](\.\.\/)+services\/supabase\/supabaseClient['"]/g, "from '@nidus/supabase'"],
    [/from ['"](\.\.\/)+services\/supabase\/platformRestSelect['"]/g, "from '@nidus/supabase/platformRestSelect'"],
    // config
    [/from ['"](\.\.\/)+config\/([^'"]+)['"]/g, "from '@nidus/config/$2'"],
    // context
    [/from ['"](\.\.\/)+context\/([^'"]+)['"]/g, "from '@nidus/shared/context/$2'"],
    // hooks
    [/from ['"](\.\.\/)+hooks\/([^'"]+)['"]/g, "from '@nidus/shared/hooks/$2'"],
    // constants
    [/from ['"](\.\.\/)+constants\/([^'"]+)['"]/g, "from '@nidus/shared/constants/$2'"],
    // utils
    [/from ['"](\.\.\/)+utils\/([^'"]+)['"]/g, "from '@nidus/shared/utils/$2'"],
    // ui components
    [/from ['"](\.\.\/)+components\/ui\/([^'"]+)['"]/g, "from '@nidus/ui/$2'"],
    [/from ['"]@\/components\/ui\/([^'"]+)['"]/g, "from '@nidus/ui/$1'"],
    [/from ['"]@shared\/components\/ui\/([^'"]+)['"]/g, "from '@nidus/ui/$1'"],
    // @/ aliases for shared packages
    [/from ['"]@\/context\/([^'"]+)['"]/g, "from '@nidus/shared/context/$1'"],
    [/from ['"]@\/hooks\/([^'"]+)['"]/g, "from '@nidus/shared/hooks/$1'"],
    [/from ['"]@\/utils\/([^'"]+)['"]/g, "from '@nidus/shared/utils/$1'"],
    [/from ['"]@\/constants\/([^'"]+)['"]/g, "from '@nidus/shared/constants/$1'"],
    [/from ['"]@\/config\/([^'"]+)['"]/g, "from '@nidus/config/$1'"],
    [/from ['"]@shared\/utils\/([^'"]+)['"]/g, "from '@nidus/shared/utils/$1'"],
    [/from ['"]@shared\/context\/([^'"]+)['"]/g, "from '@nidus/shared/context/$1'"],
    [/from ['"]@shared\/hooks\/([^'"]+)['"]/g, "from '@nidus/shared/hooks/$1'"],
  ]

  for (const [pattern, replacement] of rules) {
    const next = content.replace(pattern, replacement)
    if (next !== content) {
      content = next
      changed = true
    }
  }

  if (changed) fs.writeFileSync(filePath, content, 'utf8')
}

console.log('v730 migration — copying packages...')

// --- packages/supabase ---
const supabaseSrc = path.join(ROOT, 'packages/supabase/src')
ensureDir(supabaseSrc)
for (const f of ['supabaseClient.js', 'platformRestSelect.js']) {
  const src = path.join(ROOT, 'src/services/supabase', f)
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(supabaseSrc, f === 'supabaseClient.js' ? 'index.js' : f))
}

// --- packages/ui ---
copyDir(path.join(ROOT, 'src/components/ui'), path.join(ROOT, 'packages/ui/src'))

// --- packages/shared ---
copyDir(path.join(ROOT, 'src/utils'), path.join(ROOT, 'packages/shared/src/utils'))
copyDir(path.join(ROOT, 'src/hooks'), path.join(ROOT, 'packages/shared/src/hooks'))
copyDir(path.join(ROOT, 'src/context'), path.join(ROOT, 'packages/shared/src/context'))
const constantsDir = path.join(ROOT, 'src/constants')
if (fs.existsSync(constantsDir)) {
  copyDir(constantsDir, path.join(ROOT, 'packages/shared/src/constants'))
}

// --- packages/config ---
copyDir(path.join(ROOT, 'src/config'), path.join(ROOT, 'packages/config/src'))

console.log('v730 migration — copying apps/platform...')

const PLATFORM_EXCLUDE = [
  '/pages/simulator/',
  '/pages/sim/',
  '/components/sim/',
  '/services/sim/',
  '/modules/sim/',
  'SimulatorApp.jsx',
  'simulator-main.jsx',
  '/routes/simulatorRoutes.jsx',
]

const platformSrc = path.join(ROOT, 'apps/platform/src')
copyDir(path.join(ROOT, 'src'), platformSrc, { exclude: PLATFORM_EXCLUDE })
// Also copy features, test if present
if (fs.existsSync(path.join(ROOT, 'src/features'))) {
  copyDir(path.join(ROOT, 'src/features'), path.join(platformSrc, 'features'))
}

console.log('v730 migration — copying apps/simulator...')

const simulatorSrc = path.join(ROOT, 'apps/simulator/src')
ensureDir(simulatorSrc)

// Sim-specific trees
for (const rel of [
  'pages/simulator',
  'pages/sim',
  'components/sim',
  'services/sim',
  'modules/sim',
]) {
  copyDir(path.join(ROOT, 'src', rel), path.join(simulatorSrc, rel))
}

// Shared shell needed by SimulatorApp
for (const rel of [
  'components/ErrorBoundary.jsx',
  'components/Layout.jsx',
  'components/ProtectedRoute.jsx',
  'components/ThemeToggle.jsx',
  'components/AppToPlatformRedirect.jsx',
  'components/pwa',
  'routes/authRoutes.jsx',
  'routes/publicRoutes.jsx',
  'routes/routeCommon.jsx',
  'routes/simulatorRoutes.jsx',
  'routes/lazyImports.js',
]) {
  const src = path.join(ROOT, 'src', rel)
  const dest = path.join(simulatorSrc, rel)
  if (fs.existsSync(src)) {
    if (fs.statSync(src).isDirectory()) copyDir(src, dest)
    else {
      ensureDir(path.dirname(dest))
      fs.copyFileSync(src, dest)
    }
  }
}

// Copy pages referenced by public/auth routes (homepage, login, etc.)
const sharedPageDirs = ['auth', 'onboarding', 'legal']
for (const d of sharedPageDirs) {
  copyDir(path.join(ROOT, 'src/pages', d), path.join(simulatorSrc, 'pages', d))
}
for (const f of [
  'NidusHomepage.jsx', 'Home.jsx', 'PlatformHomepage.jsx', 'SimulatorHomepage.jsx',
  'Documentation.jsx', 'FeaturesPage.jsx', 'BlogPage.jsx', 'ResourcesPage.jsx',
  'PricingPage.jsx', 'PlatformPricing.jsx', 'BundlePricing.jsx', 'SimulatorPricing.jsx',
  'AboutPage.jsx', 'ContactPage.jsx', 'PlatformRequestDemoPage.jsx', 'SimulatorRequestDemoPage.jsx',
]) {
  const src = path.join(ROOT, 'src/pages', f)
  if (fs.existsSync(src)) {
    ensureDir(path.join(simulatorSrc, 'pages'))
    fs.copyFileSync(src, path.join(simulatorSrc, 'pages', f))
  }
}

// Shared components used by public layout
const sharedComponentDirs = [
  'documentation', 'homepage', 'pricing', 'blog', 'contact', 'legal', 'navigation',
]
for (const d of sharedComponentDirs) {
  const src = path.join(ROOT, 'src/components', d)
  if (fs.existsSync(src)) copyDir(src, path.join(simulatorSrc, 'components', d))
}
for (const f of ['Footer.jsx', 'Header.jsx', 'Navbar.jsx', 'Sidebar.jsx']) {
  const src = path.join(ROOT, 'src/components', f)
  if (fs.existsSync(src)) {
    ensureDir(path.join(simulatorSrc, 'components'))
    fs.copyFileSync(src, path.join(simulatorSrc, 'components', f))
  }
}

// pmis-gaps sim pages + record-lifecycle for simulator
copyDir(path.join(ROOT, 'src/modules/pmis-gaps'), path.join(simulatorSrc, 'modules/pmis-gaps'))
copyDir(path.join(ROOT, 'src/modules/record-lifecycle'), path.join(simulatorSrc, 'modules/record-lifecycle'))

// Non-sim services simulator still needs (organisation, trial, etc.)
const simSharedServices = fs.readdirSync(path.join(ROOT, 'src/services'))
  .filter((f) => f !== 'sim' && !f.startsWith('sim') && fs.statSync(path.join(ROOT, 'src/services', f)).isFile())
for (const f of simSharedServices.slice(0, 30)) {
  // copy key shared services only — full set copied below
}
copyDir(path.join(ROOT, 'src/services'), path.join(simulatorSrc, 'services'), {
  exclude: [], // copy all; sim/ subfolder already copied
})
// Remove duplicate if we copied whole services — actually copy all services for simulator
// Sim services are in services/sim; other services may be needed for auth/onboarding

console.log('v730 migration — rewriting imports in packages and apps...')
for (const dir of [
  path.join(ROOT, 'packages'),
  path.join(ROOT, 'apps'),
]) {
  walkFiles(dir, rewriteImports)
}

console.log('v730 migration complete.')
