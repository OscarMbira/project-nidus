/**
 * Codemod: add RowNumberBadge to card/grid list views (ViewToggle pages with table row numbers).
 * Only targets files with TableRowNumberHeader AND viewMode/ViewToggle — not dashboards or forms.
 * Run: node scripts/add-card-row-number-badges.mjs
 * Verify: node scripts/check-missing-card-badges.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.join(__dirname, '..')
const srcRoot = path.join(repoRoot, 'src')

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (e.name === '__tests__' || e.name === 'node_modules') continue
      walk(p, acc)
    } else if (/\.jsx$/.test(e.name)) acc.push(p)
  }
  return acc
}

function isListPage(content) {
  const hasTableNumbers =
    content.includes('TableRowNumberHeader') || content.includes('TableRowNumberCell')
  if (!hasTableNumbers) return false
  return (
    content.includes('ViewToggle') ||
    content.includes('useViewMode') ||
    /viewMode\s*[=:]/.test(content) ||
    /registerViewMode/.test(content) ||
    /memberView/.test(content) ||
    /roleView/.test(content)
  )
}

function hasCardBadge(content) {
  return (
    content.includes('<RowNumberBadge') ||
    /rowNumber=\{getDisplayRowNumber/.test(content)
  )
}

const missing = []
for (const f of walk(srcRoot)) {
  const c = fs.readFileSync(f, 'utf8')
  if (!isListPage(c)) continue
  if (!hasCardBadge(c)) missing.push(path.relative(repoRoot, f))
}

console.log(`List pages missing card/grid badge: ${missing.length}`)
missing.forEach((f) => console.log(' ', f))
