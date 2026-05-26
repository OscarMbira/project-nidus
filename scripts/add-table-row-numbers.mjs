/**
 * Codemod: add # row-number column to JSX tables missing TableRowNumberHeader.
 * Run: node scripts/add-table-row-numbers.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.join(__dirname, '..')
const srcRoot = path.join(repoRoot, 'src')

const EXCLUDE_PATH = [
  /[\\/]__tests__[\\/]/,
  /utils[\\/]/,
  /services[\\/]/,
  /components[\\/]ui[\\/]Table\.jsx$/,
]

const EXCLUDE_NAME = [
  /PrintView/i,
  /Print\.jsx/i,
  /Heatmap/i,
  /HeatMap/i,
  /TraceabilityMatrix/i,
  /PermissionMatrix/i,
  /RFPColumnMapper/i,
  /VarianceAnalysis/i,
  /invitationEmailBlocks/i,
  /EPRPrintView/i,
  /CheckpointReportPrintView/i,
  /HighlightReportPrintView/i,
  /HighlightReportToleranceSection/i,
  /ReportPreview/i,
  /RFPLineItemsTable/i,
  /BulkInviteForm/i,
  /TestBulkUploadWizard/i,
  /RFPColumnMapper/i,
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
  // Match complete import statements (including multiline blocks ending with } from '...')
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
  if (content.includes('getDisplayRowNumber')) return content

  const tableRel = relImport(filePath, 'components/ui/Table.jsx')
  const utilsRel = relImport(filePath, 'utils/tableRowNumberUtils.js')

  const tableImportRe = /import\s+\{([^}]+)\}\s+from\s+(['"])([^'"]*\/ui\/Table)\2/
  const tm = content.match(tableImportRe)
  if (tm) {
    const names = tm[1]
    if (!names.includes('TableRowNumberHeader')) {
      content = content.replace(
        tableImportRe,
        `import { ${names.trim()}, TableRowNumberHeader, TableRowNumberCell } from ${tm[2]}${tm[3]}${tm[2]}`
      )
    }
  } else {
    content = insertAfterLastImport(
      content,
      `import { TableRowNumberHeader, TableRowNumberCell } from '${tableRel}'`
    )
  }

  if (!content.includes('tableRowNumberUtils')) {
    content = insertAfterLastImport(content, `import { getDisplayRowNumber } from '${utilsRel}'`)
  }
  return content
}

function patchTableBlock(block) {
  if (block.includes('TableRowNumberHeader') || block.includes('TableRowNumberCell')) {
    return block
  }

  let b = block

  // thead: first <tr> gets # header
  b = b.replace(
    /(<thead[\s\S]*?<tr[^>]*>)/i,
    '$1\n                <TableRowNumberHeader className="!normal-case" />'
  )

  const tbodyMatch = b.match(/<tbody[\s\S]*<\/tbody>/i)
  if (!tbodyMatch) return b
  let tbody = tbodyMatch[0]

  // Add index to .map callbacks in tbody (skip if already has second param)
  tbody = tbody.replace(
    /\.map\(\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\)\s*=>/g,
    (full, param) => full // will handle below with negative lookahead
  )
  tbody = tbody.replace(
    /\.map\(\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\)\s*=>/g,
    '.map(($1, index) =>'
  )
  // Fix double-add if file had (row, idx) - rare

  // Insert number cell after each <tr> in tbody
  tbody = tbody.replace(
    /(<tr[^>]*>)(\r?\n)/g,
    '$1$2                    <TableRowNumberCell number={getDisplayRowNumber(index)} />$2'
  )

  b = b.replace(/<tbody[\s\S]*<\/tbody>/i, tbody)
  return b
}

function patchFile(filePath) {
  const base = path.basename(filePath)
  if (EXCLUDE_NAME.some((re) => re.test(base))) return false
  if (EXCLUDE_PATH.some((re) => re.test(filePath))) return false

  let content = fs.readFileSync(filePath, 'utf8')
  if (!content.includes('<table')) return false
  if (content.includes('TableRowNumberHeader') || content.includes('getDisplayRowNumber')) {
    return false
  }

  const tableRe = /<table[\s\S]*?<\/table>/gi
  if (!tableRe.test(content)) return false

  content = ensureImports(content, filePath)

  let changed = false
  const newContent = content.replace(/<table[\s\S]*?<\/table>/gi, (block) => {
    const patched = patchTableBlock(block)
    if (patched !== block) changed = true
    return patched
  })

  if (!changed) return false
  fs.writeFileSync(filePath, newContent, 'utf8')
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
