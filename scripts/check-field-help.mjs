#!/usr/bin/env node
/**
 * v1345 — field-level contextual help coverage check (PRD G-D4 / G-D14, plan P6 / P14).
 *
 * Finds:
 *   1. help keys used by forms (FieldLabelWithHelp helpKey="…" and FieldHelpScope key lists
 *      written as [ 'a', 'b' ].map((name) => `prefix.${name}`)),
 *   2. help keys seeded in SQL (INSERT INTO public.field_help …) and Simulator aliases
 *      (INSERT INTO public.field_help_aliases …),
 *   3. raw <label> elements in form files that do not use FieldLabelWithHelp yet ("not adopted").
 *
 * Reports keys used without seeded help, and the not-adopted count per file. Gaps already known
 * sit in scripts/field-help-allowlist.json, which may only shrink.
 *
 *   node scripts/check-field-help.mjs                 # report (warn only, exit 0)
 *   node scripts/check-field-help.mjs --module stakeholders   # also: every key of that module seeded
 *   node scripts/check-field-help.mjs --enforce       # fail on gaps outside the allow-list (phase 5)
 *   node scripts/check-field-help.mjs --write-baseline
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ALLOWLIST = path.join(ROOT, 'scripts', 'field-help-allowlist.json')
const CODE_DIRS = ['apps/platform/src', 'apps/simulator/src', 'apps/planner/src', 'packages/ui/src', 'packages/shared/src', 'packages/planning/src']

/** Help keys referenced in one source file. */
export function extractUsedKeys(source) {
  const keys = new Set()
  for (const m of source.matchAll(/helpKey="([^"]+)"/g)) keys.add(m[1])
  for (const m of source.matchAll(/\[([^\]]*)\]\s*\.map\(\s*\(?\s*(\w+)\s*\)?\s*=>\s*`([^`$]*)\$\{\s*\2\s*\}`\s*\)/g)) {
    const prefix = m[3]
    for (const n of m[1].matchAll(/'([^']+)'/g)) keys.add(prefix + n[1])
  }
  return keys
}

/** Seeded help keys and alias → help-key map from SQL text. */
export function extractSeededKeys(sql) {
  const help = new Set()
  const aliases = new Map()
  for (const block of sql.matchAll(/INSERT INTO public\.field_help\s*\(([\s\S]*?)ON CONFLICT/g)) {
    for (const m of block[1].matchAll(/\(\s*'([^']+)'\s*,/g)) help.add(m[1])
  }
  for (const block of sql.matchAll(/INSERT INTO public\.field_help_aliases\s*\(([\s\S]*?)ON CONFLICT/g)) {
    for (const m of block[1].matchAll(/\(\s*'([^']+)'\s*,\s*'([^']+)'\s*\)/g)) aliases.set(m[1], m[2])
  }
  help.delete('help_key')
  return { help, aliases }
}

/** Raw <label> elements in a file that renders form fields (not yet using FieldLabelWithHelp). */
export function countNotAdopted(source) {
  if (!/<(input|select|textarea)\b/.test(source)) return 0
  return (source.match(/<label\b/g) || []).length
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '__tests__' || entry.name.startsWith('.')) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (/\.(jsx|js)$/.test(entry.name) && !/\.test\./.test(entry.name)) out.push(full)
  }
  return out
}

export function analyse({ files, sqlTexts, moduleKeysFilter = null }) {
  const used = new Map() // key → first file
  const notAdopted = {}
  for (const { file, source } of files) {
    for (const key of extractUsedKeys(source)) if (!used.has(key)) used.set(key, file)
    const n = countNotAdopted(source)
    if (n) notAdopted[file] = n
  }
  const help = new Set()
  const aliases = new Map()
  for (const sql of sqlTexts) {
    const r = extractSeededKeys(sql)
    r.help.forEach((k) => help.add(k))
    r.aliases.forEach((v, k) => aliases.set(k, v))
  }
  const covered = (key) => help.has(key) || help.has(aliases.get(key))
  const missing = [...used.keys()].filter((k) => !covered(k)).sort()
  const moduleMissing = moduleKeysFilter ? [...used.keys()].filter((k) => moduleKeysFilter(k) && !covered(k)).sort() : []
  const adopted = used.size
  const raw = Object.values(notAdopted).reduce((a, b) => a + b, 0)
  const coverage = adopted + raw === 0 ? 100 : Math.round(((adopted - missing.length) / (adopted + raw)) * 10000) / 100
  return { usedCount: used.size, seededCount: help.size, missing, moduleMissing, notAdopted, notAdoptedTotal: raw, coverage }
}

function main(argv) {
  const enforce = argv.includes('--enforce')
  const writeBaseline = argv.includes('--write-baseline')
  const moduleArg = argv.includes('--module') ? argv[argv.indexOf('--module') + 1] : null
  const files = CODE_DIRS.flatMap((d) => walk(path.join(ROOT, d)))
    .map((f) => ({ file: path.relative(ROOT, f).replace(/\\/g, '/'), source: fs.readFileSync(f, 'utf8') }))
  const sqlDir = path.join(ROOT, 'SQL')
  const sqlTexts = fs.readdirSync(sqlDir).filter((f) => f.endsWith('.sql'))
    .map((f) => fs.readFileSync(path.join(sqlDir, f), 'utf8'))
    .filter((t) => t.includes('field_help'))
  const MODULE_PREFIX = { stakeholders: ['public.stakeholders.', 'sim.practice_stakeholder_register.'] }
  const prefixes = moduleArg ? (MODULE_PREFIX[moduleArg] || [`${moduleArg}.`]) : null
  const result = analyse({ files, sqlTexts, moduleKeysFilter: prefixes ? (k) => prefixes.some((p) => k.startsWith(p)) : null })

  console.log(`Field help: ${result.usedCount} keys used, ${result.seededCount} seeded, ${result.missing.length} used without help.`)
  console.log(`Not yet adopted: ${result.notAdoptedTotal} raw <label> in ${Object.keys(result.notAdopted).length} form files. Approximate coverage ${result.coverage}%.`)
  for (const k of result.missing) console.log(`  ✗ no help seeded: ${k}`)
  if (moduleArg) console.log(`Module ${moduleArg}: ${result.moduleMissing.length === 0 ? 'all keys have help ✓' : `${result.moduleMissing.length} missing`}`)

  if (writeBaseline) {
    fs.writeFileSync(ALLOWLIST, `${JSON.stringify({ missing: result.missing, notAdopted: result.notAdopted }, null, 2)}\n`)
    console.log(`Baseline written to ${path.relative(ROOT, ALLOWLIST)}`)
    return 0
  }

  const allow = fs.existsSync(ALLOWLIST) ? JSON.parse(fs.readFileSync(ALLOWLIST, 'utf8')) : { missing: [], notAdopted: {} }
  const newMissing = result.missing.filter((k) => !allow.missing.includes(k))
  const grown = Object.entries(result.notAdopted).filter(([f, n]) => n > (allow.notAdopted?.[f] ?? 0))
  for (const k of newMissing) console.log(`  ✗ new gap (not on allow-list): ${k}`)
  for (const [f, n] of grown.slice(0, 25)) console.log(`  ✗ more raw labels than baseline: ${f} (${n} > ${allow.notAdopted?.[f] ?? 0})`)
  if (grown.length > 25) console.log(`  … and ${grown.length - 25} more files`)
  const moduleFail = moduleArg && result.moduleMissing.length > 0
  if ((enforce && (newMissing.length || grown.length)) || moduleFail) return 1
  if (newMissing.length || grown.length) console.log('Warning only (enforcement switches on in phase 5).')
  return 0
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv.slice(2)))
}
