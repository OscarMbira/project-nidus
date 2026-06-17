/**
 * Audit cross-domain imports (v729 Phase 3.1)
 * Run: node scripts/audit-cross-domain-imports.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const src = path.join(root, 'src')

const platformDirs = ['pages/platform-app', 'pages/app', 'components/app']
const simDirs = ['pages/simulator', 'pages/sim', 'components/sim', 'services/sim']

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) walk(p, acc)
    else if (/\.(jsx?|tsx?)$/.test(ent.name)) acc.push(p)
  }
  return acc
}

function importsIn(file) {
  const text = fs.readFileSync(file, 'utf8')
  const re = /(?:import\s+[^'"]+from\s+['"]([^'"]+)['"]|import\s*\(['"]([^'"]+)['"]\))/g
  const out = []
  let m
  while ((m = re.exec(text))) out.push(m[1] || m[2])
  return out
}

function violatesPlatform(imp) {
  return /pages\/simulator|pages\/sim|components\/sim|services\/sim/.test(imp.replace(/\\/g, '/'))
}

function violatesSim(imp) {
  const n = imp.replace(/\\/g, '/')
  return /(?:^|\/)pages\/platform-app(?:\/|$)/.test(n)
    || /(?:^|\/)pages\/app(?:\/|$)/.test(n)
    || /(?:^|\/)components\/app(?:\/|$)/.test(n)
}

const violations = []

for (const rel of platformDirs) {
  for (const file of walk(path.join(src, rel))) {
    for (const imp of importsIn(file)) {
      if (violatesPlatform(imp)) {
        violations.push({ domain: 'platform', file: path.relative(root, file), import: imp })
      }
    }
  }
}

for (const rel of simDirs) {
  for (const file of walk(path.join(src, rel))) {
    for (const imp of importsIn(file)) {
      if (violatesSim(imp)) {
        violations.push({ domain: 'simulator', file: path.relative(root, file), import: imp })
      }
    }
  }
}

console.log(`Cross-domain import audit: ${violations.length} violation(s)`)
for (const v of violations) {
  console.log(`  [${v.domain}] ${v.file} → ${v.import}`)
}
process.exit(violations.length ? 1 : 0)
