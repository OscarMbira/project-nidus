import { describe, it, expect, vi, beforeEach } from 'vitest'
import { upsertFieldValue, fetchBatchExportForEntities } from './customFieldValuesApi'

vi.mock('./customFieldsApi', () => ({
  appendAudit: vi.fn(() => Promise.resolve()),
}))

describe('fetchBatchExportForEntities', () => {
  it('returns empty columns when accountId is missing', async () => {
    const db = {}
    const r = await fetchBatchExportForEntities(db, {
      accountId: null,
      entityType: 'issue',
      entityIds: ['e1'],
      screenCode: 'issue_detail',
    })
    expect(r.columns).toEqual([])
    expect(r.matrix).toEqual({})
  })
})

describe('upsertFieldValue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('upserts and returns success when Supabase succeeds', async () => {
    const single = vi.fn(() =>
      Promise.resolve({
        data: { id: 'val-1', field_definition_id: 'f1', entity_type: 'project', entity_id: 'e1' },
        error: null,
      })
    )
    const select = vi.fn(() => ({ single }))
    const upsert = vi.fn(() => ({ select }))
    const from = vi.fn(() => ({ upsert }))
    const platformDb = { from }

    const res = await upsertFieldValue(
      platformDb,
      {
        account_id: 'a1',
        project_id: 'p1',
        entity_type: 'project',
        entity_id: 'e1',
        field_definition_id: 'f1',
        value_text: 'hello',
      },
      'user-1'
    )

    expect(res.success).toBe(true)
    expect(res.data?.id).toBe('val-1')
    expect(upsert).toHaveBeenCalled()
  })
})
