import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildRowsSql, sqlText } from '../field-help-content/build-sql.mjs'

test('escapes quotes and line breaks for SQL', () => {
  assert.equal(sqlText("bank's"), "'bank''s'")
  assert.equal(sqlText('a\nb'), String.raw`E'a\nb'`)
  assert.equal(sqlText(null), 'NULL')
})

test('builds rows and rejects bad content', () => {
  const ok = buildRowsSql([['register:*:owner', 'Owner', 'Who owns it.', ['Head of Finance']]], 'm')
  assert.match(ok, /'register:\*:owner', 'Owner', 'Who owns it\.', '- Head of Finance', NULL, NULL, 'm'/)
  assert.throws(() => buildRowsSql([['register:*:a', 'A', 'Goes into the system.', ['x']]], 'm'), /into/)
  assert.throws(() => buildRowsSql([['register:*:a', 'A', 'P', ['x']], ['register:*:a', 'A', 'P', ['x']]], 'm'), /Duplicate/)
  assert.throws(() => buildRowsSql([['register:*:a', 'A', 'P', []]], 'm'), /example/)
  assert.throws(() => buildRowsSql([['bad key', 'A', 'P', ['x']]], 'm'), /Bad help key/)
})

test('builds Simulator alias rows and rejects bad aliases', async () => {
  const { buildAliasesSql } = await import('../field-help-content/build-sql.mjs')
  assert.equal(buildAliasesSql([]), '')
  const sql = buildAliasesSql([['sim.practice_projects.status_id', 'public.projects.project_status_id']])
  assert.match(sql, /\('sim\.practice_projects\.status_id', 'public\.projects\.project_status_id'\)\nON CONFLICT \(alias_key\)/)
  assert.throws(() => buildAliasesSql([['public.x.y', 'public.x.y']]), /Bad alias/)
})

test('register help written with a menu category code is expanded to the real register keys (2026-11-22)', async () => {
  const { expandRegisterRows } = await import('../field-help-content/build-sql.mjs')
  const expand = (k) => (k === 'register:ict_cat_debt:debt_reference' ? ['register:ict_technical_debt:debt_reference'] : [k])
  const rows = expandRegisterRows([
    ['register:ict_cat_debt:debt_reference', 'Debt reference', 'A code for the debt item.', ['TD-10']],
    ['register:*:owner', 'Owner', 'Who owns it.', ['Head of IT']],
  ], expand)
  assert.deepEqual(rows.map((r) => r[0]), ['register:ict_technical_debt:debt_reference', 'register:*:owner'])
})
