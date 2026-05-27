#!/usr/bin/env node
/**
 * Export static menu configs to CSV for Phase 0 audit (text parse — no JSX import).
 * Run: node scripts/export-static-menu-audit.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const outPath = path.join(root, 'Documentation', 'menu_audit_static.csv')

function parseStaticConfigFile(filePath, source) {
  const content = fs.readFileSync(filePath, 'utf8')
  const rows = []
  const blockRe = /\{\s*id:\s*['"]([^'"]+)['"][\s\S]*?label:\s*['"]([^'"]+)['"][\s\S]*?(?:path:\s*(['"][^'"]*['"]|null))?[\s\S]*?\}/g
  let m
  while ((m = blockRe.exec(content)) !== null) {
    const pathRaw = m[3]
    const routePath =
      pathRaw && pathRaw !== 'null' ? pathRaw.replace(/^['"]|['"]$/g, '') : ''
    rows.push({
      source,
      menu_code: m[1],
      menu_label: m[2],
      route_path: routePath,
      parent_label: '',
      sort_order: '',
    })
  }
  return rows
}

function toCsv(rows) {
  const headers = ['source', 'menu_code', 'menu_label', 'route_path', 'parent_label', 'sort_order']
  const escape = (v) => {
    const s = String(v ?? '')
    return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\n')
}

async function main() {
  const registryMod = await import(pathToFileURL(path.join(root, 'src', 'config', 'menuRegistry.js')).href)

  const rows = [
    ...parseStaticConfigFile(path.join(root, 'src', 'config', 'pmoMenuConfig.js'), 'pmoMenuConfig'),
    ...parseStaticConfigFile(path.join(root, 'src', 'config', 'pmDashboardMenuConfig.js'), 'pmDashboardMenuConfig'),
    ...registryMod.MENU_REGISTRY.map((e) => ({
      source: 'menuRegistry',
      menu_code: e.menu_code,
      menu_label: e.menu_label,
      route_path: e.route_path || '',
      parent_label: e.parent_code || '',
      sort_order: e.sort_order,
    })),
  ]

  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, toCsv(rows), 'utf8')
  console.log(`Wrote ${rows.length} rows to ${outPath}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
