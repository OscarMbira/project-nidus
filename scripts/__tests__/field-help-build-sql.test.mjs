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
