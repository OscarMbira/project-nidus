import { describe, it, expect } from 'vitest'
import {
  getDisplayRowNumber,
  withDisplayRowNumbers,
  withExportRowNumbers,
  ROW_NUMBER_COLUMN,
} from '../tableRowNumberUtils'

describe('getDisplayRowNumber', () => {
  it('returns index + 1 without pagination', () => {
    expect(getDisplayRowNumber(0)).toBe(1)
    expect(getDisplayRowNumber(2)).toBe(3)
  })

  it('uses global sequence with pagination', () => {
    expect(getDisplayRowNumber(0, { page: 2, pageSize: 25 })).toBe(26)
    expect(getDisplayRowNumber(4, { page: 3, pageSize: 10 })).toBe(25)
  })

  it('handles invalid index safely', () => {
    expect(getDisplayRowNumber(-1)).toBe(1)
    expect(getDisplayRowNumber(NaN)).toBe(1)
  })
})

describe('withDisplayRowNumbers', () => {
  it('maps rows with display numbers', () => {
    const result = withDisplayRowNumbers([{ id: 'a' }, { id: 'b' }])
    expect(result).toEqual([
      { row: { id: 'a' }, displayNumber: 1 },
      { row: { id: 'b' }, displayNumber: 2 },
    ])
  })

  it('returns empty array for non-array input', () => {
    expect(withDisplayRowNumbers(null)).toEqual([])
  })
})

describe('withExportRowNumbers', () => {
  const columns = [{ key: 'name', label: 'Name' }]
  const rows = [{ name: 'A' }, { name: 'B' }]

  it('prepends # column and row values', () => {
    const { columns: cols, rows: out } = withExportRowNumbers(columns, rows)
    expect(cols[0]).toEqual(ROW_NUMBER_COLUMN)
    expect(out[0]._rowNumber).toBe(1)
    expect(out[1]._rowNumber).toBe(2)
  })

  it('skips when includeRowNumbers is false', () => {
    const { columns: cols, rows: out } = withExportRowNumbers(columns, rows, {
      includeRowNumbers: false,
    })
    expect(cols).toEqual(columns)
    expect(out).toEqual(rows)
  })

  it('does not duplicate when # column exists', () => {
    const colsWithNum = [ROW_NUMBER_COLUMN, ...columns]
    const { columns: cols } = withExportRowNumbers(colsWithNum, rows)
    expect(cols).toEqual(colsWithNum)
  })
})
