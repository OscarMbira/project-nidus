import { test } from 'node:test'
import assert from 'node:assert/strict'
import { analyse, countNotAdopted, extractSeededKeys, extractUsedKeys } from '../check-field-help.mjs'

test('finds literal and list-built help keys', () => {
  const src = `
    <FieldLabelWithHelp helpKey="public.risks.title">Title</FieldLabelWithHelp>
    const KEYS = ['name', 'status'].map((name) => \`public.stakeholders.\${name}\`)`
  assert.deepEqual([...extractUsedKeys(src)].sort(), ['public.risks.title', 'public.stakeholders.name', 'public.stakeholders.status'])
})

test('reads seeded help and aliases from SQL', () => {
  const sql = `INSERT INTO public.field_help (help_key, title) VALUES
    ('public.stakeholders.name', 'Name'), ('public.stakeholders.status', 'Status') ON CONFLICT (help_key) DO NOTHING;
    INSERT INTO public.field_help_aliases (alias_key, help_key) VALUES
    ('sim.reg.name', 'public.stakeholders.name') ON CONFLICT (alias_key) DO NOTHING;`
  const { help, aliases } = extractSeededKeys(sql)
  assert.deepEqual([...help].sort(), ['public.stakeholders.name', 'public.stakeholders.status'])
  assert.equal(aliases.get('sim.reg.name'), 'public.stakeholders.name')
})

test('counts raw labels only in files that render fields', () => {
  assert.equal(countNotAdopted('<label>A</label><input />'), 1)
  assert.equal(countNotAdopted('<label>A</label>'), 0)
})

test('reports keys used without help, resolving Simulator aliases', () => {
  const files = [{ file: 'a.jsx', source: '<FieldLabelWithHelp helpKey="sim.reg.name" /><FieldLabelWithHelp helpKey="public.x.missing" />' }]
  const sql = `INSERT INTO public.field_help (help_key) VALUES ('public.stakeholders.name', 'x') ON CONFLICT DO NOTHING;
    INSERT INTO public.field_help_aliases (alias_key, help_key) VALUES ('sim.reg.name', 'public.stakeholders.name') ON CONFLICT DO NOTHING;`
  const r = analyse({ files, sqlTexts: [sql], moduleKeysFilter: (k) => k.startsWith('sim.reg.') })
  assert.deepEqual(r.missing, ['public.x.missing'])
  assert.deepEqual(r.moduleMissing, [])
})

test('parses register fields from both SQL styles and measures coverage (slice 2)', async () => {
  const { extractRegisterFields, registerCoverage } = await import('../check-field-help.mjs')
  const styleA = `INSERT INTO public.local_register_fields (id, register_id, field_key, field_label, field_type)
SELECT gen_random_uuid(), v.register_id::uuid, v.field_key FROM (VALUES
  ('00000000-0000-4000-9001-000000000007', 'owner', 'Owner', 'user_picker'),
  ('00000000-0000-4000-9001-000000000007', 'site_code', 'Site Code', 'text')
) AS v;
`
  const styleB = `INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type)
SELECT '00000000-0000-4000-9002-000000000001'::uuid, v.field_key FROM (VALUES
  ('notes', 'Notes', 'long_text')
) AS v;
`
  const fields = [...extractRegisterFields(styleA), ...extractRegisterFields(styleB)]
  assert.equal(fields.length, 3)
  const rc = registerCoverage(fields, new Set(['register:*:owner', 'register:*:notes']))
  assert.equal(rc.total, 3)
  assert.equal(rc.covered, 2)
  assert.equal(rc.percent, 66.7)
  // The uncovered field is listed so CI can name it and fail (slice 2 tightening).
  assert.equal(rc.uncovered.length, 1)
})

test('the live SQL folder has help for every register field', async () => {
  const fs = await import('node:fs')
  const path = await import('node:path')
  const { extractRegisterFields, extractSeededKeys, registerCoverage } = await import('../check-field-help.mjs')
  const dir = path.resolve(import.meta.dirname, '..', '..', 'SQL')
  const texts = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).map((f) => fs.readFileSync(path.join(dir, f), 'utf8'))
  const help = new Set(texts.filter((t) => t.includes('field_help')).flatMap((t) => [...extractSeededKeys(t).help]))
  const rc = registerCoverage(texts.flatMap(extractRegisterFields), help)
  assert.deepEqual(rc.uncovered.map((f) => `${f.registerId} ${f.fieldKey}`), [])
})

test('register coverage counts only help under the field’s own register key or the common key (2026-11-22)', async () => {
  const { registerCoverageByKey } = await import('../check-field-help.mjs')
  const fields = new Map([['ict_technical_debt', new Set(['debt_reference', 'owner'])], ['fin_core_banking_environments', new Set(['host_name'])]])
  // Help written under the menu category code does not count for the register:
  const wrong = new Set(['register:ict_cat_technical_debt:debt_reference', 'register:*:owner'])
  const r1 = registerCoverageByKey(fields, wrong, new Set(['ict_technical_debt']))
  assert.deepEqual(r1.uncovered, [{ registerKey: 'ict_technical_debt', fieldKey: 'debt_reference' }])
  assert.deepEqual(r1.strayRegisters, ['ict_cat_technical_debt'])
  // Under the real key it does; retired registers are skipped.
  const right = new Set(['register:ict_technical_debt:debt_reference', 'register:*:owner'])
  assert.equal(registerCoverageByKey(fields, right, new Set(['ict_technical_debt'])).uncovered.length, 0)
})
