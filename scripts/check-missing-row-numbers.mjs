import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const srcRoot = path.join(__dirname, '..', 'src')

const EXCLUDE = [
  /PrintView/i, /Print\.jsx/i, /Heatmap/i, /HeatMap/i, /TraceabilityMatrix/i,
  /PermissionMatrix/i, /RFPColumnMapper/i, /VarianceAnalysis/i, /ReportPreview/i,
  /RFPLineItemsTable/i, /BulkInviteForm/i, /TestBulkUploadWizard/i,
  /HighlightReport/i, /EPRPrintView/i, /CheckpointReportPrintView/i,
  /components[\\/]ui[\\/]Table\.jsx$/,
  /EmailSenderProfiles\.jsx$/, // email HTML template
  /Documentation\.jsx$/, // markdown renderer
]

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

const missing = []
for (const f of walk(srcRoot)) {
  const rel = path.relative(path.join(__dirname, '..'), f)
  if (EXCLUDE.some((re) => re.test(f) || re.test(rel))) continue
  const c = fs.readFileSync(f, 'utf8')
  if (c.includes('<table') && !c.includes('TableRowNumberHeader') && !c.includes('TableRowNumberCell')) {
    missing.push(rel)
  }
}
console.log(`Missing row numbers: ${missing.length}`)
missing.forEach((f) => console.log(' ', f))
