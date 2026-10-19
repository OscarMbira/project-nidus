#!/usr/bin/env node
/**
 * v1239 Slice 6.4 — generate the Project Planner's table allow-list (D6).
 *
 * Walks the Planner app's import graph from apps/planner/src/main.jsx (static imports, re-exports
 * and dynamic import()), resolving relative paths and @nidus/<pkg>/<path> to packages/<pkg>/src,
 * and collects every `.from('<table>')` it can reach. Those are the public tables a planner
 * session reads or writes directly; every other RLS-enabled public table gets the restrictive
 * "planner wall" policy (SQL v1251). RPCs are not listed: they are SECURITY DEFINER functions
 * that do their own checks.
 *
 * Usage:
 *   node scripts/generate-planner-table-allowlist.mjs           # print the list
 *   node scripts/generate-planner-table-allowlist.mjs --write   # update the JSON + the SQL block
 *   node scripts/generate-planner-table-allowlist.mjs --check   # exit 1 if either is stale (CI)
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const JSON_PATH = path.join(repo, 'packages/planning/planner-table-allowlist.json')
export const SQL_PATH = path.join(repo, 'SQL/v1251_planner_table_wall.sql')
const ENTRY = path.join(repo, 'apps/planner/src/main.jsx')
const EXTS = ['', '.js', '.jsx', '.mjs', '/index.js', '/index.jsx']

// Tables the shell needs that are reached through Supabase helpers rather than `.from()`:
// the shared public header/footer reads these through the REST endpoint (packages/shared/src/site).
// v1272 D16: Ask Nidus answers Planner questions about schedule, resources and dependencies through
// security-invoker views (public.ai_v_*) called via RPC, so their base tables are listed here too.
export const ALWAYS = [
  'site_products', 'site_content', 'site_nav_links', 'site_pages', // shared public header/footer (REST)
  'project_statuses', 'resource_assignments', 'task_assignments', // Ask Nidus planner catalogue (v1272)
  'ai_docs_index', // Ask Nidus help-docs search tool, run with the user's session (v1272)
]

function resolveFile(base) {
  for (const ext of EXTS) {
    const f = base + ext
    if (fs.existsSync(f) && fs.statSync(f).isFile()) return f
  }
  return null
}

export function resolveSpecifier(spec, fromFile) {
  if (spec.startsWith('.')) return resolveFile(path.resolve(path.dirname(fromFile), spec))
  const m = spec.match(/^@nidus\/([^/]+)(?:\/(.*))?$/)
  if (!m) return null // third-party
  const pkgDir = path.join(repo, 'packages', m[1])
  if (!fs.existsSync(pkgDir)) return null
  return resolveFile(m[2] ? path.join(pkgDir, 'src', m[2]) : path.join(pkgDir, 'src', 'index'))
}

const IMPORT_RE = /(?:import|export)\s+(?:[^'"]*?\sfrom\s+)?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g
const FROM_RE = /\.from\(\s*['"]([a-z_][a-z0-9_]*)['"]\s*\)/g

export function collect(entry = ENTRY) {
  const seen = new Set()
  const tables = new Set(ALWAYS)
  const stack = [entry]
  while (stack.length) {
    const file = stack.pop()
    if (!file || seen.has(file) || /__tests__|\.test\./.test(file)) continue
    seen.add(file)
    const src = fs.readFileSync(file, 'utf8')
    for (const m of src.matchAll(FROM_RE)) tables.add(m[1])
    for (const m of src.matchAll(IMPORT_RE)) {
      const next = resolveSpecifier(m[1] || m[2], file)
      if (next) stack.push(next)
    }
  }
  // Supabase Storage buckets also use .from(); they are not tables.
  for (const notTable of ['avatars', 'documents', 'attachments', 'signatures', 'project-documents']) tables.delete(notTable)
  return { tables: [...tables].sort(), files: seen.size }
}

const BEGIN = '-- BEGIN GENERATED planner_table_allowlist (scripts/generate-planner-table-allowlist.mjs --write)'
const END = '-- END GENERATED planner_table_allowlist'

export function sqlBlock(tables) {
  return [BEGIN, 'INSERT INTO public.planner_table_allowlist (table_name) VALUES', tables.map((t) => `  ('${t}')`).join(',\n'), 'ON CONFLICT (table_name) DO NOTHING;', `DELETE FROM public.planner_table_allowlist WHERE table_name NOT IN (${tables.map((t) => `'${t}'`).join(', ')});`, END].join('\n')
}

export function replaceBlock(sql, block) {
  const a = sql.indexOf(BEGIN)
  const b = sql.indexOf(END)
  if (a < 0 || b < 0) throw new Error(`${SQL_PATH} is missing the generated block markers`)
  return sql.slice(0, a) + block + sql.slice(b + END.length)
}

function main() {
  const mode = process.argv[2]
  const { tables, files } = collect()
  const json = JSON.stringify({ generated_by: 'scripts/generate-planner-table-allowlist.mjs', tables }, null, 2) + '\n'
  if (!mode) { console.log(tables.join('\n')); return }
  const sql = fs.readFileSync(SQL_PATH, 'utf8')
  const nextSql = replaceBlock(sql, sqlBlock(tables))
  if (mode === '--write') {
    fs.writeFileSync(JSON_PATH, json)
    fs.writeFileSync(SQL_PATH, nextSql)
    console.log(`planner allow-list: ${tables.length} tables from ${files} files → JSON + SQL updated`)
  } else if (mode === '--check') {
    const stale = []
    if (!fs.existsSync(JSON_PATH) || fs.readFileSync(JSON_PATH, 'utf8') !== json) stale.push(path.relative(repo, JSON_PATH))
    if (sql !== nextSql) stale.push(path.relative(repo, SQL_PATH))
    if (stale.length) {
      console.error(`Planner table allow-list is stale (${stale.join(', ')}). Run: node scripts/generate-planner-table-allowlist.mjs --write, then re-run the SQL.`)
      process.exit(1)
    }
    console.log(`planner allow-list up to date (${tables.length} tables)`)
  } else {
    console.log(tables.join('\n'))
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
