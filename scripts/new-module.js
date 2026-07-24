#!/usr/bin/env node
/**
 * Scaffold a new federated module from _template.
 * Usage: node scripts/new-module.js <folder-name> [federation-name] [port]
 * Example: node scripts/new-module.js risk-module risk_module 5202
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { getModuleByFolder, getDefaultModuleUrl } from '../packages/modules/registry.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const templateDir = path.join(repoRoot, 'packages/modules/_template')
const modulesDir = path.join(repoRoot, 'packages/modules')

const folder = process.argv[2]
if (!folder) {
  console.error('Usage: node scripts/new-module.js <folder-name>')
  process.exit(1)
}

const registryEntry = getModuleByFolder(folder)
const federationName = process.argv[3] || registryEntry?.federationName || folder.replace(/-/g, '_')
const port = process.argv[4] || registryEntry?.port || 5299
const packageName = registryEntry?.packageName || `@nidus/${folder}`
const displayName = registryEntry?.displayName || folder

const targetDir = path.join(modulesDir, folder)
if (fs.existsSync(targetDir)) {
  console.error(`Module already exists: ${targetDir}`)
  process.exit(1)
}

function copyTemplate(src, dest, replacements) {
  const stat = fs.statSync(src)
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true })
    for (const entry of fs.readdirSync(src)) {
      copyTemplate(path.join(src, entry), path.join(dest, entry), replacements)
    }
    return
  }
  let content = fs.readFileSync(src, 'utf8')
  for (const [key, value] of Object.entries(replacements)) {
    content = content.split(key).join(value)
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.writeFileSync(dest, content)
}

const replacements = {
  MODULE_NAME: federationName,
  MODULE_FOLDER: folder,
  MODULE_PACKAGE: packageName,
  MODULE_PORT: String(port),
  MODULE_DISPLAY: displayName,
  MODULE_VERSION: '1.0.0',
  MODULE_ROUTE_PREFIX: registryEntry?.routePrefix || `/app/${folder}`,
}

copyTemplate(templateDir, targetDir, replacements)

// health.json
const healthPath = path.join(targetDir, 'public/health.json')
fs.mkdirSync(path.dirname(healthPath), { recursive: true })
fs.writeFileSync(
  healthPath,
  JSON.stringify({ name: federationName, version: '1.0.0', status: 'ok' }, null, 2),
)

console.log(`Created module: ${targetDir}`)
console.log(`  Federation name: ${federationName}`)
console.log(`  Dev URL: ${getDefaultModuleUrl(port)}`)
console.log(`  Run: pnpm --filter ${packageName} dev`)
