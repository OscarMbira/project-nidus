import { describe, it, expect } from 'vitest'
import {
  analyzeFormExcelMatrix,
  mergeExcelColumnsIntoSections,
  buildInstanceValuesFromExcelRow,
  suggestExcelToFieldMapping,
  slugifyFieldKey,
  inferFieldType,
  normalizeFormExcelDateValue,
  FORM_EXCEL_MAX_DATA_ROWS,
  CATEGORY_FIELD_KEY,
} from '../formExcelImportUtils.js'

/** Environment Resources–style fixture (headers + two banners + data). */
function environmentResourcesMatrix() {
  return [
    ['Physical Location', 'Environment', 'APP Server Name', 'App IP Address', 'CPU Cores', 'Memory', 'Usage'],
    ['APPLICATION SERVERS', '', '', '', '', '', ''],
    ['Azikiwe', 'P9', 'CRDB-TZ-PRD-DATAMG1', '172.18.174.11', '20', '256', 'Migration App'],
    ['Azikiwe', 'P9', 'CRDB-TZ-PRD-T24APP1', '172.18.174.15', '9', '128', 'T24 UAT app'],
    ['', '', '', '', '', '', ''],
    ['DATABASE SERVERS', '', '', '', '', '', ''],
    ['Azikiwe', 'Exadata', 'CRDB-TZ-PRD-DB1', '172.18.174.20', '32', '512', 'Primary DB'],
  ]
}

describe('formExcelImportUtils', () => {
  it('slugifyFieldKey makes unique keys', () => {
    const used = new Set()
    expect(slugifyFieldKey('App IP Address', used)).toBe('App_IP_Address')
    expect(slugifyFieldKey('App IP Address', used)).toBe('App_IP_Address_2')
  })

  it('inferFieldType prefers number for numeric samples', () => {
    expect(inferFieldType(['20', '9', '0.9', '1'])).toBe('number')
    expect(inferFieldType(['hello', 'world'])).toBe('text')
  })

  it('analyzes Environment Resources sheet: columns, banners, Category options', () => {
    const result = analyzeFormExcelMatrix(environmentResourcesMatrix())
    expect(result.error).toBeNull()
    expect(result.headerRowIndex).toBe(0)
    expect(result.columns.map((c) => c.label)).toEqual([
      'Physical Location',
      'Environment',
      'APP Server Name',
      'App IP Address',
      'CPU Cores',
      'Memory',
      'Usage',
    ])
    const cpu = result.columns.find((c) => c.label === 'CPU Cores')
    const mem = result.columns.find((c) => c.label === 'Memory')
    expect(cpu.type).toBe('number')
    expect(mem.type).toBe('number')
    expect(result.categoryOptions).toEqual(['APPLICATION SERVERS', 'DATABASE SERVERS'])
    expect(result.totalDataRows).toBe(3)
    expect(result.dataRows[0].category).toBe('APPLICATION SERVERS')
    expect(result.dataRows[2].category).toBe('DATABASE SERVERS')
  })

  it('enforces soft cap of 500 data rows', () => {
    const header = ['A', 'B']
    const matrix = [header]
    for (let i = 0; i < FORM_EXCEL_MAX_DATA_ROWS + 10; i += 1) {
      matrix.push([`r${i}`, 'x'])
    }
    const result = analyzeFormExcelMatrix(matrix)
    expect(result.truncated).toBe(true)
    expect(result.totalDataRows).toBe(FORM_EXCEL_MAX_DATA_ROWS + 10)
    expect(result.dataRows).toHaveLength(FORM_EXCEL_MAX_DATA_ROWS)
  })

  it('mergeExcelColumnsIntoSections merges without deleting existing fields', () => {
    const existing = [
      {
        key: 'section_1',
        title: 'Section 1',
        fields: [
          { key: 'Physical_Location', label: 'Physical Location', type: 'text', options: [] },
          { key: 'Environment', label: 'Environment', type: 'text', options: [] },
        ],
      },
    ]
    const { columns, categoryOptions } = analyzeFormExcelMatrix(environmentResourcesMatrix())
    const { sections, added, matched, skipped } = mergeExcelColumnsIntoSections(
      existing,
      columns,
      categoryOptions,
    )
    expect(skipped).toBe(0)
    expect(matched).toBeGreaterThanOrEqual(2) // Physical Location + Environment (+ Category if matched)
    expect(added).toBeGreaterThanOrEqual(1)
    const keys = sections[0].fields.map((f) => f.key)
    expect(keys).toContain(CATEGORY_FIELD_KEY)
    expect(keys).toContain('Physical_Location')
    expect(keys).toContain('APP_Server_Name')
    expect(sections[0].fields.find((f) => f.key === CATEGORY_FIELD_KEY).type).toBe('select')
    expect(sections[0].fields.find((f) => f.key === CATEGORY_FIELD_KEY).options).toEqual([
      'APPLICATION SERVERS',
      'DATABASE SERVERS',
    ])
  })

  it('buildInstanceValuesFromExcelRow includes Category and mapped columns', () => {
    const analyzed = analyzeFormExcelMatrix(environmentResourcesMatrix())
    const values = buildInstanceValuesFromExcelRow(analyzed.dataRows[0], analyzed.columns)
    expect(values[CATEGORY_FIELD_KEY]).toBe('APPLICATION SERVERS')
    expect(values.Physical_Location).toBe('Azikiwe')
    expect(values.CPU_Cores).toBe('20')
  })

  it('normalizeFormExcelDateValue converts US short dates and Excel serials to yyyy-MM-dd', () => {
    expect(normalizeFormExcelDateValue('2/27/25')).toBe('2025-02-27')
    expect(normalizeFormExcelDateValue('1/21/25')).toBe('2025-01-21')
    expect(normalizeFormExcelDateValue('2025-02-04')).toBe('2025-02-04')
    expect(normalizeFormExcelDateValue(new Date(Date.UTC(2025, 1, 19)))).toBe('2025-02-19')
  })

  it('buildInstanceValuesFromExcelRow normalises date fields', () => {
    const values = buildInstanceValuesFromExcelRow(
      { category: null, valuesByCol: { 0: '2/27/25', 1: 'IDD Signoff' } },
      [
        { colIndex: 0, key: 'Start_Date', skip: false },
        { colIndex: 1, key: 'Task_Description', skip: false },
      ],
      [
        { key: 'Start_Date', type: 'date' },
        { key: 'Task_Description', type: 'text' },
      ],
    )
    expect(values.Start_Date).toBe('2025-02-27')
    expect(values.Task_Description).toBe('IDD Signoff')
  })

  it('suggestExcelToFieldMapping matches by label', () => {
    const analyzed = analyzeFormExcelMatrix(environmentResourcesMatrix())
    const mapping = suggestExcelToFieldMapping(analyzed.columns, [
      { key: 'loc', label: 'Physical Location' },
      { key: 'env', label: 'Environment' },
    ])
    expect(mapping[0]).toBe('loc')
    expect(mapping[1]).toBe('env')
  })
})
