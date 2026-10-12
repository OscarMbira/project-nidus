#!/usr/bin/env node
/**
 * v1240 — Shared package drift check.
 *
 * Compares the app-local shadow copies of @nidus/ui and @nidus/shared/{utils,hooks,context,constants}
 * in apps/platform and apps/simulator with packages/*, and lists any vite.config.js that still aliases
 * those imports to app-local folders.
 *
 *   node scripts/check-shared-drift.mjs            report mode (always exits 0)
 *   node scripts/check-shared-drift.mjs --enforce  exits 1 if any alias override or shadow file remains
 *   node scripts/check-shared-drift.mjs --json     machine-readable report
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SOURCE_EXT = /\.(jsx?|tsx?|mjs|cjs)$/
const TEST_FILE = /\.test\.[jt]sx?$|\.spec\.[jt]sx?$/

function walk(dir, { includeTests = false } = {}) {
  if (!fs.existsSync(dir)) return []
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue
      if (!includeTests && entry.name === '__tests__') continue
      out.push(...walk(full, { includeTests }))
    } else if (SOURCE_EXT.test(entry.name) && (includeTests || !TEST_FILE.test(entry.name))) {
      out.push(full)
    }
  }
  return out
}

function rel(base, files) {
  return files.map((f) => path.relative(base, f).split(path.sep).join('/'))
}

function read(p) {
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n') : null
}

const SHIM_LINE = /^\s*export\s+(\*|\{[^}]*\})\s+from\s+['"][^'"]*packages\/[^'"]+['"];?\s*$/

/** True when an app copy only re-exports the package file (the package is the real source). */
function isPackageShim(text) {
  const body = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').trim()
  return body.length > 0 && body.split('\n').every((line) => !line.trim() || SHIM_LINE.test(line))
}

/** Classify every app-side file of one group against the package copy. */
export function compareGroup({ pkgDir, appDirs }) {
  const names = new Set()
  for (const d of appDirs) for (const f of rel(d, walk(d))) names.add(f)
  const result = { identical: [], shim: [], stalePackage: [], divergent: [], appOnly: [] }
  for (const name of [...names].sort()) {
    const pkg = read(path.join(pkgDir, name))
    const copies = appDirs.map((d) => read(path.join(d, name))).filter((c) => c !== null)
    if (pkg === null) result.appOnly.push(name)
    else if (copies.every((c) => c === pkg)) result.identical.push(name)
    else if (copies.every(isPackageShim)) result.shim.push(name)
    else if (copies.every((c) => c === copies[0])) result.stalePackage.push(name)
    else result.divergent.push(name)
  }
  return result
}

const ALIAS_RE = /['"](@nidus\/(?:ui|shared\/(?:utils|hooks|context|constants)))['"]\s*:/g

/** Alias overrides that point shared imports at app-local copies. */
export function findAliasOverrides(configPaths) {
  const found = []
  for (const file of configPaths) {
    const text = read(file)
    if (!text) continue
    for (const m of text.matchAll(ALIAS_RE)) found.push({ file, alias: m[1] })
  }
  return found
}

/** Every source or test file still present in the shadow folders. */
export function listShadowFiles(dirs) {
  return dirs.flatMap((d) => walk(d, { includeTests: true }))
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const APPS = ['apps/platform', 'apps/simulator']
export const GROUPS = {
  ui: { pkg: 'packages/ui/src', app: 'src/components/ui' },
  utils: { pkg: 'packages/shared/src/utils', app: 'src/utils' },
  hooks: { pkg: 'packages/shared/src/hooks', app: 'src/hooks' },
  context: { pkg: 'packages/shared/src/context', app: 'src/context' },
  constants: { pkg: 'packages/shared/src/constants', app: 'src/constants' },
}

function viteConfigs() {
  const mods = path.join(ROOT, 'packages/modules')
  const moduleConfigs = fs.existsSync(mods)
    ? fs.readdirSync(mods).map((m) => path.join(mods, m, 'vite.config.js'))
    : []
  return [...APPS.map((a) => path.join(ROOT, a, 'vite.config.js')), ...moduleConfigs].filter((f) => fs.existsSync(f))
}

function main(argv) {
  const enforce = argv.includes('--enforce')
  const asJson = argv.includes('--json')
  const groups = {}
  for (const [name, g] of Object.entries(GROUPS)) {
    groups[name] = compareGroup({
      pkgDir: path.join(ROOT, g.pkg),
      appDirs: APPS.map((a) => path.join(ROOT, a, g.app)),
    })
  }
  const aliases = findAliasOverrides(viteConfigs()).map((a) => ({ ...a, file: path.relative(ROOT, a.file) }))
  const shadow = rel(
    ROOT,
    listShadowFiles(Object.values(GROUPS).flatMap((g) => APPS.map((a) => path.join(ROOT, a, g.app))))
  )

  if (asJson) {
    console.log(JSON.stringify({ groups, aliases, shadowFileCount: shadow.length }, null, 2))
  } else {
    console.log('Shared package drift (v1240)\n')
    console.log('group      identical  shim  stale-pkg  divergent  app-only')
    for (const [name, r] of Object.entries(groups)) {
      console.log(
        `${name.padEnd(10)} ${String(r.identical.length).padStart(9)}  ${String(r.shim.length).padStart(4)}  ${String(r.stalePackage.length).padStart(9)}  ${String(r.divergent.length).padStart(9)}  ${String(r.appOnly.length).padStart(8)}`
      )
    }
    for (const [name, r] of Object.entries(groups)) {
      if (r.divergent.length) console.log(`\n${name} divergent: ${r.divergent.join(', ')}`)
      if (r.appOnly.length) console.log(`${name} app-only: ${r.appOnly.join(', ')}`)
    }
    console.log(`\nAlias overrides remaining: ${aliases.length} (in ${new Set(aliases.map((a) => a.file)).size} configs)`)
    console.log(`Files left in shadow folders: ${shadow.length}`)
  }

  if (enforce && (aliases.length || shadow.length)) {
    console.error('\nFAIL: @nidus/* must resolve to packages/* only (CLAUDE.md rule 34.3, v1240).')
    return 1
  }
  return 0
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv.slice(2)))
}
