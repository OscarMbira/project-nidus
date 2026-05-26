/**
 * Remove RowNumberBadge additions from files that are not list/card toggle pages.
 * Run after add-card-row-number-badges.mjs if it was too broad.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.join(__dirname, '..')
const srcRoot = path.join(repoRoot, 'src')

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (e.name === '__tests__' || e.name === 'node_modules') continue
      walk(p, acc)
    } else if (/\.jsx$/.test(e.name)) acc.push(p)
  }
  return acc
}

function shouldHaveCardBadges(content) {
  const hasTableNumbers =
    content.includes('TableRowNumberHeader') || content.includes('TableRowNumberCell')
  if (!hasTableNumbers) return false

  const hasViewToggle =
    content.includes('ViewToggle') ||
    content.includes('useViewMode') ||
    /viewMode\s*===\s*['"]grid['"]/.test(content) ||
    /viewMode\s*===\s*['"]card['"]/.test(content) ||
    /viewMode\s*!==\s*['"]list['"]/.test(content) ||
    /registerViewMode\s*===\s*['"]grid['"]/.test(content) ||
    /memberView\s*===\s*['"]grid['"]/.test(content) ||
    /roleView\s*===\s*['"]grid['"]/.test(content)

  return hasViewToggle
}

function stripBadges(content) {
  let c = content
  // Remove badge JSX lines
  c = c.replace(
    /^\s*<RowNumberBadge number=\{getDisplayRowNumber\(index\)\}[^/]*\/?>\s*\r?\n/gm,
    ''
  )
  // Remove unused RowNumberBadge import
  if (!c.includes('<RowNumberBadge')) {
    c = c.replace(/^import RowNumberBadge from ['"][^'"]+['"];?\s*\r?\n/gm, '')
  }
  // Remove getDisplayRowNumber import only if unused
  if (!c.includes('getDisplayRowNumber')) {
    c = c.replace(/^import \{ getDisplayRowNumber \} from ['"][^'"]+['"];?\s*\r?\n/gm, '')
  }
  return c
}

let reverted = 0
let kept = 0

for (const f of walk(srcRoot)) {
  const content = fs.readFileSync(f, 'utf8')
  if (!content.includes('RowNumberBadge')) continue

  if (shouldHaveCardBadges(content)) {
    kept++
    continue
  }

  const cleaned = stripBadges(content)
  if (cleaned !== content) {
    fs.writeFileSync(f, cleaned, 'utf8')
    reverted++
    console.log('reverted', path.relative(repoRoot, f))
  }
}

console.log(`Kept ${kept} list pages; reverted ${reverted} files`)
