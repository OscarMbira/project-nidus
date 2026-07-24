/**
 * Remove simulator-only dynamic imports from platform lazyImports.js (v730).
 * Run: node scripts/v730-split-lazy-imports.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const SOURCE = fs.existsSync(path.join(ROOT, 'src/routes/lazyImports.js'))
  ? path.join(ROOT, 'src/routes/lazyImports.js')
  : path.join(ROOT, 'apps/platform/src/routes/lazyImports.js')

function isSimOnlyExport(line) {
  if (!line.includes('lazy(() => import(')) return false
  if (line.includes('SimulatorLocalDataExtensionsRoutes')) return true
  if (line.includes('/simulator/') || line.includes('simulator-app/')) return true
  if (line.includes('pages/sim/') || line.includes('/pages/sim/')) return true
  if (line.includes('components/sim/')) return true
  if (/export const Sim(?:ulator|ulation)/.test(line)) return true
  return false
}

function filterPlatform(content) {
  const lines = content.split('\n')
  return lines
    .filter((line) => !isSimOnlyExport(line))
    .map((line, i, arr) => {
      if (i === 0 && line.startsWith('import { lazy }')) return line
      return line
    })
    .join('\n')
    .replace(
      '// All lazy-loaded page components, extracted from App.jsx to keep App.jsx below 500 KB',
      '// Platform lazy imports (v730 — simulator dynamic imports removed)',
    )
}

function filterSimulator(content) {
  const lines = content.split('\n')
  const header = [
    "import { lazy } from 'react'",
    '',
    '// Simulator lazy imports (v730 split)',
    '',
  ]
  const sharedExports = lines.filter((line) => {
    if (!line.includes('export const')) return false
    if (isSimOnlyExport(line)) return false
    return true
  })
  const simExports = lines.filter(isSimOnlyExport)
  return [...header, ...sharedExports, '', '// --- Simulator-only ---', '', ...simExports].join('\n')
}

const original = fs.readFileSync(SOURCE, 'utf8')

const platformPath = path.join(ROOT, 'apps/platform/src/routes/lazyImports.js')
fs.writeFileSync(platformPath, filterPlatform(original), 'utf8')
console.log('Wrote platform lazyImports (sim imports removed)')

const simulatorPath = path.join(ROOT, 'apps/simulator/src/routes/lazyImports.js')
if (fs.existsSync(path.dirname(simulatorPath))) {
  fs.writeFileSync(simulatorPath, filterSimulator(original), 'utf8')
  console.log('Wrote simulator lazyImports')
}

// Also update legacy src if present
const legacyPath = path.join(ROOT, 'src/routes/lazyImports.js')
if (fs.existsSync(legacyPath) && legacyPath !== SOURCE) {
  // leave legacy unchanged
}

console.log('Done.')
