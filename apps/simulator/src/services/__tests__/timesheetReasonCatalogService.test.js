import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFrom = vi.fn()
const mockGetUser = vi.fn()

vi.mock('../supabase/supabaseClient', () => ({
  platformDb: {
    from: (...args) => mockFrom(...args),
    auth: { getUser: (...args) => mockGetUser(...args) },
  },
}))

import {
  getReviewReasons,
  getReviewReasonsByIds,
  createReviewReason,
  updateReviewReason,
  deleteReviewReason,
} from '../timesheetReasonCatalogService'

describe('timesheetReasonCatalogService', () => {
  beforeEach(() => {
    mockFrom.mockReset()
    mockGetUser.mockReset()
  })

  it('getReviewReasons queries timesheet_entry_approve_reasons for the approved decision', async () => {
    const rows = [{ id: '1', code: 'accurate_complete', name: 'Accurate and complete' }]
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            order: () => ({
              order: () => Promise.resolve({ data: rows, error: null }),
            }),
          }),
        }),
      }),
    })
    const r = await getReviewReasons('approved')
    expect(mockFrom).toHaveBeenCalledWith('timesheet_entry_approve_reasons')
    expect(r).toEqual({ success: true, data: rows })
  })

  it('getReviewReasons queries timesheet_entry_reject_reasons for the rejected decision', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            order: () => ({
              order: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
        }),
      }),
    })
    await getReviewReasons('rejected')
    expect(mockFrom).toHaveBeenCalledWith('timesheet_entry_reject_reasons')
  })

  it('getReviewReasons rejects an unknown decision', async () => {
    const r = await getReviewReasons('withdrawn')
    expect(r.success).toBe(false)
  })

  it('getReviewReasonsByIds short-circuits on an empty id list without querying', async () => {
    const r = await getReviewReasonsByIds('approved', [])
    expect(r).toEqual({ success: true, data: [] })
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('getReviewReasonsByIds resolves ids from the matching table', async () => {
    const rows = [{ id: 'r1', name: 'Missing details' }]
    mockFrom.mockReturnValue({
      select: () => ({
        in: () => Promise.resolve({ data: rows, error: null }),
      }),
    })
    const r = await getReviewReasonsByIds('rejected', ['r1'])
    expect(mockFrom).toHaveBeenCalledWith('timesheet_entry_reject_reasons')
    expect(r).toEqual({ success: true, data: rows })
  })

  it('createReviewReason inserts into the decision-specific table', async () => {
    const created = { id: 'new', code: 'duplicate_entry', name: 'Duplicate entry' }
    mockFrom.mockReturnValue({
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: created, error: null }),
        }),
      }),
    })
    const r = await createReviewReason('rejected', { code: 'duplicate_entry', name: 'Duplicate entry' })
    expect(mockFrom).toHaveBeenCalledWith('timesheet_entry_reject_reasons')
    expect(r).toEqual({ success: true, data: created })
  })

  it('updateReviewReason updates the decision-specific table', async () => {
    const updated = { id: 'r1', name: 'Accurate and complete (v2)' }
    mockFrom.mockReturnValue({
      update: () => ({
        eq: () => ({
          eq: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: updated, error: null }),
            }),
          }),
        }),
      }),
    })
    const r = await updateReviewReason('approved', 'r1', { name: 'Accurate and complete (v2)' })
    expect(mockFrom).toHaveBeenCalledWith('timesheet_entry_approve_reasons')
    expect(r).toEqual({ success: true, data: updated })
  })

  it('deleteReviewReason soft-deletes via the decision-specific table', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'auth-1' } } })
    const deleted = { id: 'r1', is_deleted: true }
    mockFrom.mockImplementation((table) => {
      if (table === 'users') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: { id: 'internal-1' }, error: null }),
            }),
          }),
        }
      }
      return {
        update: () => ({
          eq: () => ({
            eq: () => ({
              select: () => ({
                single: () => Promise.resolve({ data: deleted, error: null }),
              }),
            }),
          }),
        }),
      }
    })
    const r = await deleteReviewReason('approved', 'r1')
    expect(mockFrom).toHaveBeenCalledWith('timesheet_entry_approve_reasons')
    expect(r).toEqual({ success: true, data: deleted })
  })
})
