/**
 * Fix incorrect relative imports to tableRowNumberUtils.
 * Run: node scripts/fix-row-number-import-paths.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const srcRoot = path.join(__dirname, '..', 'src')
const target = path.join(srcRoot, 'utils', 'tableRowNumberUtils.js')

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (e.name === '__tests__' || e.name === 'node_modules') continue
      walk(p, acc)
    } else if (/\.jsx?$/.test(e.name)) acc.push(p)
  }
  return acc
}

function relImport(fromFile) {
  let r = path.relative(path.dirname(fromFile), target).replace(/\\/g, '/')
  if (!r.startsWith('.')) r = `./${r}`
  return r.replace(/\.js$/, '')
}

let fixed = 0
for (const f of walk(srcRoot)) {
  const content = fs.readFileSync(f, 'utf8')
  const re = /from\s+(['"])([^'"]*tableRowNumberUtils)\1/g
  if (!re.test(content)) continue

  const correct = relImport(f)
  const newContent = content.replace(
    /from\s+(['"])([^'"]*tableRowNumberUtils)\1/g,
    (match, q, imp) => {
      if (imp === correct) return match
      return `from ${q}${correct}${q}`
    }
  )
  if (newContent !== content) {
    fs.writeFileSync(f, newContent, 'utf8')
    fixed++
    console.log('fixed', path.relative(path.join(__dirname, '..'), f), '->', correct)
  }
}
console.log(`Fixed ${fixed} files`)
