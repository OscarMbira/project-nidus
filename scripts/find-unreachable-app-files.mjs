/**
 * v1349 — lists source files in an app that cannot be reached from its entry point by following imports
 * (static imports, re-exports and dynamic import()). Relative imports, `@/` and `@shell/` are followed;
 * package imports (@nidus/*, node_modules) are not, except that every `@shell/…` target used by a shared
 * package or federated module (v1240) counts as reachable.
 *
 * A lazy page registry entry (`export const X = lazy(() => import('…'))`) only makes a page reachable when a
 * reachable file renders <X …> or passes X as a component (Component={X}, element: X). This is repeated until
 * stable, so a page rendered only by another unreachable file stays unreachable.
 *
 *   node scripts/find-unreachable-app-files.mjs simulator              # summary by folder
 *   node scripts/find-unreachable-app-files.mjs simulator --list       # every unreachable file
 *   node scripts/find-unreachable-app-files.mjs simulator --under components/plans
 *   node scripts/find-unreachable-app-files.mjs simulator --skip-dirty # leave out files with uncommitted edits
 *   node scripts/find-unreachable-app-files.mjs simulator --fail       # exit 1 when anything is unreachable (CI)
 *   node scripts/find-unreachable-app-files.mjs simulator --bundle     # what the bundler compiles (every lazy entry,
 *     rendered or not): a file unreachable in normal mode but reachable here is kept alive only by an unused
 *     lazy entry — remove the entry first, or the build breaks when its imports are deleted
 *
 * Tests (__tests__, test/, *.test.*, *.spec.*) are ignored as entry points and as results. Review before
 * deleting: a file loaded by a string path (a glob or a CMS-driven route) would show as unreachable.
 */
import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const EXTS = ['.jsx', '.js', '.tsx', '.ts', '.mjs']
const SKIP_DIRS = new Set(['node_modules', '__tests__', 'test', 'dist'])
const IMPORT_RE = /(?:import|export)\s[^'"`;]*?from\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|import\s+['"]([^'"]+)['"]/g
const LAZY_RE = /export\s+const\s+([A-Z][A-Za-z0-9_]*)\s*=\s*lazy\(\s*\(\)\s*=>\s*import\(\s*['"]([^'"]+)['"]\s*\)/g

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name)) continue
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (EXTS.includes(path.extname(e.name)) && !/\.(test|spec)\./.test(e.name)) out.push(path.normalize(p))
  }
  return out
}

/**
 * @param {{ src: string, packagesDir?: string }} opts  src = the app's src folder
 * @returns {{ all: string[], reachable: Set<string>, dead: string[], entries: string[], shellRefs: number }}
 *   paths in `dead` are relative to src, with forward slashes, sorted.
 */
export function findUnreachable({ src, packagesDir = null, bundle = false }) {
  const all = walk(src)
  const files = new Set(all)
  // Windows / macOS resolve imports case-insensitively (an import of AppToPlatformRedirect finds
  // AppToplatformRedirect.jsx), so match paths without regard to case.
  const byLower = new Map(all.map((f) => [f.toLowerCase(), f]))
  const texts = new Map(all.map((f) => [f, fs.readFileSync(f, 'utf8')]))

  const resolve = (from, spec) => {
    let base
    if (spec.startsWith('.')) base = path.resolve(path.dirname(from), spec)
    else if (spec.startsWith('@shell/')) base = path.join(src, spec.slice('@shell/'.length))
    else if (spec.startsWith('@/')) base = path.join(src, spec.slice(2))
    else return null
    const tries = [base, ...EXTS.map((x) => base + x), ...EXTS.map((x) => path.join(base, 'index' + x))]
    for (const t of tries.map((x) => path.normalize(x))) {
      if (files.has(t)) return t
      const ci = byLower.get(t.toLowerCase())
      if (ci) return ci
    }
    return null
  }

  const entries = ['main.jsx', 'main.js', 'main.tsx', 'App.jsx'].map((f) => path.normalize(path.join(src, f))).filter((f) => files.has(f))
  const reachable = new Set(entries)

  let shellRefs = 0
  if (packagesDir) {
    for (const f of walk(packagesDir)) {
      const s = fs.readFileSync(f, 'utf8')
      if (!s.includes('@shell/')) continue
      for (const m of s.matchAll(/['"]@shell\/([^'"]+)['"]/g)) {
        const r = resolve(path.join(src, 'x.js'), './' + m[1])
        if (r && !reachable.has(r)) { reachable.add(r); shellRefs++ }
      }
    }
  }

  const rendered = new Set()
  const scanRendered = (s) => {
    for (const m of s.matchAll(/<([A-Z][A-Za-z0-9_]*)[\s/>]/g)) rendered.add(m[1])
    for (const m of s.matchAll(/(?:Component|component|element)\s*[:=]\s*\{?\s*([A-Z][A-Za-z0-9_]*)\b/g)) rendered.add(m[1])
  }
  let changed = true
  while (changed) {
    changed = false
    for (const f of reachable) scanRendered(texts.get(f) ?? '')
    const queue = [...reachable]
    while (queue.length) {
      const f = queue.pop()
      const s = texts.get(f) ?? ''
      const lazyTargets = new Map()
      for (const m of s.matchAll(LAZY_RE)) lazyTargets.set(m[2], m[1])
      for (const m of s.matchAll(IMPORT_RE)) {
        const spec = m[1] || m[2] || m[3]
        // bundle mode: what the bundler compiles (every lazy entry, rendered or not).
        if (!bundle && m[2] && lazyTargets.has(spec) && !rendered.has(lazyTargets.get(spec))) continue
        const r = resolve(f, spec)
        if (r && !reachable.has(r)) { reachable.add(r); queue.push(r); changed = true; scanRendered(texts.get(r) ?? '') }
      }
    }
  }

  const rel = (f) => path.relative(src, f).replace(/\\/g, '/')
  const dead = all.filter((f) => !reachable.has(f)).map(rel).sort()

  // Lazy entries in reachable files whose component no reachable file renders.
  const unusedLazy = []
  for (const f of reachable) {
    for (const m of (texts.get(f) ?? '').matchAll(LAZY_RE)) {
      if (!rendered.has(m[1])) unusedLazy.push({ file: rel(f), name: m[1], target: m[2] })
    }
  }
  return { all, reachable, dead, entries: entries.map(rel), shellRefs, unusedLazy }
}

/** Files under `dir` (relative to the repo) with uncommitted edits or untracked, as repo-relative paths. */
function dirtyFiles(dir) {
  try {
    return new Set(execSync(`git status --porcelain -- "${dir}"`, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 })
      .split('\n').filter(Boolean).map((l) => l.slice(3).replace(/^"|"$/g, '')))
  } catch {
    return new Set()
  }
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isCli) {
  const args = process.argv.slice(2)
  const app = args.find((a) => !a.startsWith('--')) || 'simulator'
  const underIdx = args.indexOf('--under')
  const under = underIdx >= 0 ? args[underIdx + 1] : null
  const appDir = `apps/${app}/src`
  const { all, reachable, dead, entries, shellRefs, unusedLazy } = findUnreachable({ src: path.join(ROOT, appDir), packagesDir: path.join(ROOT, 'packages'), bundle: args.includes('--bundle') })
  if (args.includes('--unused-lazy')) {
    // Lazy page entries no reachable file renders (the bundler still compiles them).
    console.log(unusedLazy.map((u) => `${u.file}\t${u.name}\t${u.target}`).join('\n'))
    console.log(`\n${app}: ${unusedLazy.length} unused lazy entries.`)
    process.exit(0)
  }
  let shown = dead.filter((f) => !under || f.startsWith(under))
  let skipped = []
  if (args.includes('--skip-dirty')) {
    const dirty = dirtyFiles(appDir)
    skipped = shown.filter((f) => dirty.has(`${appDir}/${f}`))
    shown = shown.filter((f) => !dirty.has(`${appDir}/${f}`))
  }
  if (args.includes('--list') || under) console.log(shown.join('\n'))
  else {
    const byDir = {}
    for (const f of shown) { const d = f.split('/').slice(0, 2).join('/'); byDir[d] = (byDir[d] || 0) + 1 }
    for (const [d, n] of Object.entries(byDir).sort((a, b) => b[1] - a[1])) console.log(String(n).padStart(5), d)
  }
  if (skipped.length) console.log(`\nSkipped (uncommitted edits): ${skipped.length}\n${skipped.map((f) => '  ' + f).join('\n')}`)
  console.log(`\n${app}: ${all.length} source files, ${reachable.size} reachable from ${entries.join(', ')} (+ ${shellRefs} @shell targets from packages), ${dead.length} unreachable${under ? ` (${shown.length} under ${under})` : ''}.`)
  if (args.includes('--fail') && dead.length) {
    console.error(`\n✗ ${dead.length} unreachable file(s) in apps/${app}/src. Delete them, or render them from a route (CLAUDE.md, v1349).`)
    process.exit(1)
  }
}
