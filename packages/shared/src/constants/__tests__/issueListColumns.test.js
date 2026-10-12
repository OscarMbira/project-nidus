import { describe, it, expect } from 'vitest'
import { ISSUE_LIST_COLUMNS, ISSUE_EXPORT_COLUMNS, mapIssueForListExport } from '../issueListColumns'

describe('issueListColumns (v869)', () => {
  it('exposes the locked Register list field set', () => {
    expect(ISSUE_LIST_COLUMNS.map((c) => c.key)).toEqual([
      'issue_title',
      'issue_type',
      'priority',
      'status',
      'assigned',
      'aging',
      'due_date',
      'created_at',
      'updated_at',
      'updated_by',
    ])
  })

  it('keeps export columns identical to the list set', () => {
    expect(ISSUE_EXPORT_COLUMNS).toEqual(ISSUE_LIST_COLUMNS)
  })

  it('maps assigned, aging, and updated_by for export rows', () => {
    const row = mapIssueForListExport(
      {
        issue_title: 'Test',
        assigned_to: { full_name: 'Ada Lovelace', email: 'ada@example.com' },
        updated_by_user: { full_name: 'Grace Hopper' },
      },
      () => '3d'
    )
    expect(row.assigned).toBe('Ada Lovelace')
    expect(row.aging).toBe('3d')
    expect(row.updated_by).toBe('Grace Hopper')
  })
})
