import { describe, it, expect } from 'vitest'
import { parseTableValue, joinTableValue, tableColumns, tableValueLines } from '../registerTableField'
import { buildRegisterDocumentModel, fieldToItem } from '../registerDocumentModel'
import { registerFieldExportValue } from '../registerCustomFields'

const VERSION_FIELD = {
  field_key: 'version_history', field_label: 'Version History', field_type: 'table', field_group: 'Document Control',
  dropdown_options: [
    { value: 'version', label: 'Version' }, { value: 'date', label: 'Date', type: 'date' },
    { value: 'author', label: 'Author' }, { value: 'change', label: 'Change' },
  ],
}

describe('registerTableField', () => {
  it('reads columns with their types', () => {
    expect(tableColumns(VERSION_FIELD).map((c) => `${c.key}:${c.type}`)).toEqual(['version:text', 'date:date', 'author:text', 'change:text'])
  })

  it('round-trips rows through the stored text and drops empty rows', () => {
    const text = joinTableValue([['1.0', '2026-10-01', 'Ama', 'First draft'], ['', '', '', ''], ['1.1', '', '', 'Tabs\tremoved']])
    expect(text).toBe('1.0\t2026-10-01\tAma\tFirst draft\n1.1\t\t\tTabs removed')
    expect(parseTableValue(text, 4)).toEqual([['1.0', '2026-10-01', 'Ama', 'First draft'], ['1.1', '', '', 'Tabs removed']])
  })

  it('reads older "A – B" lines, padding and merging to the column count', () => {
    expect(parseTableValue('GL – General ledger', 2)).toEqual([['GL', 'General ledger']])
    expect(parseTableValue('A – B – C', 2)).toEqual([['A', 'B – C']])
    expect(parseTableValue('Only', 3)).toEqual([['Only', '', '']])
  })

  it('exports readable lines', () => {
    expect(tableValueLines('1.0\t2026-10-01\t\tDraft', VERSION_FIELD)).toEqual(['1.0 – 2026-10-01 – Draft'])
    expect(registerFieldExportValue('T\tDef', { field_type: 'table', dropdown_options: [{ value: 't' }, { value: 'd' }] })).toBe('T – Def')
  })

  it('becomes a table item in the document, and fills the version history columns', () => {
    const item = fieldToItem({ ...VERSION_FIELD, field_key: 'x' }, '1.0\t2026-10-01\tAma\tDraft', null)
    expect(item).toMatchObject({ kind: 'table', headers: ['Version', 'Date', 'Author', 'Change'] })
    expect(item.rows[0][0]).toBe('1.0')

    const model = buildRegisterDocumentModel({
      register: { register_key: 'r', label: 'R', fields: [VERSION_FIELD] },
      record: { id: '1', title: 'Doc', field_values: { version_history: '1.0\t\tAma\tDraft' } },
    })
    expect(model.versionHistory).toEqual([{ version: '1.0', date: '', author: 'Ama', change: 'Draft' }])
  })

  it('reads dropdown columns with their options (v1351)', () => {
    const cols = tableColumns({ dropdown_options: [
      { value: 'step', label: 'Load Step', type: 'select', options: ['Create / takeover', { value: 'x', label: 'Capture balances' }] },
      { value: 'empty', label: 'No list', type: 'select', options: [] },
    ] })
    expect(cols[0]).toEqual({ key: 'step', label: 'Load Step', type: 'select', options: ['Create / takeover', 'Capture balances'] })
    expect(cols[1]).toEqual({ key: 'empty', label: 'No list', type: 'text' })
  })
})

