#!/usr/bin/env node
/* global process, console */
/**
 * v1341 (R8) — Simulator placements must point at routes that are mounted.
 *
 * Usage:
 *   node scripts/check-sim-placement-routes.mjs <placements.csv>
 *
 * <placements.csv> is the export of result set E in SQL/v1452_consolidated_menu_audit_query.sql
 * (columns: placement_key,menu_code,route_path). The script reads every Route path in the
 * Simulator app's route files and module routes, and lists the placed sim_ items whose route is
 * not mounted (a catch-all such as "*" never counts). Exit code 1 when any are found, so CI or a
 * pre-release check can stop on it.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir)) {
    const p = path.join(dir, entry)
    const st = fs.statSync(p)
    if (st.isDirectory()) {
      if (!/node_modules|__tests__/.test(entry)) walk(p, out)
    } else if (/\.jsx?$/.test(entry)) {
      out.push(p)
    }
  }
  return out
}

/** Route files of the Simulator app: app routes, module routes, sim- domain modules. */
export function simulatorRouteFiles(root = ROOT) {
  const files = [
    ...walk(path.join(root, 'apps/simulator/src/routes')),
    ...walk(path.join(root, 'apps/simulator/src/modules')).filter((f) => /routes/i.test(f)),
  ]
  const modulesDir = path.join(root, 'packages/modules')
  if (fs.existsSync(modulesDir)) {
    for (const d of fs.readdirSync(modulesDir)) {
      const f = path.join(modulesDir, d, 'src/routes.jsx')
      if (d.startsWith('sim') && fs.existsSync(f)) files.push(f)
    }
  }
  return files
}

/** Every `path="…"` in the given sources, as regular expressions (catch-alls skipped). */
export function mountedRoutePatterns(sources = []) {
  const esc = (t) => t.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
  const out = []
  for (const src of sources) {
    for (const m of src.matchAll(/path[=:]\s*["'`]([^"'`]+)["'`]/g)) {
      const r = m[1].replace(/^\/+/, '')
      if (!r || r === '*' || /^:[A-Za-z]+\??$/.test(r)) continue
      // A trailing "/*" (nested routes) also matches its own base path.
      const wildcard = r.endsWith('/*')
      const base = wildcard ? r.slice(0, -2) : r
      const parts = base.split('/').map((seg) => (seg === '*' ? '.*' : seg.startsWith(':') ? '[^/]+' : esc(seg)))
      out.push({ route: r, re: new RegExp(`^${parts.join('/')}${wildcard ? '(/.*)?' : ''}$`) })
    }
  }
  return out
}

/** Placed items whose route matches no mounted pattern. */
export function findUnmountedPlacements(rows = [], patterns = []) {
  const bad = []
  for (const row of rows) {
    const route = String(row.route_path || '').trim()
    if (!route || route === 'null') continue
    const p = route.split('?')[0].replace(/^\/+/, '')
    if (!patterns.some((z) => z.re.test(p))) bad.push(row)
  }
  return bad
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean)
  const head = lines.shift().split(',').map((h) => h.trim().replace(/^"|"$/g, ''))
  return lines.map((line) => {
    const cells = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''))
    return Object.fromEntries(head.map((h, i) => [h, cells[i]]))
  })
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const csv = process.argv[2]
  if (!csv || !fs.existsSync(csv)) {
    console.error('Usage: node scripts/check-sim-placement-routes.mjs <placements.csv> (export of v1452 result set E)')
    process.exit(2)
  }
  const rows = parseCsv(fs.readFileSync(csv, 'utf8')).filter((r) => String(r.menu_code || '').startsWith('sim_'))
  const patterns = mountedRoutePatterns(simulatorRouteFiles().map((f) => fs.readFileSync(f, 'utf8')))
  const bad = findUnmountedPlacements(rows, patterns)
  console.log(`${rows.length} Simulator placements checked, ${bad.length} on routes that are not mounted.`)
  for (const b of bad) console.log(`  ${b.placement_key}\t${b.menu_code}\t${b.route_path}`)
  process.exit(bad.length > 0 ? 1 : 0)
}
