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
