#!/usr/bin/env node
/**
 * Validate menuRegistry route_path values against App.jsx routes.
 * Run: npm run validate:menus
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const appJsxPath = path.join(root, 'src', 'App.jsx')
const pmisGapRoutesPath = path.join(root, 'src', 'modules', 'pmis-gaps', 'routes', 'PmisGapRoutes.jsx')
const recordLifecycleRoutesPath = path.join(root, 'src', 'modules', 'record-lifecycle', 'routes', 'RecordLifecycleRoutes.jsx')
const registryPath = path.join(root, 'src', 'config', 'menuRegistry.js')

function extractAppRoutes(appContent) {
  const routes = new Set()
  const re = /path=["']([^"']+)["']/g
  let m
  while ((m = re.exec(appContent)) !== null) {
    const raw = m[1].trim()
    if (!raw || raw === '*' || raw.startsWith(':')) continue
    const normalized = raw.startsWith('/') ? raw : `/${raw}`
    routes.add(normalized.replace(/\/$/, '') || '/')
    // Also store without leading slash for nested route matching
    routes.add(normalized.replace(/^\//, '').replace(/\/$/, ''))
  }
  return routes
}

function routeExistsInApp(registryPath, appRoutes, appContent) {
  const normalized = registryPath.replace(/\/$/, '')
  const withSlash = normalized.startsWith('/') ? normalized : `/${normalized}`
  const withoutSlash = withSlash.replace(/^\//, '')

  if (appRoutes.has(withSlash) || appRoutes.has(withoutSlash)) return true
  if (appContent.includes(`path="${withoutSlash}"`)) return true
  if (appContent.includes(`path='${withoutSlash}'`)) return true
  if (appContent.includes(withSlash)) return true

  // Wildcard parent routes (e.g. pmo/process-templates/*)
  const parts = withoutSlash.split('/')
  for (let i = parts.length; i >= 1; i--) {
    const prefix = parts.slice(0, i).join('/')
    if (
      appContent.includes(`path="${prefix}/*"`) ||
      appContent.includes(`path='${prefix}/*'`)
    ) {
      return true
    }
  }

  // Prefix match for nested routes
  for (const r of appRoutes) {
    const full = r.startsWith('/') ? r : `/${r}`
    if (withSlash.startsWith(full + '/') || full.startsWith(withSlash + '/')) return true
    if (withSlash === full) return true
  }
  return false
}

async function main() {
  let appContent = fs.readFileSync(appJsxPath, 'utf8')
  if (fs.existsSync(pmisGapRoutesPath)) {
    appContent += fs.readFileSync(pmisGapRoutesPath, 'utf8')
  }
  if (fs.existsSync(recordLifecycleRoutesPath)) {
    appContent += fs.readFileSync(recordLifecycleRoutesPath, 'utf8')
  }
  const appRoutes = extractAppRoutes(appContent)

  const { MENU_REGISTRY } = await import(pathToFileURL(registryPath).href)

  const errors = []
  const warnings = []

  for (const entry of MENU_REGISTRY) {
    if (!entry.route_path || entry.is_container) continue

    if (!routeExistsInApp(entry.route_path, appRoutes, appContent)) {
      errors.push(`[${entry.menu_code}] route not found in App.jsx/PmisGapRoutes: ${entry.route_path}`)
    }

    if (!entry.menu_code) errors.push('Entry missing menu_code')
    if (!entry.menu_label) errors.push(`[${entry.menu_code}] missing menu_label`)
    if (!Array.isArray(entry.roles) || entry.roles.length === 0) {
      warnings.push(`[${entry.menu_code}] no default roles defined`)
    }
  }

  const codes = MENU_REGISTRY.map((e) => e.menu_code)
  const dupes = codes.filter((c, i) => codes.indexOf(c) !== i)
  if (dupes.length) {
    errors.push(`Duplicate menu_code values: ${[...new Set(dupes)].join(', ')}`)
  }

  console.log(`Validated ${MENU_REGISTRY.length} registry entries against App.jsx + PmisGapRoutes`)
  if (warnings.length) {
    console.warn('\nWarnings:')
    warnings.forEach((w) => console.warn(`  ⚠ ${w}`))
  }
  if (errors.length) {
    console.error('\nErrors:')
    errors.forEach((e) => console.error(`  ✗ ${e}`))
    process.exit(1)
  }
  console.log('\n✓ All registry routes valid')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
