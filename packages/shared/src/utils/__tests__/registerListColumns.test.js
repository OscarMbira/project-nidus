import { describe, it, expect } from 'vitest'
import { resolveListColumns, formatListCell } from '../registerListColumns.js'

const register = {
  fields: [
    { field_key: 'step_type', field_label: 'Step Type', field_type: 'dropdown', dropdown_options: [{ value: 'load', label: 'Load' }] },
    { field_key: 'records_loaded', field_label: 'Records Loaded', field_type: 'number' },
    { field_key: 'success_percent', field_label: '% Success', field_type: 'number', calculation: { op: 'percent', decimals: 2, display: 'percent' } },
    { field_key: 'budget_minutes', field_label: 'Budget (minutes)', field_type: 'number' },
    { field_key: 'handoff_received', field_label: 'Hand-off File Received', field_type: 'boolean' },
    { field_key: 'start_at', field_label: 'Start', field_type: 'datetime' },
  ],
  behaviour: {
    list_columns: [
      { field: 'title', label: 'Step' },
      { field: 'step_type', label: 'Type' },
      { field: 'records_loaded' },
      { field: 'success_percent' },
      { field: 'budget_minutes', label: 'Budget', display: 'duration' },
      { field: 'handoff_received' },
      { field: 'start_at' },
      { field: 'no_such_field' },
    ],
  },
}

describe('resolveListColumns (v1381)', () => {
  it('takes columns, order and headings from the register, falling back to field labels', () => {
    const cols = resolveListColumns(register)
    expect(cols.map((c) => [c.key, c.label])).toEqual([
      ['title', 'Step'], ['step_type', 'Type'], ['records_loaded', 'Records Loaded'], ['success_percent', '% Success'],
      ['budget_minutes', 'Budget'], ['handoff_received', 'Hand-off File Received'], ['start_at', 'Start'],
    ])
  })

  it('returns no columns when the register has none configured', () => {
    expect(resolveListColumns({ fields: register.fields, behaviour: {} })).toEqual([])
  })
})

describe('formatListCell (v1381)', () => {
  const cols = Object.fromEntries(resolveListColumns(register).map((c) => [c.key, c]))
  const fmt = { formatNumber: (n) => Number(n).toLocaleString('en-GB'), formatDateTime: (v) => `DT(${v})` }

  it('formats by field type and display', () => {
    expect(formatListCell(cols.step_type, 'load', fmt)).toBe('Load')
    expect(formatListCell(cols.records_loaded, 805319, fmt)).toBe('805,319')
    expect(formatListCell(cols.success_percent, 94.1, fmt)).toBe('94.10%')
    expect(formatListCell(cols.budget_minutes, 80, fmt)).toBe('1h 20m')
    expect(formatListCell(cols.handoff_received, true, fmt)).toBe('Yes')
    expect(formatListCell(cols.start_at, '2026-09-12T03:02:00Z', fmt)).toBe('DT(2026-09-12T03:02:00Z)')
  })

  it('shows the sign on both sides when the column is signed', () => {
    const col = { field: { field_type: 'number' }, display: 'duration', config: { signed: true } }
    expect(formatListCell(col, 15, fmt)).toBe('+15m')
    expect(formatListCell(col, -5, fmt)).toBe('-5m')
    expect(formatListCell(col, 0, fmt)).toBe('0m')
  })

  it('returns empty text for empty values', () => {
    expect(formatListCell(cols.records_loaded, '', fmt)).toBe('')
    expect(formatListCell(cols.records_loaded, null, fmt)).toBe('')
  })
})
