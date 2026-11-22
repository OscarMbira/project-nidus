#!/usr/bin/env node
/**
 * v1351 — replace browser date pickers with the shared RegionalDateInput (CLAUDE.md rule 79).
 *
 *   node scripts/replace-native-date-inputs.mjs [--write] [--skip-dirty] [paths…]
 *
 * Rewrites JSX `<input type="date" …/>` and `<input type="datetime-local" …/>` to
 * `<RegionalDateInput eventStyle [withTime] …/>`: every other prop is kept (the control takes the native input's
 * props, and `eventStyle` hands onChange the same `e.target.value` shape), and the import is added.
 * Reports what it will not touch for a hand edit: refs, spread props, defaultValue (uncontrolled), dynamic `type`.
 * Default paths: apps/{platform,simulator,planner}/src and packages (tests and node_modules skipped).
 * --skip-dirty leaves files with uncommitted changes alone (other sessions' work) and lists them.
 */
import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..')
const args = process.argv.slice(2)
const WRITE = args.includes('--write')
const SKIP_DIRTY = args.includes('--skip-dirty')
const targets = args.filter((a) => !a.startsWith('--'))
const DEFAULT_TARGETS = ['apps/platform/src', 'apps/simulator/src', 'apps/planner/src', 'packages']
const IMPORT_LINE = "import RegionalDateInput from '@nidus/ui/RegionalDateInput'"

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === 'dist' || e.name === '__tests__') continue
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (/\.(jsx|tsx|js)$/.test(e.name) && !/\.test\./.test(e.name)) out.push(p)
  }
  return out
}

/** End index (exclusive) of the JSX tag starting at `start` ('<'), honouring {…} expressions and strings. */
export function tagEnd(src, start) {
  let i = start + 1
  const stack = [] // '{' or '`'
  let quote = null // ' or " outside a template
  while (i < src.length) {
    const c = src[i]
    const top = stack[stack.length - 1]
    if (quote) {
      if (c === '\\') { i += 2; continue }
      if (c === quote) quote = null
      i++; continue
    }
    if (top === '`') {
      if (c === '\\') { i += 2; continue }
      if (c === '`') stack.pop()
      else if (c === '$' && src[i + 1] === '{') { stack.push('{'); i++ }
      i++; continue
    }
    if (stack.length === 0) {
      if (c === '"' || c === "'") { quote = c; i++; continue }
      if (c === '{') { stack.push('{'); i++; continue }
      if (c === '/' && src[i + 1] === '>') return i + 2
      if (c === '>') return i + 1
      i++; continue
    }
    // inside { }
    if (c === '"' || c === "'") quote = c
    else if (c === '`') stack.push('`')
    else if (c === '{') stack.push('{')
    else if (c === '}') stack.pop()
    i++
  }
  return -1
}

/** Top-level attributes of a tag's text: [{ name, value, start, end }] (spread → name '...'). */
/** Index of the '}' closing the '{' at `i` (strings skipped; template `${…}` counted as braces). */
function braceEnd(tag, i) {
  let depth = 0; let q = null
  for (let j = i; j < tag.length; j++) {
    const c = tag[j]
    if (q) { if (c === '\\') { j++; continue } if (c === q) q = null; else if (q === '`' && c === '$' && tag[j + 1] === '{') { depth++; j++ } continue }
    if (c === '"' || c === "'" || c === '`') { q = c; continue }
    if (c === '{') depth++
    else if (c === '}') { depth--; if (depth === 0) return j }
  }
  return tag.length - 1
}

export function attributes(tag) {
  const out = []
  let i = /^<[A-Za-z.]+/.exec(tag)[0].length
  while (i < tag.length) {
    while (i < tag.length && /\s/.test(tag[i])) i++
    if (tag[i] === '/' || tag[i] === '>') break
    const s = i
    if (tag[i] === '{') {
      const j = braceEnd(tag, i)
      out.push({ name: '...', value: tag.slice(i, j + 1), start: s, end: j + 1 }); i = j + 1; continue
    }
    const m = /^[A-Za-z_:][-\w:.]*/.exec(tag.slice(i))
    if (!m) { i++; continue }
    i += m[0].length
    let value = null
    if (tag[i] === '=') {
      i++
      const q = tag[i]
      if (q === '"' || q === "'") { const e = tag.indexOf(q, i + 1); value = tag.slice(i, e + 1); i = e + 1 }
      else if (q === '{') { const j = braceEnd(tag, i); value = tag.slice(i, j + 1); i = j + 1 }
    }
    out.push({ name: m[0], value, start: s, end: i })
  }
  return out
}

export function transform(src) {
  const report = []
  let changed = 0
  let out = ''
  let pos = 0
  const re = /<input(?=[\s/>])/g
  let m
  while ((m = re.exec(src))) {
    const lineStart = src.lastIndexOf('\n', m.index) + 1
    const lead = src.slice(lineStart, m.index)
    if (/^\s*(\*|\/\*|\/\/)/.test(lead) || lead.includes('//')) continue // in a comment
    const end = tagEnd(src, m.index)
    if (end < 0) continue
    const tag = src.slice(m.index, end)
    const attrs = attributes(tag)
    const typeAttr = attrs.find((a) => a.name === 'type')
    if (!typeAttr || !typeAttr.value) continue
    const tv = typeAttr.value.replace(/^["'{]|["'}]$/g, '')
    const line = src.slice(0, m.index).split('\n').length
    const isStatic = /^["']/.test(typeAttr.value)
    if (!isStatic) {
      if (/date/.test(typeAttr.value)) report.push({ line, reason: `dynamic type ${typeAttr.value}` })
      continue
    }
    if (tv !== 'date' && tv !== 'datetime-local') continue
    const blockers = attrs.filter((a) => a.name === 'ref' || a.name === '...' || a.name === 'defaultValue' || a.name === 'onInput')
    if (blockers.length) { report.push({ line, reason: `has ${blockers.map((b) => b.name).join(', ')}` }); continue }
    // Remove the type attribute (with the whitespace before it) and rename the tag.
    let before = typeAttr.start
    while (before > 0 && /\s/.test(tag[before - 1])) before--
    let next = tag.slice(0, before) + tag.slice(typeAttr.end)
    const extra = ` eventStyle${tv === 'datetime-local' ? ' withTime' : ''}`
    next = next.replace(/^<input/, `<RegionalDateInput${extra}`)
    out += src.slice(pos, m.index) + next
    pos = end
    re.lastIndex = end
    changed++
  }
  out += src.slice(pos)
  if (changed && !/import RegionalDateInput from/.test(out)) out = addImport(out)
  return { code: out, changed, report }
}

export function addImport(src) {
  const re = /^import\s(?:[^;'"]*?\sfrom\s*)?['"][^'"]+['"];?[^\n]*$/gm
  let last = null
  let m
  while ((m = re.exec(src))) last = m
  if (!last) return `${IMPORT_LINE}\n${src}`
  const at = last.index + last[0].length
  return `${src.slice(0, at)}\n${IMPORT_LINE}${src.slice(at)}`
}

function dirtyFiles() {
  try {
    return new Set(execSync('git status --porcelain', { cwd: ROOT, encoding: 'utf8' })
      .split('\n').filter((l) => /^ ?M/.test(l)).map((l) => path.join(ROOT, l.slice(3).trim())))
  } catch { return new Set() }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))) {
  const files = (targets.length ? targets : DEFAULT_TARGETS).flatMap((t) => {
    const p = path.join(ROOT, t)
    return fs.existsSync(p) && fs.statSync(p).isFile() ? [p] : walk(p)
  }).filter((f) => !f.endsWith(`${path.sep}RegionalDateInput.jsx`))
  const dirty = SKIP_DIRTY ? dirtyFiles() : new Set()
  let total = 0; let fileCount = 0
  const skipped = []; const manual = []
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8')
    if (!/type=["'](?:date|datetime-local)["']|type=\{[^}]*date/.test(src)) continue
    const rel = path.relative(ROOT, f).replace(/\\/g, '/')
    if (dirty.has(f)) { skipped.push(rel); continue }
    const { code, changed, report } = transform(src)
    for (const r of report) manual.push(`${rel}:${r.line} — ${r.reason}`)
    if (!changed) continue
    total += changed; fileCount++
    if (WRITE) fs.writeFileSync(f, code)
  }
  console.log(`${WRITE ? 'Replaced' : 'Would replace'} ${total} pickers in ${fileCount} files.`)
  if (manual.length) console.log(`\nHand edits (${manual.length}):\n  ${manual.join('\n  ')}`)
  if (skipped.length) console.log(`\nSkipped — uncommitted changes from other work (${skipped.length}):\n  ${skipped.join('\n  ')}`)
}
