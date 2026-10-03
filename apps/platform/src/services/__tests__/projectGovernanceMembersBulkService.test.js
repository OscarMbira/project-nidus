import { describe, it, expect } from 'vitest'
import {
  normalizeAppointedDate,
  splitMultiValue,
  normalizeGovernanceMemberImportRows,
  validateGovernanceMemberImportRows,
  extractJsonMemberRows,
} from '../projectGovernanceMembersBulkService'

describe('projectGovernanceMembersBulkService', () => {
  it('splits multi-value cells', () => {
    expect(splitMultiValue('a@x.com; b@y.com')).toEqual(['a@x.com', 'b@y.com'])
    expect(splitMultiValue('a\nb')).toEqual(['a', 'b'])
  })

  it('normalizes appointed dates', () => {
    expect(normalizeAppointedDate('2026-03-01')).toBe('2026-03-01')
    expect(normalizeAppointedDate('')).toBe('')
  })

  it('maps role alias and chair flag', () => {
    const rows = normalizeGovernanceMemberImportRows([
      {
        name: 'Pat',
        role: 'Sponsor',
        email: 'pat@example.com',
        is_chair: 'yes',
      },
    ])
    expect(rows[0].member_name).toBe('Pat')
    expect(rows[0].role_title).toBe('Sponsor')
    expect(rows[0].is_chair).toBe(true)
    expect(rows[0].emails).toEqual(['pat@example.com'])
  })

  it('skips rows without name or with bad email', () => {
    const normalized = normalizeGovernanceMemberImportRows([
      { member_name: '', email: 'x@y.com' },
      { member_name: 'Ok', email: 'not-an-email' },
      { member_name: 'Good', email: 'good@example.com' },
    ])
    const { ready, skipped } = validateGovernanceMemberImportRows(normalized, [])
    expect(skipped.length).toBe(2)
    expect(ready).toHaveLength(1)
    expect(ready[0].member_name).toBe('Good')
  })

  it('rejects end_date before appointed_date', () => {
    const normalized = normalizeGovernanceMemberImportRows([
      {
        member_name: 'Pat',
        appointed_date: '2026-06-01',
        end_date: '2026-01-01',
      },
    ])
    const { ready, skipped } = validateGovernanceMemberImportRows(normalized, [])
    expect(ready).toHaveLength(0)
    expect(skipped[0].reasons.some((r) => /end_date/i.test(r))).toBe(true)
  })

  it('extracts JSON members array', () => {
    expect(extractJsonMemberRows({ MEMBERS: [{ member_name: 'A' }] })).toHaveLength(1)
    expect(extractJsonMemberRows([{ member_name: 'A' }])).toHaveLength(1)
    expect(extractJsonMemberRows({})).toBeNull()
  })
})
