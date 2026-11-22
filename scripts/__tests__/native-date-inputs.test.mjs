// v1351 — codemod (replace-native-date-inputs.mjs) and guard (check-native-date-inputs.mjs) for rule 79.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { transform, addImport } from '../replace-native-date-inputs.mjs'
import { findPickers } from '../check-native-date-inputs.mjs'

test('rewrites a date input, keeping every other prop and adding the import', () => {
  const src = [
    "import { useState } from 'react'",
    '',
    'export default function F({ form, set }) {',
    '  return <input type="date" className={inp} value={form.due} onChange={(e) => set(e.target.value)} required />',
    '}',
  ].join('\n')
  const { code, changed } = transform(src)
  assert.equal(changed, 1)
  assert.match(code, /<RegionalDateInput eventStyle className=\{inp\} value=\{form\.due\} onChange=\{\(e\) => set\(e\.target\.value\)\} required \/>/)
  assert.match(code, /import \{ useState \} from 'react'\nimport RegionalDateInput from '@nidus\/ui\/RegionalDateInput'/)
  assert.doesNotMatch(code, /type="date"/)
})

test('a date-and-time input gets withTime; multi-line tags keep their layout', () => {
  const src = "import x from 'y'\nconst a = (\n  <input\n    type='datetime-local'\n    value={v}\n    onChange={onC}\n  />\n)\n"
  const { code } = transform(src)
  assert.match(code, /<RegionalDateInput eventStyle withTime\n    value=\{v\}\n    onChange=\{onC\}\n  \/>/)
})

test('leaves other inputs, comments and risky tags alone, and reports the risky ones', () => {
  const src = [
    "import x from 'y'",
    '// <input type="date"> in a comment',
    '<input type="text" value={a} />',
    '<input type="date" ref={r} value={b} />',
    '<input {...common} type="date" />',
    "<input type={isDate ? 'date' : 'text'} />",
  ].join('\n')
  const { code, changed, report } = transform(src)
  assert.equal(changed, 0)
  assert.equal(code, src)
  assert.deepEqual(report.map((r) => r.line), [4, 5, 6])
})

test('does not add a second import', () => {
  const src = "import RegionalDateInput from '@nidus/ui/RegionalDateInput'\n<input type=\"date\" value={a} />"
  assert.equal(transform(src).code.match(/import RegionalDateInput/g).length, 1)
  assert.match(addImport('const a = 1'), /^import RegionalDateInput/)
})

test('guard finds pickers, including after arrow-function props, and skips comments', () => {
  const src = [
    '<input onChange={(e) => s(e.target.value)} type="date" />',
    ' * <input type="date"> documented',
    '<input type="datetime-local" value={x} />',
    "<input type={d ? 'date' : 'text'} />",
    '<input type="text" />',
  ].join('\n')
  assert.deepEqual(findPickers(src), [1, 3, 4])
})
