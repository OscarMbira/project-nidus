import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sanitizeExportText } from '../issueExport.js'

const writeFile = vi.fn()
const bookAppendSheet = vi.fn()
const bookNew = vi.fn(() => ({ SheetNames: [], Sheets: {} }))
const aoaToSheet = vi.fn((aoa) => {
  const ws = { '!ref': 'A1' }
  aoa.forEach((row, r) => {
    row.forEach((val, c) => {
      const col = String.fromCharCode(65 + c)
      ws[`${col}${r + 1}`] = typeof val === 'number' ? { t: 'n', v: val } : { t: 's', v: String(val ?? '') }
    })
  })
  return ws
})

vi.mock('xlsx-js-style', () => ({
  utils: {
    book_new: (...args) => bookNew(...args),
    book_append_sheet: (...args) => bookAppendSheet(...args),
    aoa_to_sheet: (...args) => aoaToSheet(...args),
    encode_cell: ({ r, c }) => `${String.fromCharCode(65 + c)}${r + 1}`,
    encode_range: ({ s, e }) => `A${s.r + 1}:${String.fromCharCode(65 + e.c)}${e.r + 1}`,
  },
  writeFile: (...args) => writeFile(...args),
}))

describe('sanitizeExportText', () => {
  it('replaces Unicode and mojibake dashes/quotes with plain ASCII', () => {
    expect(sanitizeExportText('Issue 5 \u2013 Cedar')).toBe('Issue 5 - Cedar')
    expect(sanitizeExportText('Issue 5 \u2014 Cedar')).toBe('Issue 5 - Cedar')
    // UTF-8 en-dash (E2 80 93) misread as Windows-1252 → â € “
    expect(sanitizeExportText('Issue 5 \u00E2\u20AC\u201C Cedar')).toBe('Issue 5 - Cedar')
    expect(sanitizeExportText('it\u2019s fine')).toBe("it's fine")
    expect(sanitizeExportText('\u201Chello\u201D')).toBe('"hello"')
  })
})

describe('exportToExcel issue register pivot summaries', () => {
  beforeEach(() => {
    writeFile.mockClear()
    bookAppendSheet.mockClear()
    bookNew.mockClear()
    aoaToSheet.mockClear()
  })

  it('writes a Summary sheet and filtered sheets linked from counts', async () => {
    const { exportToExcel } = await import('../issueExport.js')
    const issues = [
      { issue_identifier: 'ISS-1', issue_type: 'bug', priority: 'medium', status: 'new', issue_title: 'A', date_raised: '2026-07-29' },
      { issue_identifier: 'ISS-2', issue_type: 'bug', priority: 'high', status: 'in_progress', issue_title: 'B', date_raised: '2026-07-29' },
      { issue_identifier: 'ISS-3', issue_type: 'request_for_change', priority: 'medium', status: 'new', issue_title: 'C', date_raised: '2026-07-29' },
    ]

    exportToExcel(issues, 'test_issues.xlsx')

    expect(bookNew).toHaveBeenCalled()
    const sheetNames = bookAppendSheet.mock.calls.map((c) => c[2])
    expect(sheetNames[0]).toBe('Summary')
    expect(sheetNames).toContain('All Issues')
    expect(sheetNames.some((n) => String(n).startsWith('T-'))).toBe(true)
    expect(sheetNames.some((n) => String(n).startsWith('P-'))).toBe(true)
    expect(sheetNames.some((n) => String(n).startsWith('S-'))).toBe(true)
    expect(writeFile).toHaveBeenCalledWith(expect.anything(), 'test_issues.xlsx')

    const summaryWs = bookAppendSheet.mock.calls[0][1]
    // Total "All Types" count cell should be a hyperlink
    expect(summaryWs.B6?.l?.Target).toMatch(/All Issues/)
    expect(summaryWs.B6?.v).toBe(3)
  })
})
