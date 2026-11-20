// v1345 slice 3: shared components that build help keys from a schema variable
// (`${helpSchema}.project_mandates.${column}`) are invisible to check-field-help's static scan.
// This test reads their column lists and checks every Platform key is seeded and every
// Simulator key has an alias.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { extractSeededKeys } from '../check-field-help.mjs'

const ROOT = path.resolve(import.meta.dirname, '..', '..')
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8')

function seeded() {
  const dir = path.join(ROOT, 'SQL')
  const help = new Set()
  const aliases = new Map()
  for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.sql'))) {
    const t = fs.readFileSync(path.join(dir, f), 'utf8')
    if (!t.includes('field_help')) continue
    const r = extractSeededKeys(t)
    r.help.forEach((k) => help.add(k))
    r.aliases.forEach((v, k) => aliases.set(k, v))
  }
  return { help, aliases }
}

function columns(source, constName) {
  const m = source.match(new RegExp(`const ${constName} = \\[([^\\]]*)\\]`))
  assert.ok(m, `${constName} not found`)
  return [...m[1].matchAll(/'([a-z_]+)'/g)].map((x) => x[1])
}

test('mandate help keys (MandateFieldTabs) are seeded for Platform and aliased for Simulator', () => {
  const src = read('packages/ui/src/MandateFieldTabs.jsx')
  const keys = [
    ...columns(src, 'MANDATE_HELP_COLUMNS').map((c) => `project_mandates.${c}`),
    ...columns(src, 'DELIVERABLE_HELP_COLUMNS').map((c) => `mandate_deliverables.${c}`),
    ...columns(src, 'DEPENDENCY_HELP_COLUMNS').map((c) => `mandate_dependencies.${c}`),
  ]
  const { help, aliases } = seeded()
  assert.deepEqual(keys.filter((k) => !help.has(`public.${k}`)), [])
  assert.deepEqual(keys.filter((k) => aliases.get(`sim.${k}`) !== `public.${k}`), [])
})
