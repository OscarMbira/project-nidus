/**
 * Codemod: add RowNumberBadge to card/grid list views.
 * Targets files with grid/card layouts that map over display rows.
 * Run: node scripts/add-card-row-number-badges.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.join(__dirname, '..')
const srcRoot = path.join(repoRoot, 'src')

const EXCLUDE_NAME = [
  /PrintView/i,
  /Print\.jsx/i,
  /Heatmap/i,
  /HeatMap/i,
  /TraceabilityMatrix/i,
  /PermissionMatrix/i,
  /ProjectsListViews/i,
  /RowNumberBadge\.jsx$/,
  /BulkInviteForm/i,
  /TestBulkUploadWizard/i,
  /ReportPreview/i,
]

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

function relImport(fromFile, targetPathFromSrc) {
  const fromDir = path.dirname(fromFile)
  const target = path.join(srcRoot, targetPathFromSrc)
  let r = path.relative(fromDir, target).replace(/\\/g, '/')
  if (!r.startsWith('.')) r = `./${r}`
  return r.replace(/\.jsx$/, '').replace(/\.js$/, '')
}

function insertAfterLastImport(content, line) {
  const importRe = /^import[\s\S]*?;?\s*$/gm
  let last = -1
  let m
  while ((m = importRe.exec(content)) !== null) {
    if (!m[0].includes('\n') && !m[0].trimEnd().endsWith(';') && !m[0].includes(' from ')) continue
    last = m.index + m[0].length
  }
  if (last === -1) return line + content
  return content.slice(0, last) + '\n' + line + content.slice(last)
}

function ensureImports(content, filePath) {
  const badgeRel = relImport(filePath, 'components/ui/RowNumberBadge.jsx')
  const utilsRel = relImport(filePath, 'utils/tableRowNumberUtils.js')

  if (!content.includes('RowNumberBadge')) {
    content = insertAfterLastImport(content, `import RowNumberBadge from '${badgeRel}'`)
  }
  if (!content.includes('getDisplayRowNumber')) {
    content = insertAfterLastImport(content, `import { getDisplayRowNumber } from '${utilsRel}'`)
  }
  return content
}

/** True when index is inside a <table>…</table> block */
function isInsideTable(content, index) {
  const before = content.slice(0, index)
  const lastTableOpen = before.lastIndexOf('<table')
  const lastTableClose = before.lastIndexOf('</table>')
  return lastTableOpen > lastTableClose
}

/** True when this map callback region looks like a card/grid item */
function isCardGridMapRegion(content, mapStart) {
  if (isInsideTable(content, mapStart)) return false
  const slice = content.slice(Math.max(0, mapStart - 800), mapStart + 1200)
  if (/<RowNumberBadge/.test(slice)) return false
  const hasGrid =
    /grid-cols|viewMode\s*===\s*['"]grid['"]|viewMode\s*===\s*['"]card['"]|ViewToggle|memberView\s*===\s*['"]grid['"]|roleView\s*===\s*['"]grid['"]|registerViewMode\s*===\s*['"]grid['"]/.test(
      slice
    )
  const hasCard =
    /<(?:div|article)[^>]*className="[^"]*(?:rounded|border|shadow|card|grid)[^"]*"/.test(slice) ||
    /<(?:div|article)\s/.test(content.slice(mapStart, mapStart + 400))
  return hasGrid || hasCard
}

function insertBadgeInMapBody(mapBody) {
  if (mapBody.includes('RowNumberBadge')) return mapBody

  // Prefer first flex row inside card
  const flexRe = /(<(?:div|header)[^>]*className="[^"]*\bflex[^"]*"[^>]*>)/
  if (flexRe.test(mapBody)) {
    return mapBody.replace(
      flexRe,
      '$1\n                  <RowNumberBadge number={getDisplayRowNumber(index)} className="shrink-0" />'
    )
  }

  // After card root opening tag
  const rootRe = /(<(?:div|article)[^>]*>)(\r?\n)/
  if (rootRe.test(mapBody)) {
    return mapBody.replace(
      rootRe,
      '$1$2                          <RowNumberBadge number={getDisplayRowNumber(index)} className="shrink-0 mb-2" />$2'
    )
  }

  return mapBody
}

function patchFile(filePath) {
  const base = path.basename(filePath)
  if (EXCLUDE_NAME.some((re) => re.test(base))) return false

  let content = fs.readFileSync(filePath, 'utf8')

  // Must have a grid/card list pattern
  if (
    !/grid-cols|viewMode\s*===\s*['"]grid['"]|viewMode\s*===\s*['"]card['"]|ViewToggle/.test(content)
  ) {
    return false
  }

  // Skip if every card map already has badge (file fully patched)
  const mapRe = /\.map\(\(\s*([a-zA-Z_][a-zA-Z0-9_]*)(?:\s*,\s*([a-zA-Z_][a-zA-Z0-9_]*))?\s*\)\s*=>/g
  let changed = false
  let result = ''
  let lastIndex = 0
  let m

  while ((m = mapRe.exec(content)) !== null) {
    const mapStart = m.index
    if (!isCardGridMapRegion(content, mapStart)) continue

    const param = m[1]
    const existingIndex = m[2]
    const needsIndex = !existingIndex || existingIndex === param

    // Find map body: arrow => ( ... ) or { return ( ... )
    const afterArrow = content.slice(mapStart + m[0].length)
    let bodyStart = mapStart + m[0].length
    let bodyEnd = bodyStart
    let mapBody = ''

    if (/^\s*\(/.test(afterArrow)) {
      // parenthesized JSX
      let depth = 0
      let started = false
      for (let i = bodyStart; i < content.length; i++) {
        const ch = content[i]
        if (ch === '(') {
          depth++
          started = true
        } else if (ch === ')') {
          depth--
          if (started && depth === 0) {
            bodyEnd = i + 1
            break
          }
        }
      }
      mapBody = content.slice(bodyStart, bodyEnd)
    } else if (/^\s*\{/.test(afterArrow)) {
      // block body — skip complex blocks for safety
      continue
    } else {
      continue
    }

    if (mapBody.includes('RowNumberBadge')) continue

    const newMapHeader = needsIndex
      ? `.map((${param}, index) =>`
      : m[0]

    const patchedBody = insertBadgeInMapBody(mapBody)
    if (patchedBody === mapBody && needsIndex) {
      // still add index even if badge insert failed on weird structure
      const withIndexOnly = newMapHeader + mapBody
      if (withIndexOnly !== m[0] + mapBody) {
        result += content.slice(lastIndex, mapStart)
        result += withIndexOnly
        lastIndex = bodyEnd
        changed = true
      }
      continue
    }
    if (patchedBody === mapBody) continue

    result += content.slice(lastIndex, mapStart)
    result += needsIndex ? `.map((${param}, index) =>` : m[0]
    result += patchedBody
    lastIndex = bodyEnd
    changed = true
  }

  if (!changed) return false

  content = result + content.slice(lastIndex)
  content = ensureImports(content, filePath)
  fs.writeFileSync(filePath, content, 'utf8')
  return true
}

const files = walk(srcRoot)
let count = 0
const updated = []
for (const f of files) {
  if (patchFile(f)) {
    count++
    updated.push(path.relative(repoRoot, f))
  }
}
console.log(`Updated ${count} files:`)
updated.forEach((f) => console.log(' ', f))
