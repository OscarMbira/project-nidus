#!/usr/bin/env node
/**
 * v1351 guard (CLAUDE.md rule 79): no browser date pickers — `<input type="date">` / `type="datetime-local"` —
 * in Platform, Simulator, Planner or the shared packages. Use RegionalDateInput from @nidus/ui (`withTime` for a
 * date and time) so every date shows in the organisation's Regional & Format Settings.
 *
 *   node scripts/check-native-date-inputs.mjs           list offenders, exit 1 when any
 *   node scripts/check-native-date-inputs.mjs --warn    list only, exit 0
 *
 * scripts/native-date-input-allowlist.json holds files still waiting for v1351 (uncommitted work of other
 * sessions when it shipped). Do not add to it; remove an entry once its file is converted.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { attributes, tagEnd } from './replace-native-date-inputs.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIRS = ['apps/platform/src', 'apps/simulator/src', 'apps/planner/src', 'packages']

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', 'dist', '__tests__', 'coverage'].includes(e.name)) continue
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (/\.(jsx|tsx|js|ts)$/.test(e.name) && !/\.(test|spec)\./.test(e.name)) out.push(p)
  }
  return out
}

/** Offending lines in one file's source (comments skipped). Uses the codemod's JSX tag scanner, so props with
 * arrow functions (`=>`) before `type` are still seen. */
export function findPickers(src) {
  const hits = []
  const re = /<input(?=[\s/>])/g
  let m
  while ((m = re.exec(src))) {
    const lineStart = src.lastIndexOf('\n', m.index) + 1
    const lead = src.slice(lineStart, m.index)
    if (/^\s*(\*|\/\*|\/\/)/.test(lead) || lead.includes('//')) continue
    const end = tagEnd(src, m.index)
    if (end < 0) continue
    const type = attributes(src.slice(m.index, end)).find((a) => a.name === 'type')
    if (type?.value && /["'](?:date|datetime-local)["']/.test(type.value)) hits.push(src.slice(0, m.index).split('\n').length)
  }
  return hits
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const warn = process.argv.includes('--warn')
  const allowPath = path.join(ROOT, 'scripts/native-date-input-allowlist.json')
  const allow = new Set(fs.existsSync(allowPath) ? JSON.parse(fs.readFileSync(allowPath, 'utf8')) : [])
  const found = []
  const allowedSeen = new Set()
  for (const f of DIRS.flatMap((d) => walk(path.join(ROOT, d)))) {
    const rel = path.relative(ROOT, f).replace(/\\/g, '/')
    const lines = findPickers(fs.readFileSync(f, 'utf8'))
    if (!lines.length) continue
    if (allow.has(rel)) { allowedSeen.add(rel); continue }
    for (const l of lines) found.push(`${rel}:${l}`)
  }
  const stale = [...allow].filter((a) => !allowedSeen.has(a))
  if (stale.length) console.log(`Allow-list entries no longer needed — remove them:\n  ${stale.join('\n  ')}\n`)
  if (!found.length) {
    console.log(`No browser date pickers (${allow.size - stale.length} allow-listed file(s) still to convert).`)
    process.exit(0)
  }
  console.log(`Browser date pickers found (${found.length}) — use RegionalDateInput from @nidus/ui (rule 79):\n  ${found.join('\n  ')}`)
  process.exit(warn ? 0 : 1)
}
